// Production secrets stay in Vercel. No credential export is needed.
if(process.env.VERCEL_ENV==='production'){
 await import('./upgrade-handoff.mjs');
 const {neon}=await import('@neondatabase/serverless');
 const {default:Stripe}=await import('stripe');
 const {randomUUID}=await import('node:crypto');
 const {pickupDate,FIRST_PICKUP_DATE}=await import('../lib/fulfilment.ts');
 const {launchFlavors}=await import('../lib/products.ts');
 const sql=neon(process.env.DATABASE_URL);
 if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)throw new Error('Payment configuration is missing.');
 const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
 await sql`insert into settings(key,value) values('bakeCapacityReady','false'::jsonb) on conflict(key) do update set value='false'::jsonb`;
 let imported=0,expired=0;
 for await(const session of stripe.checkout.sessions.list({created:{gte:Math.floor(Date.parse('2026-10-01T00:00:00Z')/1000)},limit:100})){
  if(!session.metadata?.items||!session.metadata?.customer_name)continue;
  if(session.metadata.order_id)continue;
  const rawDate=session.metadata.bake_id||session.metadata.run_date;
  const bake=/^\d{4}-\d{2}-\d{2}$/.test(rawDate??'')?rawDate:pickupDate(session.created*1000);
  if(bake<FIRST_PICKUP_DATE)continue;
  if(session.status==='open'){await stripe.checkout.sessions.expire(session.id);expired++;continue;}
  if(session.payment_status!=='paid')continue;
  const lines=[];
  for await(const item of stripe.checkout.sessions.listLineItems(session.id,{limit:100})){
   if(/gift jar|delivery|tax|credit/i.test(item.description)&&!/granola|almond/i.test(item.description))continue;
   if(/blessing bag/i.test(item.description))throw new Error('A legacy blessing order needs review before capacity can be enabled.');
   const name=item.description.replace(/\s*[·-]?\s*(?:1\s*lb|16\s*oz|8\s*oz|3\s*oz|sampler|bag|jar).*$/i,'').trim();
   const flavor=launchFlavors.find(f=>f.name.toLowerCase()===name.toLowerCase()||f.name.toLowerCase().includes(name.toLowerCase()));
   if(!flavor)throw new Error('An existing paid product cannot be matched safely. Capacity remains paused.');
   const sizeOz=/3\s*oz|sampler/i.test(item.description)?3:/8\s*oz/i.test(item.description)?8:16;
   const line={slug:flavor.slug,format:'bag',sizeOz,qty:item.quantity};
   lines.push({line,flavor,unitCents:Math.round(item.amount_subtotal/item.quantity),totalCents:item.amount_subtotal});
  }
  const ounces=lines.reduce((n,p)=>n+p.line.sizeOz*p.line.qty,0);
  if(!ounces)throw new Error('A paid order has no countable contents.');
  const id=randomUUID();
  const details={bakeId:bake,runDate:bake,pickupPeriod:'morning',requiresCooling:lines.some(p=>p.flavor.requiresCooling),method:'dropoff',runIndex:0,runArea:'Porch pickup',name:session.metadata.customer_name,phone:session.metadata.phone||'',address:'Vistancia',note:session.metadata.porch_note||'',prayer:session.metadata.prayer_request||''};
  const totals={lines,subtotalCents:session.amount_subtotal,totalCents:session.amount_subtotal,itemCount:lines.reduce((n,p)=>n+p.line.qty,0),jarsReturned:0,blessingBags:0,blessingCents:0,blessingGiftJars:0,giftJarCents:0,jarCreditRequestedCents:0,jarCreditAppliedCents:0,points:0};
  const snapshot={order:{lines:lines.map(p=>p.line),jarsReturned:0,blessingBags:0,details},totals};
  // Session ID makes repeat builds safe, including a prior interrupted import.
  const already=await sql`select id from checkout_orders where stripe_session=${session.id}`;
  if(already.length){await stripe.checkout.sessions.update(session.id,{metadata:{order_id:already[0].id,bake_id:bake}});continue;}
  const reserved=await sql`select * from reserve_bake_order(${id}::uuid,${'legacy/'+session.id},${bake}::date,${ounces},${JSON.stringify(snapshot)}::jsonb)`;
  if(!reserved.length)throw new Error('Existing paid orders exceed the bake limit.');
  await sql`update checkout_orders set status='paid',stripe_session=${session.id},email=${session.customer_details?.email||''},amount_cents=${session.amount_total},email_status='pending' where id=${id}::uuid`;
  await stripe.checkout.sessions.update(session.id,{metadata:{order_id:id,bake_id:bake}});
  imported++;
 }
 const endpoints=await stripe.webhookEndpoints.list({limit:100});
 for(const endpoint of endpoints.data.filter(e=>e.url.endsWith('/api/stripe/webhook')&&e.status==='enabled'))if(!endpoint.enabled_events.includes('*')&&!endpoint.enabled_events.includes('checkout.session.expired'))await stripe.webhookEndpoints.update(endpoint.id,{enabled_events:[...endpoint.enabled_events,'checkout.session.expired']});
 await sql`insert into settings(key,value) values('bakeCapacityReady','true'::jsonb) on conflict(key) do update set value='true'::jsonb`;
 console.log(`Capacity reconciled: ${imported} paid orders imported; ${expired} old payment sessions expired.`);
 console.log(`Confirmation email configuration: ${process.env.RESEND_API_KEY&&process.env.MAIL_FROM?'present':'MISSING — checkout uses the on-screen receipt'}.`);
}
