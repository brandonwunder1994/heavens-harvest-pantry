import type Stripe from "stripe";
import { business, type Shop } from "@/lib/content";
import { GIFT_JAR_CENTS, blessingSurchargeCents, type Totals } from "@/lib/cart";
import { orderMetadata, type OrderRequest } from "@/lib/order";
import { pickupDateLabel, storageMessage } from "@/lib/fulfilment";
import { sizeLabel, omissionLabel } from "@/lib/products";
import type { CheckoutTax } from "@/lib/checkout-tax";

export function checkoutSessionParams(shop: Shop, order: OrderRequest, totals: Totals, origin: string, discounts?: Stripe.Checkout.SessionCreateParams.Discount[], tax: CheckoutTax = null): Stripe.Checkout.SessionCreateParams {
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = totals.lines.flatMap(p => {
    const gift = p.line.gift;
    const size = p.line.sizeOz ?? (p.line.format === "sampler" ? 3 : 16);
    const food: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: p.line.qty,
      ...(tax ? { tax_rates: [tax.foodRateId] } : {}),
      price_data: { currency: "usd", tax_behavior: "exclusive", unit_amount: p.unitCents - (gift ? blessingSurchargeCents(shop) : 0),
        product_data: { name: `${p.flavor.name} · ${sizeLabel(size)} ${gift ? "blessing jar" : "bag"}`, description: [p.flavor.blurb,...(p.line.omissions ?? []).map(o=>omissionLabel[o])].join(" ") } }
    };
    return gift ? [food, { quantity: p.line.qty, ...(tax ? { tax_rates: [tax.giftJarRateId] } : {}), price_data: { currency: "usd", unit_amount: blessingSurchargeCents(shop), product_data: { name: "Blessing gift jar and anonymous delivery", description: "Cute jar and Friday delivery in Vistancia are included." } } }] : [food];
  });
  // Read compatibility for historical callers; the public API requires structured gifts.
  if (order.blessingBags > 0) lineItems.push({quantity:order.blessingBags,...(tax?{tax_rates:[tax.foodRateId]}:{}),price_data:{currency:"usd",unit_amount:Math.round(shop.blessingBag.price*100),product_data:{name:"Blessing bag for a neighbor"}}});
  if (totals.blessingGiftJars > 0) lineItems.push({quantity:totals.blessingGiftJars,...(tax?{tax_rates:[tax.giftJarRateId]}:{}),price_data:{currency:"usd",unit_amount:GIFT_JAR_CENTS,product_data:{name:"Gift jar for a blessing bag"}}});
  const metadata=orderMetadata(shop,order,totals);
  const hasPickup=totals.lines.some(p=>!p.line.gift);
  const pickup=hasPickup ? `Porch pickup ${pickupDateLabel(order.details.runDate)}, ${order.details.pickupPeriod}${order.details.pickupPeriod==='afternoon'?' (from noon)':''}. ${storageMessage(!!order.details.requiresCooling)}` : "Anonymous blessing delivery in Vistancia on Friday.";
  return {mode:"payment",ui_mode:"embedded_page",payment_method_types:["card"],line_items:lineItems,discounts,submit_type:"pay",return_url:`${origin}/order/thank-you?session_id={CHECKOUT_SESSION_ID}`,expires_at:Math.floor(Date.now()/1000)+1860,
    branding_settings:{display_name:business.name,background_color:"#faf6ee",button_color:"#5b3d1e",border_style:"rectangular"},metadata,payment_intent_data:{description:`${business.name} · ${pickup}`,metadata},custom_text:{submit:{message:`${pickup} Pickup address is provided after payment.`}}};
}
