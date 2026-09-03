import "server-only";
import { safely, sql } from "@/lib/db";
import { looksLikeCode, makeCode, type GiftDraft } from "@/lib/gift";

/**
 * Where a card lives between being written and being opened.
 *
 * It holds four short strings and a verse. There is no email address on it, no
 * account behind it and nothing linking it to an order: whoever has the link
 * has the card, which is exactly how a card works.
 */

export type Gift = GiftDraft & {
  code: string;
  createdAt: number;
  openedAt: number | null;
};

type Row = {
  code: string;
  verse_ref: string;
  verse_text: string;
  note: string;
  from_name: string;
  to_name: string;
  created_at: Date;
  opened_at: Date | null;
};

const toGift = (row: Row): Gift => ({
  code: row.code,
  verseRef: row.verse_ref,
  verseText: row.verse_text,
  note: row.note,
  from: row.from_name,
  to: row.to_name,
  createdAt: new Date(row.created_at).getTime(),
  openedAt: row.opened_at ? new Date(row.opened_at).getTime() : null,
});

/** Writes a card down and returns the code for its link, or null if it cannot. */
export async function keepGift(draft: GiftDraft): Promise<string | null> {
  // A code collision is vanishingly unlikely and completely silent if it
  // happens, which is the worst kind of bug: it would hand somebody else's
  // card to the wrong person. So the insert refuses to overwrite, and a clash
  // simply tries again.
  for (let tries = 0; tries < 5; tries++) {
    const code = makeCode();
    const written = await safely(
      "writing a card",
      async () => {
        const rows = (await sql()`
          insert into gifts (code, verse_ref, verse_text, note, from_name, to_name)
          values (${code}, ${draft.verseRef}, ${draft.verseText}, ${draft.note}, ${draft.from}, ${draft.to})
          on conflict (code) do nothing
          returning code
        `) as { code: string }[];
        return rows[0]?.code ?? null;
      },
      null,
    );
    if (written) return written;
  }
  return null;
}

/** Reads a card. Anything that is not one of our codes never reaches the database. */
export async function readGift(code: unknown): Promise<Gift | null> {
  if (!looksLikeCode(code)) return null;

  return safely(
    "reading a card",
    async () => {
      const rows = (await sql()`select * from gifts where code = ${code}`) as Row[];
      return rows[0] ? toGift(rows[0]) : null;
    },
    null,
  );
}

/** Notes that it has been opened. The first time is the one that counts. */
export async function markOpened(code: string): Promise<void> {
  if (!looksLikeCode(code)) return;
  await safely(
    "marking a card opened",
    async () => {
      await sql()`update gifts set opened_at = now() where code = ${code} and opened_at is null`;
      return true;
    },
    false,
  );
}
