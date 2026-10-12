import { REWARDS_ENABLED } from "@/lib/features";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SignInBox } from "@/components/rewards/SignInBox";
import { RewardsCard } from "@/components/rewards/RewardsCard";
import { signedInEmail } from "@/lib/rewards-auth";
import { mailReady } from "@/lib/mailer";
import { rewardOffer } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Pantry Rewards",
    description: `${rewardOffer.sentence} Every bag and sampler bag counts.`,
  };
}

const waysFor = () => [
  {
    title: "Every bag or sampler bag",
    body: "Ten punches, then one is free. Nothing to scan, nothing to remember. It starts on your first order.",
  },
  {
    title: "A head start",
    body: "Your first order starts the card, so you are already on your way rather than at nothing.",
  },
  {
    title: "Share with a neighbor",
    body: "Send a neighbor our way. When ordering reopens, referrals will be part of Pantry Rewards.",
  },
];

export const dynamic = "force-dynamic";

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  if (!REWARDS_ENABLED) redirect("/menu");
  // Somebody already signed in on this device goes straight to their points.
  if (await signedInEmail()) redirect("/rewards/me");
  const { link } = await searchParams;

  const ways = waysFor();

  return (
    <>
      <PageHeader
        eyebrow="Pantry Rewards"
        title={rewardOffer.sentence}
        standfirst="No app, no plastic card, nothing that quietly expires. The email your order goes to is your card, and bag and sampler orders count automatically."
      />

      <div className="mx-auto mt-10 flex w-full max-w-[1100px] justify-center px-6 sm:px-10">
        <RewardsCard punched={9} />
      </div>

      <section className="mx-auto mt-14 grid w-full max-w-[1100px] gap-5 px-6 sm:px-10 lg:grid-cols-3">
        {ways.map((way) => (
          <div key={way.title} className="dashed-frame flex flex-col gap-2 bg-paper px-6 py-6">
            <div className="display text-[28px]">{way.title}</div>
            <p className="text-[17px] leading-snug text-muted">{way.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-14 w-full max-w-[620px] px-6 pb-16 sm:px-10">
        {link === "spent" ? (
          <p role="alert" className="dashed-frame mb-5 bg-paper px-6 py-4 text-center text-[17px] leading-snug text-bark">
            That link had already been used. They work once and last an hour, which is what keeps
            somebody else out of your card. Ask for a fresh one below.
          </p>
        ) : null}
        {link === "trouble" ? (
          <p role="alert" className="dashed-frame mb-5 bg-paper px-6 py-4 text-center text-[17px] leading-snug text-bark">
            Something went wrong opening that link. Ask for a new one below.
          </p>
        ) : null}
        {/* The honest note comes first: nobody should type an email into a box
            and only then be told it cannot send. */}
        {!mailReady ? (
          <p className="dashed-frame mb-5 bg-paper px-6 py-4 text-center text-[17px] leading-snug text-bark">
            Your card is counting from your very first order. Looking it up needs her email account
            connected, which is one signup away.
          </p>
        ) : null}
        <SignInBox disabled={!mailReady} />
      </section>
    </>
  );
}
