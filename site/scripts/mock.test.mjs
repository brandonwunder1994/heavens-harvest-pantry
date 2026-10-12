import { test } from "node:test";
import assert from "node:assert/strict";
import { mockKeysValid,isMockSession,mockBasketKey,practiceHref } from "../lib/mock-policy.ts";
import { validateOrder } from "../lib/order.ts";
import { defaultShop } from "../lib/content.ts";
import { pickupDate,saturdayDate } from "../lib/fulfilment.ts";
import { confirmationCopy } from "../lib/order-confirmation.ts";
import { simulatedTax,simulatedPaymentView,isSimulatedSnapshot,simulatedReceiptUrl } from "../lib/mock-simulation.ts";
const base={details:{method:"dropoff",name:"Practice Neighbor",phone:"6235550100",runDate:pickupDate(),pickupPeriod:"morning"},blessingBags:0,jarsReturned:0};
function order(lines,details={}) {
  const result=validateOrder(defaultShop,{...base,details:{...base.details,...details},lines});
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  return {order:result.order,totals:result.totals};
}
const line=(slug,sizeOz=3)=>({slug,format:"bag",qty:1,sizeOz});
test("practice rejects missing, live and mixed Stripe credentials",()=>{
  assert.equal(mockKeysValid({}),false);
  assert.equal(mockKeysValid({STRIPE_MOCK_SECRET_KEY:"sk_live_fake",STRIPE_MOCK_PUBLISHABLE_KEY:"pk_test_fake"}),false);
  assert.equal(mockKeysValid({STRIPE_MOCK_SECRET_KEY:"sk_test_fake",STRIPE_MOCK_PUBLISHABLE_KEY:"pk_live_fake"}),false);
  assert.equal(mockKeysValid({STRIPE_MOCK_SECRET_KEY:"sk_test_fake",STRIPE_MOCK_PUBLISHABLE_KEY:"pk_test_fake"}),true);
});
test("only tagged test sessions can be recorded as mock orders",()=>{
  const metadata={practice:"true",mock_run_id:"practice-run"};
  assert.equal(isMockSession({livemode:true,metadata}),false);
  assert.equal(isMockSession({livemode:false,metadata:{}}),false);
  assert.equal(isMockSession({metadata}),false);
  assert.equal(isMockSession({livemode:false,metadata}),true);
});
test("practice navigation keeps query and hash, and explicit exits use plain links",()=>{
  for(const href of ["/menu","/checkout","/reviews#leave-one","/menu?again=test"])
    assert.equal(practiceHref(href,true),`/mockorder${href}`);
  assert.equal(practiceHref("/",true),"/mockorder");
  for(const href of ["/mock/menu","/mockorder/menu","/mockorder?view=shop","/mockorder#menu","/owner/mock","https://stripe.com","#ingredients","//example.com"])
    assert.equal(practiceHref(href,true),href);
  assert.equal(practiceHref("/checkout",false),"/checkout");
});
test("practice baskets are isolated from live and fresh runs",()=>{
  assert.notEqual(mockBasketKey("first"),"hhp-cart-v1");
  assert.notEqual(mockBasketKey("first"),mockBasketKey("second"));
});
test("ordinary Friday receipt includes porch table, exclusive tax and MOCK label",()=>{
  const snapshot=order([line("maple-pecan")]);
  const copy=confirmationCopy(snapshot,{address:"Private sample address",contact:"Sample contact"},508,8,true,"https://heavensharvestpantry.com/mock/order/thank-you?session_id=sample");
  assert.match(copy.subject,/MOCK/);assert.match(copy.text,/porch table/);assert.match(copy.text,/Tax: \$0.08/);
  assert.match(copy.text,/Friday/);assert.match(copy.text,/Private sample address/);assert.match(copy.text,/\/mock\/order\/thank-you/);
});
test("chocolate and mixed Saturday orders use fridge instructions",()=>{
  for(const lines of [[line("dark-chocolate-sea-salt")],[line("dark-chocolate-sea-salt"),line("maple-pecan")]]) {
    const snapshot=order(lines,{runDate:saturdayDate(pickupDate()),pickupPeriod:"afternoon"});
    const text=confirmationCopy(snapshot,{address:"Private sample address",contact:""},1000,16,true).text;
    assert.match(text,/porch fridge/);assert.match(text,/Saturday/);assert.match(text,/from noon/);
  }
});
test("gift-only mock receipt never schedules a real delivery or exposes pickup address",()=>{
  const snapshot=order([{...line("maple-pecan",8),gift:{id:"test-gift",recipientName:"Sample Recipient",address:"Sample Vistancia address",inVistancia:true}}]);
  const text=confirmationCopy(snapshot,null,1734,34,true).text;
  assert.match(text,/Sample Recipient/);assert.match(text,/nothing will be delivered/);assert.doesNotMatch(text,/Private sample address|porch pickup/i);
});
test("production uses the same receipt template without mock labels",()=>{
  const snapshot=order([line("maple-pecan")]);
  const live=confirmationCopy(snapshot,{address:"Private sample address",contact:""},508,8);
  assert.doesNotMatch(live.text,/MOCK —|practice order|test payment/i);assert.doesNotMatch(live.subject,/MOCK/);assert.match(live.text,/Tax: \$0.08/);
});
test("simulation reprices the mixed basket and labels its example tax",()=>{
 const snapshot={...order([line("maple-pecan",8),{...line("dark-chocolate-sea-salt",8),gift:{id:"gift",recipientName:"Sample Recipient",address:"Sample Vistancia address",inVistancia:true}}]),simulation:{version:1,taxCents:simulatedTax(2700),expiresAt:9999999999}};
 assert.equal(snapshot.totals.totalCents,2700);
 const view=simulatedPaymentView("sample",snapshot);
 assert.equal(view.totalCents,2754);assert.equal(view.taxCents,54);assert.equal(view.lines.length,2);
 const copy=confirmationCopy(snapshot,{address:"Sample private pickup",contact:""},view.totalCents,view.taxCents,true,"",true);
 assert.match(copy.text,/SIMULATED PAYMENT/);assert.match(copy.text,/No Stripe payment was created/);assert.match(copy.text,/2% tax is an example/);assert.match(copy.text,/porch table/);
});
test("simulation receipts stay inside the owner-only mock flow",()=>{
 const snapshot=order([line("maple-pecan")]);
 assert.equal(isSimulatedSnapshot(snapshot),false);
 assert.equal(isSimulatedSnapshot({...snapshot,simulation:{version:1,taxCents:10,expiresAt:1}}),true);
 assert.equal(isSimulatedSnapshot({...snapshot,simulation:{version:2}}),false);
 assert.equal(simulatedReceiptUrl("sample"),"/mockorder/order/thank-you?order_id=sample");
});
