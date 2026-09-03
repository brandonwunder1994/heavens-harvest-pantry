"use client";

// Writing the card that goes with a jar.
//
// Choose one of her verses, write a line or two, say who it is from. What comes
// back is a link. Whoever opens it pulls the string and the paper comes off.
//
// Every rule about what may go on a card lives in lib/gift.ts and is applied on
// the server, because a rule enforced only in a browser is a suggestion. What
// this file does is say the same things earlier and more kindly.

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { sendACard, type SendState } from "@/app/(shop)/send/actions";
import { NOTE_LIMIT, WHO_LIMIT, cleanNote } from "@/lib/gift";

type Verse = { ref: string; text: string };

function Sending() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="stamp !min-h-11 !px-6 !text-[11px]" disabled={pending}>
      {pending ? "Writing it out…" : "Make the card"}
    </button>
  );
}

export function SendWithAVerse({ verses }: { verses: Verse[] }) {
  const [state, act] = useActionState<SendState, FormData>(sendACard, { code: null, why: null });
  const [chosen, setChosen] = useState(verses[0]?.ref ?? "");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const verse = verses.find((v) => v.ref === chosen) ?? verses[0];
  // Said in the browser only so somebody sees it as they type. The server does
  // this again, and the server's answer is the one that counts.
  const kept = cleanNote(note);
  const stripped = note.trim().length > 0 && kept.length < note.trim().length;

  if (state.code) {
    const link = `${typeof window === "undefined" ? "" : window.location.origin}/gift/${state.code}`;
    return (
      <div className="sendc sendc-done">
        <p className="sendc-said">The card is written. Send them this.</p>
        <div className="sendc-link">
          <input readOnly value={link} aria-label="The link to the card" onFocus={(e) => e.currentTarget.select()} />
          <button
            type="button"
            className="sendc-copy"
            onClick={() => {
              navigator.clipboard?.writeText(link).then(
                () => setCopied(true),
                () => setCopied(false),
              );
            }}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="sendc-small">
          Anybody with the link can open the card, so send it to them and nobody else. It does not expire.
        </p>
        <a className="sendc-open" href={`/gift/${state.code}`}>
          See it the way they will
        </a>
      </div>
    );
  }

  return (
    <form action={act} className="sendc">
      <fieldset className="sendc-set">
        <legend className="small-caps">Choose the verse</legend>
        <div className="sendc-verses">
          {verses.map((v) => (
            <label key={v.ref} className="sendc-verse" data-on={v.ref === chosen ? "yes" : undefined}>
              <input
                type="radio"
                name="verse"
                value={v.ref}
                checked={v.ref === chosen}
                onChange={() => setChosen(v.ref)}
              />
              <span className="sendc-ref">{v.ref}</span>
            </label>
          ))}
        </div>
        {verse ? <p className="sendc-preview">&ldquo;{verse.text}&rdquo;</p> : null}
      </fieldset>

      <div className="sendc-who">
        <label className="sendc-field">
          <span className="small-caps">Who is it for?</span>
          <input name="to" maxLength={WHO_LIMIT} placeholder="A first name is enough" required />
        </label>
        <label className="sendc-field">
          <span className="small-caps">And who from?</span>
          <input name="from" maxLength={WHO_LIMIT} placeholder="Your name" required />
        </label>
      </div>

      <label className="sendc-field">
        <span className="small-caps">Write them a line or two</span>
        <textarea
          name="note"
          rows={4}
          maxLength={NOTE_LIMIT + 200}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Thinking of you this week."
          required
        />
        <span className="sendc-count">
          {kept.length} of {NOTE_LIMIT}
          {stripped ? " · web addresses are left off a card" : ""}
        </span>
      </label>

      {state.why ? (
        <p className="sendc-why" role="status">
          {state.why}
        </p>
      ) : null}

      <Sending />
    </form>
  );
}
