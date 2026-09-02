import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SignInBox } from "@/components/rewards/SignInBox";
import { signedInEmail } from "@/lib/rewards-auth";
import { mailReady } from "@/lib/mailer";
import { money, type Shop } from "@/lib/content";
import { getShop } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  // Read from her settings, so the search result cannot promise a free bag at a
  // number she has since changed.
  const { rewards } = await getShop();
  return {
    title: "Pantry Rewards",
    description: `A point for every dollar, a free bag at ${rewards.rewardAt}, and extra points for every mason jar you bring back.`,
  };
}

const waysFor = ({ jarRules, rewards }: Shop) => [
  {
    title: `${rewards.pointsPerDollar} point${rewards.pointsPerDollar === 1 ? "" : "s"} per dollar`,
    body: "Every order earns automatically. Nothing to scan, nothing to remember.",
  },
  {
    title: `${jarRules.bonusPoints} points a jar`,
    body: `Returned jars earn points on top of the ${money(jarRules.creditDollars)} they take off the order.`,
  },
  {
    title: `${rewards.welcomeBonus} to start`,
    body: `Your first order comes with a welcome bonus, so you start ${rewards.welcomeBonus} of the way there rather than at nothing.`,
  },
  {
    title: `${money(rewards.referralCredit)} each way`,
    body: "Send a neighbor. When their first delivery lands, you both get a credit on the next order.",
  },
];

export const dynamic = "force-dynamic";

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  // Somebody already signed in on this device goes straight to their points.
  if (await signedInEmail()) redirect("/rewards/me");
  const { link } = await searchParams;

  const shop = await getShop();
  const { rewards } = shop;
  const ways = waysFor(shop);

  return (
    <>
      <PageHeader
        eyebrow="Pantry Rewards"
        title={
          <>
            {rewards.pointsPerDollar === 1 ? "A point a dollar." : `${rewards.pointsPerDollar} points a dollar.`}
            <br />A free bag at {rewards.rewardAt}.
          </>
        }
        standfirst="No app, no plastic card, no points that quietly expire. The email your order goes to is your account, and it starts counting on your first order without you doing anything."
      />

      <section className="mx-auto mt-14 grid w-full max-w-[1100px] gap-5 px-6 sm:px-10 lg:grid-cols-4">
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
            somebody else out of your points. Ask for a fresh one below.
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
            Your points are counting from your very first order. Looking them up needs her email account
            connected, which is one signup away.
          </p>
        ) : null}
        <SignInBox disabled={!mailReady} />
      </section>
    </>
  );
}
