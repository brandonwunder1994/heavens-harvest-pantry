// Runs locally with the existing DATABASE_URL, or in Vercel's protected build
// environment. It never prints credentials or customer records.
import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { launchFlavors } from '../lib/products.ts';
const url=process.env.VERCEL_ENV==='preview'?process.env.REVIEW_DATABASE_URL:process.env.DATABASE_URL;
if(!url)throw new Error('A database must be configured before this upgrade.');
const sql=neon(url);
const schema=readFileSync(new URL('./order-schema.sql',import.meta.url),'utf8');
// A dollar-quoted function body is one statement, even when it has semicolons.
const statements=schema.match(/(?:[^;$]|\$(?!\$)|\$\$[\s\S]*?\$\$)+;/g)??[];
for(const statement of statements)await sql.query(statement);
await sql`create table if not exists handoff_settings_backup (version text not null, key text not null, value jsonb not null, saved_at timestamptz not null default now(),primary key(version,key))`;
const version='sizes-pickup-capacity-v1';
const done=await sql`select 1 from settings where key=${version}`;
if(!done.length){
 const rows=await sql`select key,value from settings where key in ('flavors','labelTemplates','delivery','blessingBag')`;
 const saved=new Map(rows.map(r=>[r.key,r.value]));
 for(const row of rows)await sql`insert into handoff_settings_backup(version,key,value) values(${version},${row.key},${JSON.stringify(row.value)}::jsonb) on conflict do nothing`;
 const existing=Array.isArray(saved.get('flavors'))?saved.get('flavors'):[];
 const flavors=launchFlavors.map(f=>{const old=existing.find(o=>o.slug===f.slug);return {...old,...f,soldOut:old?.soldOut??false,icons:old?.icons};});
 // Preserve any extra owner-created flavors, but supply all required size prices.
 for(const f of existing.filter(o=>!flavors.some(n=>n.slug===o.slug)))flavors.push({...f,name:f.name.replace(/\s*[·-]?\s*(?:1\s*lb|16\s*oz).*$/i,''),ingredients:f.ingredients.replace(/pink himalayan sea salt/ig,'Himalayan pink salt'),sizePrices:{3:5,8:10,16:16},allowedOmissions:f.allowedOmissions??[],requiresCooling:f.requiresCooling??/chocolate/i.test(f.name)});
 const labels=saved.get('labelTemplates');
 if(labels?.templates)labels.templates=labels.templates.map(t=>{const f=flavors.find(v=>v.slug===t.flavorSlug);return {...t,...(f?{title:f.name,ingredients:f.ingredients,allergens:f.allergens}:{}),netWeight:'Net Wt 16 oz (454 g)'};});
 const delivery={...(saved.get('delivery')??{}),dropOff:'Vistancia',cutoff:'Tuesday at 9 p.m. · Phoenix time',bakeDay:'Made fresh for Friday and Saturday pickup'};
 for(const [key,value] of [['flavors',flavors],['delivery',delivery],...(labels?[['labelTemplates',labels]]:[]),[version,{done:true}]])await sql`insert into settings(key,value) values(${key},${JSON.stringify(value)}::jsonb) on conflict(key) do update set value=excluded.value,updated_at=now()`;
 console.log('Menu, prices, labels and pickup settings upgraded; previous values saved in the database.');
}else console.log('Handoff schema and settings already up to date.');
