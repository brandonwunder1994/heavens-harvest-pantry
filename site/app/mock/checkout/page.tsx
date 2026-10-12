import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/owner-auth";
import { mockRun } from "@/lib/mock-auth";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getMockStripe, mockTaxConfiguration, mockPaymentsReady } from "@/lib/mock-stripe";
import { readCheckoutTaxDisplay } from "@/lib/checkout-tax-source";
import { mailReady } from "@/lib/mailer";
import { pickupDate } from "@/lib/fulfilment";
export default async function MockCheckout({searchParams}:{searchParams:Promise<{payment?:string}>}) {
  if (!(await isSignedIn())) redirect("/owner/login?next=/mockorder/checkout");
  if (!(await mockRun())) redirect("/api/mock/start");
  const simulate=(await searchParams).payment!=="stripe";
  const taxDisplay=simulate ? null : await readCheckoutTaxDisplay(mockTaxConfiguration(),getMockStripe(),false);
  return <div className="mx-auto w-full max-w-[640px] px-6 pb-16 sm:px-10"><h1 className="display text-center text-[40px]">Checkout</h1><p className="text-center text-[17px] italic text-sage">Practice the full customer checkout.</p><CheckoutForm paymentsLive={simulate||(mockPaymentsReady() && mailReady)} taxDisplay={taxDisplay} simulate={simulate} testMode pickupDate={pickupDate()} publishableKey={process.env.STRIPE_MOCK_PUBLISHABLE_KEY ?? ""}/></div>;
}
