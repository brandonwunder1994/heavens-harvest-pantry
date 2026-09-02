// The Sunday morning note.
//
// A short email that opens a page about you: this week's verse, your points,
// and whether she is baking. Written in her voice and sent from her, not out of
// a newsletter template — which is why it is built here as plain words rather
// than pulled from one.
//
// Three rules it keeps:
//
//   1. It never says she is baking unless the porch light says so. `baking` is
//      the porch light's own answer, and null means she has not said.
//   2. It never sends to somebody with nothing to read. `worthSending` is the
//      gate, and the caller must honour it.
//   3. Email clients strip stylesheets, ignore classes, and half of them have
//      no idea what a flexbox is. So it is tables and inline styles, and it
//      reads perfectly well as plain text with the styles thrown away.

export type NoteInput = {
  firstName: string;
  verse: { text: string; reference: string };
  points: number;
  /** How many points until the next free bag. */
  toNextBag: number;
  /** Whole free bags already earned and waiting. */
  bagsWaiting: number;
  jarsKept: number;
  /** The porch light's answer: true, false, or null when she has not said. */
  baking: boolean | null;
  /** Her own words from the porch light, if she wrote any. */
  bakingNote: string;
  /** Where "see your wall" goes. Absolute, because this is an email. */
  accountUrl: string;
  /** Where the one-click unsubscribe goes. Never optional. */
  unsubscribeUrl: string;
  shopName: string;
  ownerName: string;
};

/**
 * Whether there is anything here worth landing in somebody's inbox on a Sunday.
 *
 * A weekly email that sometimes has nothing in it teaches people to ignore it,
 * and the first one they ignore is the last one they open. A verse alone is
 * enough; a verse and nothing else is still a reason.
 */
export function worthSending(input: NoteInput): boolean {
  return Boolean(input.verse.text.trim());
}

const esc = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/** The subject line. Her voice, no exclamation marks, no emoji, no "newsletter". */
export function subject(input: NoteInput): string {
  if (input.bagsWaiting > 0) {
    return `This week's verse, and a free bag waiting for you`;
  }
  if (input.baking === true) return `This week's verse, and she is baking`;
  return `This week's verse`;
}

/** The line about the kitchen. Says nothing at all when she has not said. */
export function kitchenLine(input: NoteInput): string {
  if (input.baking === null) return "";
  if (input.baking === false) {
    return input.bakingNote || "She is sold out this week, so the oven is off until next.";
  }
  return input.bakingNote || "She is baking this week.";
}

/** The line about points. Never shown to somebody with none. */
export function pointsLine(input: NoteInput): string {
  if (input.bagsWaiting > 0) {
    const bags = input.bagsWaiting === 1 ? "a free bag" : `${input.bagsWaiting} free bags`;
    return `You have ${bags} waiting. She will put ${input.bagsWaiting === 1 ? "it" : "them"} in with your next order.`;
  }
  if (input.points > 0) {
    return `You are on ${input.points} points, ${input.toNextBag} from a free bag.`;
  }
  return "";
}

/** The line about jars. Only once there are some. */
export function jarLine(input: NoteInput): string {
  if (input.jarsKept <= 0) return "";
  if (input.jarsKept === 1) return "One jar back so far. It is on your shelf.";
  return `${input.jarsKept} jars back so far, all of them on your shelf.`;
}

/**
 * Where the button goes, named for what is actually behind it. Somebody with no
 * points and no jars is not sent to "your wall, your points and your shelf" —
 * all three of those are empty for them, and naming them makes the email read
 * like it was written for somebody else.
 */
export function linkLabel(input: NoteInput): string {
  const has = [];
  if (input.points > 0 || input.bagsWaiting > 0) has.push("your points");
  if (input.jarsKept > 0) has.push("your shelf");
  if (has.length === 0) return "Your page";
  if (has.length === 1) return `Your wall and ${has[0]}`;
  return `Your wall, ${has[0]} and ${has[1]}`;
}

/** The whole note as plain words. This is what half the world will read. */
export function asText(input: NoteInput): string {
  const hello = input.firstName ? `${input.firstName},` : "Hello,";
  const lines = [
    hello,
    "",
    `"${input.verse.text}"`,
    `— ${input.verse.reference}`,
    "",
  ];

  const kitchen = kitchenLine(input);
  if (kitchen) lines.push(kitchen, "");

  const points = pointsLine(input);
  const jars = jarLine(input);
  if (points) lines.push(points);
  if (jars) lines.push(jars);
  if (points || jars) lines.push("");

  lines.push(
    `${linkLabel(input)}: ${input.accountUrl}`,
    "",
    input.ownerName ? `— ${input.ownerName}` : `— ${input.shopName}`,
    "",
    `If you would rather not have these, this stops them: ${input.unsubscribeUrl}`,
  );

  return lines.join("\n");
}

/**
 * The whole note as HTML. Tables and inline styles, because that is what email
 * clients actually render. Nothing here needs the styles to make sense.
 */
export function asHtml(input: NoteInput): string {
  const cream = "#f4eee2";
  const paper = "#fbf8f1";
  const ink = "#3a2712";
  const brown = "#5b3d1e";
  const sage = "#6b7a4a";
  const faint = "#8a7a62";
  const sand = "#cdbfa5";

  const serif = "Georgia, 'Times New Roman', Times, serif";
  const sans = "'Helvetica Neue', Helvetica, Arial, sans-serif";

  const hello = input.firstName ? `${esc(input.firstName)},` : "Hello,";
  const kitchen = kitchenLine(input);
  const points = pointsLine(input);
  const jars = jarLine(input);

  const row = (content: string) =>
    `<tr><td style="padding:0 32px;font-family:${sans};font-size:15px;line-height:1.6;color:${ink};">${content}</td></tr>`;
  const gap = (h: number) => `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(subject(input))}</title>
</head>
<body style="margin:0;padding:0;background:${cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(input.verse.text)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${cream};">
<tr><td align="center" style="padding:28px 12px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:${paper};border:1px solid ${sand};">
  ${gap(30)}
  <tr><td align="center" style="padding:0 32px;font-family:${serif};font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${brown};">
    ${esc(input.shopName)}
  </td></tr>
  ${gap(26)}

  <tr><td align="center" style="padding:0 32px;border-top:1px solid ${sand};"></td></tr>
  ${gap(26)}

  <tr><td align="center" style="padding:0 32px;font-family:${serif};font-style:italic;font-size:24px;line-height:1.3;color:${brown};">
    &ldquo;${esc(input.verse.text)}&rdquo;
  </td></tr>
  ${gap(14)}
  <tr><td align="center" style="padding:0 32px;font-family:${serif};font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${sage};">
    ${esc(input.verse.reference)}
  </td></tr>
  ${gap(30)}

  ${row(hello)}
  ${kitchen ? gap(14) + row(esc(kitchen)) : ""}
  ${points ? gap(14) + row(esc(points)) : ""}
  ${jars ? gap(10) + row(`<span style="color:${faint};">${esc(jars)}</span>`) : ""}
  ${gap(28)}

  <tr><td align="center" style="padding:0 32px;">
    <a href="${esc(input.accountUrl)}" style="display:inline-block;background:${brown};color:${cream};font-family:${serif};font-size:12px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:15px 28px;">
      ${esc(linkLabel(input))}
    </a>
  </td></tr>
  ${gap(30)}

  ${row(`<span style="font-family:${serif};font-size:17px;color:${brown};">&mdash; ${esc(input.ownerName || input.shopName)}</span>`)}
  ${gap(28)}

  <tr><td style="padding:18px 32px 24px;border-top:1px solid ${sand};font-family:${sans};font-size:11px;line-height:1.6;color:${faint};">
    You are getting this because you have ordered from ${esc(input.shopName)}.
    <a href="${esc(input.unsubscribeUrl)}" style="color:${faint};">Stop these</a> and they stop, with nothing else changing.
  </td></tr>
</table>

</td></tr></table>
</body></html>`;
}

/** Everything `sendMail(to, subject, text, html)` needs, in that order. */
export function sundayNote(input: NoteInput): { subject: string; text: string; html: string } {
  return { subject: subject(input), text: asText(input), html: asHtml(input) };
}
