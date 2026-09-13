/**
 * Rewards arithmetic. Import-free on purpose, so `node --test` runs it straight
 * from TypeScript with no build step.
 */

export type PointEntry = {
  delta: number;
  reason: string;
  createdAt: number;
};

export type Account = {
  email: string;
  name: string;
  points: number;
  history: PointEntry[];
};

export type RewardRules = {
  pointsPerDollar: number;
  rewardAt: number;
  welcomeBonus: number;
  referralCredit: number;
};

export const balanceOf = (history: PointEntry[]): number =>
  history.reduce((total, entry) => total + entry.delta, 0);

/** How many whole free bags a balance has already paid for. */
export const bagsEarned = (points: number, rules: RewardRules): number =>
  rules.rewardAt > 0 ? Math.floor(Math.max(0, points) / rules.rewardAt) : 0;

/** Points still to go before the next free bag. */
export function pointsToNext(points: number, rules: RewardRules): number {
  if (rules.rewardAt <= 0) return 0;
  const into = Math.max(0, points) % rules.rewardAt;
  return rules.rewardAt - into;
}

/** How far along the current bag she is, 0 to 1, for the progress bar. */
export function progress(points: number, rules: RewardRules): number {
  if (rules.rewardAt <= 0) return 0;
  return (Math.max(0, points) % rules.rewardAt) / rules.rewardAt;
}

/** Whole punches on a ten-hole card. A finished bag shows every hole cut. */
export function punchesFilled(points: number, rules: RewardRules, slots = 10): number {
  if (rules.rewardAt <= 0 || slots <= 0) return 0;
  const into = Math.max(0, points) % rules.rewardAt;
  if (into === 0 && points > 0) return slots;
  return Math.min(slots, Math.floor((into / rules.rewardAt) * slots));
}

/** Emails are the account key, so they are compared with case ignored. */
export const normaliseEmail = (value: string): string => value.trim().toLowerCase();

export const looksLikeEmail = (value: string): boolean =>
  /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normaliseEmail(value));

export function describeEntry(entry: PointEntry): string {
  if (entry.delta >= 0) return entry.reason;
  return `${entry.reason} (−${Math.abs(entry.delta)})`;
}

/** How many bags or jars still to buy before the next free one. */
export function bagsToNext(points: number, rules: RewardRules, slots = 10): number {
  const punched = punchesFilled(points, rules, slots);
  return punched >= slots ? slots : slots - punched;
}

/** Plain-English summary of where someone stands. */
export function standing(points: number, rules: RewardRules): string {
  const earned = bagsEarned(points, rules);
  const togo = bagsToNext(points, rules);
  if (earned > 0) {
    return `${earned} free bag${earned === 1 ? "" : "s"} waiting, and ${togo} more bag${togo === 1 ? "" : "s"} or jar${togo === 1 ? "" : "s"} to the next one.`;
  }
  if (togo === 1) return "One more bag or jar for your first free one.";
  return `${togo} more bags or jars to your first free one.`;
}
