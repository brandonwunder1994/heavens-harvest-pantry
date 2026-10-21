import "server-only";
import { business } from "@/lib/content";
import { drawLabel, type GiveawaySetting } from "@/lib/giveaway";
import type { Entry } from "@/lib/giveaway-store";
import { sendMail, type Sent } from "@/lib/mailer";
import { PUBLIC_SITE_URL } from "@/lib/public-site";

/** The three emails of a giveaway. Plain words, the real draw date in each. */

const escape = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const first = (name: string): string => name.trim().split(/\s+/)[0] || "friend";

function frame(heading: string, paragraphs: string[]): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:17px;line-height:1.55">${escape(p)}</p>`).join("");
  return `<div style="background:#fbf6ea;padding:28px 16px;font-family:Georgia,'Times New Roman',serif;color:#2b2118">
  <div style="max-width:520px;margin:0 auto;background:#fffdf7;border:1px solid #e3d6bd;padding:28px">
    <h1 style="margin:0 0 18px;font-size:26px;font-weight:normal;color:#5b3d1e">${escape(heading)}</h1>
    ${body}
    <p style="margin:24px 0 0;font-size:14px;color:#7a6a55">${escape(business.name)} · <a href="${PUBLIC_SITE_URL}" style="color:#5b3d1e">${PUBLIC_SITE_URL.replace("https://", "")}</a></p>
  </div></div>`;
}

function send(to: string, subject: string, heading: string, paragraphs: string[], key: string): Promise<Sent> {
  return sendMail(to, subject, `${heading}\n\n${paragraphs.join("\n\n")}\n\n${business.name}\n${PUBLIC_SITE_URL}`, frame(heading, paragraphs), key);
}

/** Right after they enter: we have it, we are checking. */
export function sendEntryReceived(entry: Pick<Entry, "name" | "email" | "instagram">, setting: GiveawaySetting, round: string): Promise<Sent> {
  const draw = drawLabel(setting);
  return send(
    entry.email,
    `We got your entry — ${business.shortName} giveaway`,
    "We got your entry!",
    [
      `Hi ${first(entry.name)}, thank you for entering the ${business.name} monthly giveaway.`,
      `Next we check that @${entry.instagram} liked and shared the post. When we have, you will get a second email confirming you are in.`,
      draw ? `The winner is drawn ${draw}.` : "We will email you the draw date soon.",
    ],
    `giveaway-received-${round}-${entry.email}`,
  );
}

/** When she verifies them: the confirmation that doubles as their receipt. */
export function sendVerified(entry: Pick<Entry, "name" | "email" | "instagram">, setting: GiveawaySetting, round: string): Promise<Sent> {
  const draw = drawLabel(setting);
  const paragraphs = [
    `Hi ${first(entry.name)}, we found your like and share from @${entry.instagram}. You are officially in this month's giveaway.`,
    ...(setting.prize ? [`The prize: ${setting.prize}.`] : []),
    draw ? `The winner is drawn ${draw}. We will email the winner, and text them too if they gave us a number.` : "We will email you the draw date soon.",
    ...(setting.pickupNote ? [`If you win: ${setting.pickupNote}`] : ["If you win, we will email you how and when to pick it up."]),
    "Keep this email as your receipt. No need to do anything else, and good luck!",
  ];
  return send(entry.email, `You're in! ${business.shortName} giveaway`, "You're in!", paragraphs, `giveaway-verified-${round}-${entry.email}`);
}

/** Owner-triggered, after the spin. */
export function sendWinner(entry: Pick<Entry, "name" | "email" | "instagram">, setting: GiveawaySetting, round: string): Promise<Sent> {
  return send(
    entry.email,
    `You won the ${business.shortName} giveaway!`,
    "You won!",
    [
      `Hi ${first(entry.name)}, congratulations! You are this month's ${business.name} giveaway winner.`,
      ...(setting.prize ? [`Your prize: ${setting.prize}.`] : []),
      setting.pickupNote ? setting.pickupNote : "Reply to this email and we will set up your pickup.",
      "Thank you for being part of our little community.",
    ],
    `giveaway-winner-${round}-${entry.email}`,
  );
}
