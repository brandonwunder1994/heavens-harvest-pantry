import type { OrderSnapshot } from "@/lib/order-store";
import { ADDRESS_NOTE, pickupDateLabel } from "@/lib/fulfilment";
import { formatMoney } from "@/lib/cart";
import { sizeLabel } from "@/lib/products";
import { packPhotoFor } from "@/lib/jars";

/**
 * The receipt email as the customer sees it: logo, what they bought with a
 * picture of each, where and when to collect it, this week's verse, a thank
 * you, and two ways to leave a review.
 *
 * Email clients strip stylesheets and half of them cannot lay out flexbox, so
 * this is tables and inline styles, with web-safe fonts. Every picture is an
 * absolute address on the site itself (`/email/...`, small copies of the real
 * product photos), because an email has nowhere to keep a relative one.
 */

export type ReceiptExtras = {
  /** The site's own address, no trailing slash. Without it pictures are left out. */
  origin?: string;
  verse?: { text: string; reference: string };
};

export const REVIEW_URL = "https://heavensharvestpantry.com/reviews";

const BROWN = "#5b3d1e";
const INK = "#3a2712";
const SAGE = "#4f5a35";
const GOLD = "#c9a06a";
const MUTED = "#6b5a42";
const CREAM = "#f4eee2";
const PAPER = "#fbf8f1";
const RULE = "#e3d9c4";
const MOSS = "#eef0e2";
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Helvetica,Arial,sans-serif";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** "/bags/apple.png" or "/jars/apple.png" becomes "/email/bags/apple.png", the small copy. */
function emailPhoto(src: string | undefined): string | undefined {
  return src ? `/email${src}` : undefined;
}

export function confirmationHtml(
  snapshot: OrderSnapshot,
  pickup: { address: string; contact: string } | null,
  amount: number,
  tax: number,
  opts: { mock: boolean; simulated: boolean; link: string; extras?: ReceiptExtras },
): string {
  const { order, totals } = snapshot;
  const { origin, verse } = opts.extras ?? {};
  const first = order.details.name.trim().split(/\s+/)[0] || "friend";
  const img = (path: string | undefined, w: number, h: number, alt = "") =>
    origin && path
      ? `<img src="${esc(origin + path)}" width="${w}" height="${h}" alt="${esc(alt)}" style="display:block;width:${w}px;height:auto;max-height:${h}px;border:0;">`
      : "";

  const banner = opts.mock
    ? `<tr><td style="background:#fff3cd;color:#664d03;font:700 13px ${SANS};padding:10px 24px;text-align:center;">${
        opts.simulated ? "SIMULATED PAYMENT. Walkthrough only; no real payment was made." : "MOCK. Practice order, no real payment, baking, pickup or delivery."
      }</td></tr>`
    : "";

  // One row per thing bought.
  const rows = totals.lines
    .map((p) => {
      const gift = !!p.line.gift;
      const photo = gift
        ? "/email/blessing-jar.png"
        : emailPhoto(packPhotoFor({ slug: p.line.slug, name: p.flavor.name }, p.line.format));
      const title = gift ? "Blessing Jar" : p.flavor.name;
      const detail = gift
        ? p.flavor.name
        : [p.line.sizeOz ? `${sizeLabel(p.line.sizeOz)} ${p.line.format === "jar" ? "jar" : "bag"}` : p.line.format === "sampler" ? "3 oz sampler bag" : p.line.format, p.line.name ? `for ${p.line.name}` : ""]
            .filter(Boolean)
            .join(" · ");
      return `<tr>
<td width="76" valign="middle" style="padding:12px 0;border-bottom:1px solid ${RULE};">${img(photo, 52, 72, title)}</td>
<td valign="middle" style="padding:12px 8px;border-bottom:1px solid ${RULE};font:16px ${SANS};color:${INK};">
<strong>${p.line.qty > 1 ? `${p.line.qty} &times; ` : ""}${esc(title)}</strong><br><span style="font-size:13px;color:${MUTED};">${esc(detail)}</span></td>
<td valign="middle" align="right" style="padding:12px 0;border-bottom:1px solid ${RULE};font:16px ${SANS};color:${INK};white-space:nowrap;">${formatMoney(p.totalCents)}</td></tr>`;
    })
    .join("");

  const sumRow = (label: string, value: string, strong = false) =>
    `<tr><td colspan="2" style="padding:${strong ? "14px 0 0" : "8px 0 0"};font:${strong ? `700 12px ${SANS}` : `14px ${SANS}`};letter-spacing:${strong ? "2px" : "0"};text-transform:${strong ? "uppercase" : "none"};color:${MUTED};">${label}</td>
<td align="right" style="padding:${strong ? "10px 0 0" : "8px 0 0"};font:${strong ? `700 28px ${SERIF}` : `14px ${SANS}`};color:${strong ? BROWN : INK};">${value}</td></tr>`;

  // Where and when, split by where each item waits: the fridge or the table.
  const personal = totals.lines.filter((p) => !p.line.gift);
  // It all goes in one bag, so a single chocolate flavor puts the whole order in the fridge.
  const names = personal.map((p) => p.flavor.name);
  const anyCooling = personal.some((p) => p.flavor.requiresCooling);
  const fridge = anyCooling ? names : [];
  const table = anyCooling ? [] : names;
  const chip = (label: string, bg: string, fg: string) =>
    `<span style="display:inline-block;background:${bg};color:${fg};font:700 11px ${SANS};letter-spacing:1.5px;text-transform:uppercase;padding:7px 12px;border-radius:3px;">${label}</span>`;
  // One clear storage card: where it waits, and what is in the bag, one flavor per line.
  const storage = (label: string, bg: string, fg: string, note: string, list: string[]) =>
    list.length
      ? `<tr><td style="padding:20px 22px;border-top:1px solid #d7dbc0;">${chip(label, bg, fg)}
<div style="font:15px/1.5 ${SANS};color:${INK};margin-top:12px;">${esc(note)}</div>
<div style="font:700 15px/1.7 ${SANS};color:${INK};margin-top:8px;">${list.map((n) => `&bull;&nbsp;${esc(n)}`).join("<br>")}</div></td></tr>`
      : "";
  const mapsUrl = pickup ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pickup.address.replace(/\n/g, " "))}` : "";
  const pickupBlock = pickup
    ? `<tr><td style="padding:22px 24px 0;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${MOSS};border:1px solid #d7dbc0;border-radius:6px;">
<tr><td style="background:${SAGE};color:#fbf8f1;padding:20px 22px;border-radius:6px 6px 0 0;">
<div style="font:700 12px ${SANS};letter-spacing:3px;text-transform:uppercase;color:#dfe5c8;">Porch pickup</div>
<div style="font:700 26px/1.2 ${SERIF};color:#fbf8f1;margin-top:6px;">${esc(pickupDateLabel(order.details.runDate))}</div>
<div style="font:16px ${SANS};color:#fbf8f1;margin-top:4px;">${esc(order.details.pickupPeriod === "afternoon" ? "Afternoon, from noon" : "Morning")}</div></td></tr>
${storage("In the fridge", "#dfe7ee", "#2f4a63", "Your whole order is bagged together, so it all goes in the fridge:", fridge)}${storage("On the table", "#f1e2c6", "#6b4a1b", "Waiting for you on the porch table:", table)}
<tr><td style="padding:20px 22px;border-top:1px solid #d7dbc0;"><div style="font:700 11px ${SANS};letter-spacing:2px;text-transform:uppercase;color:${SAGE};margin-bottom:8px;">Pickup address</div>
<div style="font:700 20px/1.4 ${SERIF};color:${INK};"><a href="${esc(mapsUrl)}" style="color:${INK};text-decoration:none;">${esc(pickup.address).replace(/\n/g, "<br>")}</a></div>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:14px;"><tr><td style="background:${SAGE};border-radius:4px;"><a href="${esc(mapsUrl)}" style="display:inline-block;color:#fbf8f1;text-decoration:none;font:700 14px ${SANS};padding:11px 20px;">Get directions</a></td></tr></table>
<div style="font:italic 13px/1.5 ${SANS};color:${MUTED};margin-top:14px;">${esc(ADDRESS_NOTE)}</div>${pickup.contact ? `<div style="font:14px ${SANS};color:${MUTED};margin-top:10px;">Questions? <span style="color:${INK};">${esc(pickup.contact)}</span></div>` : ""}</td></tr>
</table></td></tr>`
    : "";

  const giftBlock = totals.lines
    .filter((p) => p.line.gift)
    .map((p) => {
      const g = p.line.gift!;
      return `<tr><td style="padding:14px 24px 0;font:15px/1.55 ${SANS};color:${MUTED};text-align:center;">Your anonymous Blessing Jar for ${esc(g.recipientName)} will be delivered in Vistancia on ${esc(pickupDateLabel(order.details.bakeId!))}. The jar and delivery are included.${g.verseRef ? `<br>Verse on the card: ${esc(g.verseRef)}` : ""}</td></tr>`;
    })
    .join("");

  const note = order.details.note
    ? `<tr><td style="padding:14px 24px 0;font:14px ${SANS};color:${MUTED};text-align:center;">Your order note: ${esc(order.details.note)}</td></tr>`
    : "";

  const verseBlock = verse?.text.trim()
    ? `<tr><td align="center" style="padding:36px 36px 6px;"><div style="color:${GOLD};font:18px ${SERIF};">&#10087;</div>
<div style="font:italic 23px/1.4 ${SERIF};color:${BROWN};margin:10px 0;">&ldquo;${esc(verse.text.trim())}&rdquo;</div>
${verse.reference ? `<div style="font:700 12px ${SANS};letter-spacing:3px;text-transform:uppercase;color:${SAGE};">${esc(verse.reference)}</div>` : ""}</td></tr>`
    : "";

  const review = `<tr><td style="padding:28px 20px 0;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BROWN};border-radius:6px;"><tr><td align="center" style="padding:26px 20px;">
<div style="color:${GOLD};font:22px ${SANS};letter-spacing:6px;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
<div style="font:25px ${SERIF};color:#fbf8f1;margin:8px 0;">We would love your review</div>
<div style="font:15px/1.6 ${SANS};color:#e6dcc8;max-width:400px;margin:0 auto 18px;">A few kind words help neighbors find us. Scan the code with your phone, or tap the button.</div>
<table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
${origin ? `<td valign="middle" style="background:#ffffff;padding:10px;border-radius:4px;"><a href="${REVIEW_URL}">${img("/email/review-qr.png", 124, 124, "QR code to our review page")}</a></td><td width="40" align="center" style="font:12px ${SANS};color:#cdbfa5;">or</td>` : ""}
<td valign="middle"><a href="${REVIEW_URL}" style="display:inline-block;background:${GOLD};color:${INK};text-decoration:none;font:700 16px ${SANS};padding:14px 26px;border-radius:4px;">Leave a review</a></td></tr></table>
<div style="font:12px ${SANS};color:#cdbfa5;margin-top:12px;">heavensharvestpantry.com/reviews</div>
</td></tr></table></td></tr>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:0;background:#e9e1d1;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e9e1d1;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:${PAPER};border-radius:6px;">
${banner}
<tr><td style="height:6px;background:#6b7a4a;font-size:0;line-height:0;border-radius:6px 6px 0 0;">&nbsp;</td></tr>
<tr><td align="center" style="background:${CREAM};padding:28px 24px 6px;">${origin ? `<img src="${esc(origin)}/email/logo.png" width="150" height="150" alt="Heaven&rsquo;s Harvest Pantry" style="display:block;width:150px;height:150px;border:0;">` : ""}</td></tr>
<tr><td align="center" style="background:${CREAM};padding:22px 32px 22px;">
<div style="font:600 34px/1.15 ${SERIF};color:${BROWN};">Thank you, ${esc(first)}.</div>
<div style="font:16px/1.6 ${SANS};color:${MUTED};margin-top:10px;">${opts.mock ? "Your practice payment is complete." : "We got your order and we are so grateful for it."}<br>Here is your receipt.</div></td></tr>
<tr><td style="padding:22px 32px 4px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%">
${rows}
${sumRow("Subtotal", formatMoney(amount - tax))}${sumRow("Tax", formatMoney(tax))}${sumRow("Total paid", formatMoney(amount), true)}
</table></td></tr>
${pickupBlock}${giftBlock}${note}${verseBlock}
<tr><td align="center" style="padding:26px 36px 0;font:16px/1.65 ${SANS};color:${MUTED};">Thank you for supporting a small business.</td></tr>
${review}
<tr><td align="center" style="padding:28px 24px 6px;font:20px ${SERIF};color:${BROWN};">With love and gratitude<div style="font:13px ${SANS};color:${MUTED};margin-top:4px;">Heaven&rsquo;s Harvest Pantry &middot; Peoria, Arizona</div></td></tr>
<tr><td align="center" style="padding:18px 28px 24px;border-top:1px solid ${RULE};font:12px/1.6 ${SANS};color:${MUTED};">Questions about your order? Just reply to this email.${opts.link ? `<br><a href="${esc(opts.link)}" style="color:${MUTED};">View your confirmation online</a>` : ""}</td></tr>
</table></td></tr></table></body></html>`;
}
