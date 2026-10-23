import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultShop} from '../lib/content.ts';
import {priceOrder,orderWeight,sanitizeCart,lineKey} from '../lib/cart.ts';
import {validateOrder} from '../lib/order.ts';
import {checkoutSessionParams} from '../lib/checkout-session.ts';
import {pickupDate,saturdayDate,storageMessage} from '../lib/fulfilment.ts';
import {flavorSizes,ingredientsWithout,netWeight,OMISSIONS} from '../lib/products.ts';
const none={jarsReturned:0,blessingBags:0};
const line=(f,sizeOz,extra={})=>({slug:f.slug,format:'bag',qty:1,sizeOz,...extra});
const details={method:'dropoff',runDate:pickupDate(),pickupPeriod:'morning',name:'Sample Customer',phone:'6235550100'};
const gift=id=>({id,recipientName:'Sample Recipient',address:'123 Sample Lane, Vistancia',inVistancia:true});
for(const flavor of defaultShop.flavors)for(const size of flavorSizes(flavor))test(`${flavor.name}: ${size} oz price and weight`,()=>{
 const total=priceOrder(defaultShop,[line(flavor,size)],none);
 assert.equal(total.totalCents,flavor.sizePrices[size]*100);assert.equal(orderWeight(total.lines.map(p=>p.line)),size);
 const params=checkoutSessionParams(defaultShop,{lines:total.lines.map(p=>p.line),...none,details},total,'https://example.com');
 assert.equal(params.line_items[0].price_data.unit_amount,total.totalCents);
});
for(const size of [8,16])test(`anonymous ${size} oz gift includes exactly one $7 charge`,()=>{
 const total=priceOrder(defaultShop,[line(defaultShop.flavors[0],size,{gift:gift('gift-'+size)})],none);
 assert.equal(total.totalCents,({8:1700,16:2300})[size]);assert.equal(total.giftJarCents,0);assert.equal(orderWeight(total.lines.map(p=>p.line)),size);
 const params=checkoutSessionParams(defaultShop,{lines:total.lines.map(p=>p.line),...none,details},total,'https://example.com');
 assert.equal(params.line_items.reduce((n,i)=>n+i.quantity*i.price_data.unit_amount,0),total.totalCents);assert.equal(params.line_items[1].price_data.unit_amount,700);
});
test('all applicable omissions can be combined without changing price or weight',()=>{
 const f={...defaultShop.flavors[0],ingredients:'Oats, Apples, Blueberries (berries, sugar, oil), Shredded Coconut, Coconut Oil, Pecans',allowedOmissions:OMISSIONS};
 const shop={...defaultShop,flavors:[f]};
 for(let bits=0;bits<8;bits++){
  const omissions=OMISSIONS.filter((_,i)=>bits&(1<<i)),l=line(f,8,{omissions});const total=priceOrder(shop,[l],none);
  assert.equal(total.totalCents,1000);assert.equal(orderWeight(total.lines.map(p=>p.line)),8);
  const ingredients=ingredientsWithout(f.ingredients,omissions);assert.match(ingredients,/Coconut Oil/);assert.match(ingredients,/Pecans/);
  for(const option of omissions)assert.doesNotMatch(ingredients,option==='apples'?/\bApples\b/:option==='blueberries'?/\bBlueberries\b/:/Shredded Coconut/);
 }
});
test('different omissions, sizes and gift recipients stay separate',()=>{
 const f=defaultShop.flavors[0];const rows=[line(f,3),line(f,8),line(f,8,{omissions:['apples']}),line(f,8,{gift:gift('one')}),line(f,8,{gift:gift('two')})];
 assert.equal(sanitizeCart(defaultShop,rows).length,5);assert.equal(new Set(rows.map(lineKey)).size,5);
});
test('personal items and gifts share weight but only personal chocolate needs the pickup fridge',()=>{
 let rows=[line(defaultShop.flavors[0],8),line(defaultShop.flavors[1],8,{gift:gift('chocolate-gift')})];
 let result=validateOrder(defaultShop,{lines:rows,...none,details});assert.equal(result.ok,true);assert.equal(result.order.details.requiresCooling,false);assert.equal(orderWeight(result.order.lines),16);
 rows.push(line(defaultShop.flavors[2],16));result=validateOrder(defaultShop,{lines:rows,...none,details});assert.equal(result.order.details.requiresCooling,true);assert.match(storageMessage(true),/fridge/);assert.match(storageMessage(false),/table/);
});
test('Friday and Saturday choices use the same bake and require a period',()=>{
 for(const date of [pickupDate(),saturdayDate(pickupDate())])for(const period of ['morning','afternoon']){
  const result=validateOrder(defaultShop,{lines:[line(defaultShop.flavors[0],3)],...none,details:{...details,runDate:date,pickupPeriod:period}});
  assert.equal(result.ok,true);assert.equal(result.order.details.bakeId,pickupDate());assert.equal(result.order.details.pickupPeriod,period);
 }
 assert.equal(validateOrder(defaultShop,{lines:[line(defaultShop.flavors[0],3)],...none,details:{...details,pickupPeriod:undefined}}).ok,false);
});
test('gifts require a customer-chosen recipient in Vistancia',()=>{
 for(const bad of [{recipientName:''},{address:''},{inVistancia:false}])assert.equal(validateOrder(defaultShop,{lines:[line(defaultShop.flavors[0],8,{gift:{...gift('test'),...bad}})],...none,details}).ok,false);
 assert.equal(validateOrder(defaultShop,{lines:[line(defaultShop.flavors[4],8,{gift:gift('almonds')})],...none,details}).ok,true);
});
test('old regular and sampler carts still count as 16 oz and 3 oz',()=>{
 assert.equal(orderWeight([{slug:'maple-pecan',format:'bag',qty:2},{slug:'maple-pecan',format:'sampler',qty:2}]),38);
});
test('label weights are purchased food weights',()=>{
 assert.match(netWeight(3),/3 oz \(85 g\)/);assert.match(netWeight(8),/8 oz \(227 g\)/);assert.match(netWeight(16),/16 oz \(454 g\)/);
});
test('chocolate recipes retain cocoa powder and cashew disclosure',()=>{
 for(const f of defaultShop.flavors.filter(f=>f.requiresCooling)){assert.match(f.ingredients,/Cocoa Powder/i);assert.match(f.allergens,/cashew/i);}
 assert.match(defaultShop.flavors[2].ingredients,/organic cane sugar, organic cacao mass, cocoa liquor, and organic cocoa butter/);
});

test('candied nuts sold in 8 oz and 1 lb only: a 3 oz bag is dropped from the basket',()=>{
 const nut=defaultShop.flavors.find(f=>f.slug==='coconut-cashews');
 assert.deepEqual(flavorSizes(nut),[8,16]);
 for(const size of [8,16])assert.equal(priceOrder(defaultShop,[line(nut,size)],none).totalCents,({8:1200,16:2000})[size]*1);
 assert.equal(sanitizeCart(defaultShop,[line(nut,3)]).length,0);
});

test('a saved menu that files the new nuts as granola still gets 8 oz and 1 lb only, in the nuts lineup order',async()=>{
 const {menuFlavors}=await import('../lib/menu-groups.ts');
 const saved=['candied-pecans','candied-cashews','coconut-cashews'].map(slug=>({...defaultShop.flavors.find(f=>f.slug===slug),category:'granola',sizes:undefined}));
 for(const f of saved)assert.deepEqual(flavorSizes(f),[8,16]);
 const order=menuFlavors([...saved,...defaultShop.flavors.filter(f=>!saved.some(s=>s.slug===f.slug))]).map(f=>f.slug);
 assert.deepEqual(order.slice(-4),['c','coconut-cashews','candied-pecans','candied-cashews']);
});
