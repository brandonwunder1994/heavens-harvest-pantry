import { OvenTimer } from "@/components/craft/Paper";

/**
 * What shows while the payment is being read back from Stripe. It is a real
 * wait, so it gets a real answer: a kitchen timer winding down rather than a
 * spinner pretending to know how long is left.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col items-center gap-6 px-6 py-24 text-center sm:px-10">
      <OvenTimer said="Checking your order" />
    </div>
  );
}
