"use client";

import { useActionState, useCallback, useState } from "react";
import { saveBlock } from "@/app/owner/actions";
import { idle } from "@/lib/save-state";
import { Labelled, PriceInput, SaveBar, inputClass } from "@/components/owner/SaveBar";
import type { BlessingBag, JarRules, RewardRules } from "@/lib/content";

/** The numbers behind the jar credit, the points and the blessing bag. */
export function RulesEditor({
  jarRules,
  rewards,
  blessingBag,
}: {
  jarRules: JarRules;
  rewards: RewardRules;
  blessingBag: BlessingBag;
}) {
  const [jars, setJars] = useState(jarRules);
  const [points, setPoints] = useState(rewards);
  const [bag, setBag] = useState(blessingBag);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-3">
      <Block heading="Returned jars" keyName="jarRules" value={jars} button="Save jar rules">
        <Labelled label="Money off per jar" hint="Comes off the order at checkout.">
          <PriceInput
            value={jars.creditDollars}
            onChange={(v) => setJars((p) => ({ ...p, creditDollars: Number(v) || 0 }))}
          />
        </Labelled>
        <Labelled label="Bonus points per jar" hint="On top of the money off.">
          <input
            className={inputClass}
            type="number"
            min={0}
            value={jars.bonusPoints}
            onChange={(e) => setJars((p) => ({ ...p, bonusPoints: Number(e.target.value) }))}
          />
        </Labelled>
        <Labelled label="Bag size" hint="How the bag is described on the menu, like about 12 ounces.">
          <input
            className={inputClass}
            value={jars.bagSize}
            onChange={(e) => setJars((p) => ({ ...p, bagSize: e.target.value }))}
          />
        </Labelled>
        <Labelled label="Jar size" hint="How the jar is described, like 16-ounce glass mason jar.">
          <input
            className={inputClass}
            value={jars.jarSize}
            onChange={(e) => setJars((p) => ({ ...p, jarSize: e.target.value }))}
          />
        </Labelled>
      </Block>

      <Block heading="Rewards" keyName="rewards" value={points} button="Save rewards">
        <Labelled label="Points per dollar spent" hint="The shop says buy 10 bags or jars, get one free. Leave this unless you mean to change the math.">
          <input
            className={inputClass}
            type="number"
            min={0}
            value={points.pointsPerDollar}
            onChange={(e) => setPoints((p) => ({ ...p, pointsPerDollar: Number(e.target.value) }))}
          />
        </Labelled>
        <Labelled label="Free bag at" hint="Ten punches on the card. Leave this at 100 unless you change the offer.">
          <input
            className={inputClass}
            type="number"
            min={1}
            value={points.rewardAt}
            onChange={(e) => setPoints((p) => ({ ...p, rewardAt: Number(e.target.value) }))}
          />
        </Labelled>
        <Labelled label="Welcome bonus" hint="Added once, on somebody's first order.">
          <input
            className={inputClass}
            type="number"
            min={0}
            value={points.welcomeBonus}
            onChange={(e) => setPoints((p) => ({ ...p, welcomeBonus: Number(e.target.value) }))}
          />
        </Labelled>
        <Labelled label="Referral credit" hint="Both of them get this off, in dollars.">
          <PriceInput
            value={points.referralCredit}
            onChange={(v) => setPoints((p) => ({ ...p, referralCredit: Number(v) || 0 }))}
          />
        </Labelled>
      </Block>

      <Block heading="Blessing bags" keyName="blessingBag" value={bag} button="Save blessing bags">
        <Labelled label="Price" hint="What it costs to send one to a neighbor.">
          <PriceInput value={bag.price} onChange={(v) => setBag((p) => ({ ...p, price: Number(v) || 0 }))} />
        </Labelled>
        <Labelled label="How you describe it">
          <textarea
            className={`${inputClass} min-h-[188px]`}
            value={bag.blurb}
            onChange={(e) => setBag((p) => ({ ...p, blurb: e.target.value }))}
          />
        </Labelled>
      </Block>
    </div>
  );
}

/**
 * Each block saves on its own, so a change to one is never lost to another --
 * which is exactly why no two save buttons may say the same thing. A button
 * reading only "Save" invites her to believe it saved the whole page.
 */
function Block({
  heading,
  keyName,
  value,
  button,
  children,
}: {
  heading: string;
  keyName: string;
  value: unknown;
  button: string;
  children: React.ReactNode;
}) {
  const [state, action] = useActionState(saveBlock, idle);
  const [dirty, setDirty] = useState(false);
  const settled = useCallback(() => setDirty(false), []);

  return (
    <form
      action={action}
      onChange={() => setDirty(true)}
      className="flex flex-col gap-4 border border-rule bg-paper px-5 py-5"
    >
      <h3 className="display m-0 text-[22px]">{heading}</h3>
      <input type="hidden" name="key" value={keyName} />
      <input type="hidden" name="value" value={JSON.stringify(value)} />
      {children}
      <SaveBar state={state} label={button} dirty={dirty} onSaved={settled} />
    </form>
  );
}
