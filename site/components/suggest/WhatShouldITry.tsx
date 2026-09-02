"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartSeal } from "@/components/Sprite";
import { money, type Flavor } from "@/lib/content";
import { QUESTIONS, TINTS, reason, suggest, type Answers } from "@/lib/suggest";

/**
 * Four questions, and a flavor at the end.
 *
 * The page warms toward the answer as they go, so by the last question the
 * thing already looks like the flavor it is about to name. It exists to remove
 * the hesitation that stops a first order — so it never stalls, never asks for
 * an email, and the way out is always visible.
 */
export function WhatShouldITry({ flavors }: { flavors: Flavor[] }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(0);

  const done = step >= QUESTIONS.length;
  const question = QUESTIONS[step];

  // The colour drifts one answer at a time rather than jumping at the end.
  const chosen = QUESTIONS.map((q) => answers[q.id]).filter(Boolean);
  const tint = chosen.length > 0 ? TINTS[chosen[chosen.length - 1]] : undefined;

  function answer(value: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
    setStep((n) => n + 1);
  }

  function again() {
    setAnswers({});
    setStep(0);
  }

  const result = done ? suggest(flavors, answers) : null;

  return (
    <section
      className="try mx-auto w-full max-w-[720px] px-6 sm:px-10"
      style={tint ? ({ "--try-tint": tint } as React.CSSProperties) : undefined}
    >
      <div className="try-card flex flex-col items-center gap-5 px-7 py-10 text-center sm:px-10">
        <HeartSeal size={36} />

        {!done ? (
          <>
            <div className="small-caps">
              Question {step + 1} of {QUESTIONS.length}
            </div>
            <h2 className="display m-0 max-w-[16ch] text-[32px] leading-tight sm:text-[42px]">
              {question.ask}
            </h2>

            <div className="mt-1 flex w-full flex-col gap-3">
              {question.choices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => answer(choice.value)}
                  className="try-choice"
                >
                  <span className="try-choice-label">{choice.label}</span>
                  <span className="try-choice-hint">{choice.hint}</span>
                </button>
              ))}
            </div>

            {step > 0 ? (
              <button type="button" onClick={() => setStep((n) => n - 1)} className="try-back">
                Back a question
              </button>
            ) : null}
          </>
        ) : result?.kind === "match" ? (
          <>
            <div className="small-caps">Start here</div>
            <h2 className="display m-0 text-[36px] leading-tight sm:text-[52px]">
              {result.flavor.name}
            </h2>
            <p className="max-w-[42ch] text-[19px] leading-relaxed text-bark sm:text-[21px]">
              {result.flavor.blurb}
            </p>
            <p className="font-ui text-[13px] text-muted">{reason(result.because)}</p>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
              <Link href={`/menu#${result.flavor.slug}`} className="stamp">
                See it on the menu · {money(result.flavor.bagPrice)}
              </Link>
              <button type="button" onClick={again} className="try-back">
                Ask me again
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="small-caps">Nothing quite fits</div>
            <h2 className="display m-0 max-w-[18ch] text-[32px] leading-tight sm:text-[40px]">
              Nothing on this week&apos;s tray is quite that.
            </h2>
            <p className="max-w-[44ch] text-[19px] leading-relaxed text-bark">
              {result?.flavor
                ? `She bakes a short list and it changes. ${result.flavor.name} is the one people start with — have a look and see.`
                : "There is nothing on the menu this week. Have a look back in a day or two."}
            </p>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
              <Link href="/menu" className="stamp">
                See the whole menu
              </Link>
              <button type="button" onClick={again} className="try-back">
                Ask me again
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
