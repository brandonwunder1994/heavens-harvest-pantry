/**
 * Send it with a verse.
 *
 * A card that goes with a jar: one of her verses, a few lines in your own
 * words, and who it is from. Whoever it is for opens a link, pulls the string,
 * and the paper comes off.
 *
 * The rules here are all about one thing. This is a page anybody can write to
 * without an account, which is a free pastebin if you let it be one — so the
 * verse must be one she actually has, the note is short, and **no web address
 * survives it**. A card that cannot carry a link cannot carry anybody
 * somewhere else.
 *
 * Import-free, so `node --test` runs it directly.
 */

export const NOTE_LIMIT = 320;
export const WHO_LIMIT = 40;
export const CODE_LENGTH = 10;

/** No vowels, so no code ever spells anything, and no 0/O or 1/l to misread. */
const ALPHABET = "bcdfghjkmnpqrstvwxyz23456789";

/** A code for a card, from whatever source of randomness the caller has. */
export function makeCode(random: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[Math.floor(random() * ALPHABET.length)] ?? "b";
  }
  return out;
}

/** True only for something this file could have made. */
export function looksLikeCode(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length === CODE_LENGTH &&
    [...value].every((ch) => ALPHABET.includes(ch))
  );
}

/** A person's name as it goes on a card. */
export function cleanWho(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N} '’.\-&]/gu, "")
    .trim()
    .slice(0, WHO_LIMIT);
}

// Anything that could be followed somewhere. Bare domains count: "granola dot
// com" is a joke, "granola.com" is a link with the http left off.
const LINKS = /\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.|mailto:|[a-z0-9-]+\.(?:com|net|org|io|co|me|ly|gg|xyz|shop|link|app|info|biz|ru|cn|top|site|online|club|live)\b)\S*/gi;

/**
 * The note, made safe to publish at a URL a stranger might be sent.
 *
 * Web addresses are removed rather than escaped or refused: refusing teaches
 * somebody to work around it, and escaping still leaves the address readable
 * and typeable. Removing means the card is simply not a way to send anybody
 * anywhere.
 */
export function cleanNote(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/\r\n?/g, "\n")
    .replace(LINKS, "")
    // Control characters, but not the newlines a note is written in.
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim()
    .slice(0, NOTE_LIMIT);
}

export type GiftDraft = {
  verseRef: string;
  verseText: string;
  note: string;
  from: string;
  to: string;
};

export type Checked =
  | { ok: true; gift: GiftDraft }
  | { ok: false; why: string };

/**
 * Check a card before it is written down.
 *
 * The verse is checked against the ones she actually has rather than taken on
 * trust, because the card is hers as much as it is the sender's — nobody gets
 * to put words in her mouth by posting a different reference.
 */
export function checkGift(
  input: { verseRef?: unknown; note?: unknown; from?: unknown; to?: unknown },
  verses: { reference: string; text: string }[],
): Checked {
  const ref = typeof input.verseRef === "string" ? input.verseRef.trim() : "";
  const found = verses.find((v) => v.reference === ref);
  if (!found) return { ok: false, why: "Choose one of the verses on the card." };

  const note = cleanNote(input.note);
  const from = cleanWho(input.from);
  const to = cleanWho(input.to);

  if (!to) return { ok: false, why: "Who is it for? A first name is enough." };
  if (!from) return { ok: false, why: "And who is it from?" };
  if (!note) return { ok: false, why: "Write them a line or two. That is the whole point of it." };

  return {
    ok: true,
    gift: { verseRef: found.reference, verseText: found.text, note, from, to },
  };
}
