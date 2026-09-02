// Written by build.mjs from porch.ts. Do not edit by hand.
const noPorch = { lit: null, note: "", flippedAt: null };
const TRUSTED_FOR_DAYS = 21;
const DAY = 864e5;
function porchState(porch, now = /* @__PURE__ */ new Date()) {
  if (porch.lit === null || !porch.flippedAt) {
    return { show: false, why: "never-set", daysOld: null };
  }
  const flipped = new Date(porch.flippedAt);
  if (Number.isNaN(flipped.getTime())) {
    return { show: false, why: "never-set", daysOld: null };
  }
  const daysOld = Math.max(0, Math.floor((now.getTime() - flipped.getTime()) / DAY));
  if (daysOld > TRUSTED_FOR_DAYS) {
    return { show: false, why: "stale", daysOld };
  }
  return { show: true, lit: porch.lit, note: porch.note.trim(), daysOld };
}
function defaultNote(lit) {
  return lit ? "Baking this week" : "Sold out this week";
}
function ownerStatus(porch, now = /* @__PURE__ */ new Date()) {
  const state = porchState(porch, now);
  if (!state.show) {
    return {
      tone: "off",
      headline: state.why === "never-set" ? "The light is off" : "The light has gone out",
      detail: state.why === "never-set" ? "Nobody is being told anything yet. Flip it and it appears at the top of every page." : `You last flipped it ${state.daysOld} days ago, so the site stopped saying it. Flip it again and it comes straight back.`
    };
  }
  const left = TRUSTED_FOR_DAYS - state.daysOld;
  return {
    tone: state.lit ? "lit" : "out",
    headline: state.lit ? "Your light is on" : "Your light is out",
    detail: left <= 5 ? `Everyone can see this. It goes away on its own in ${left} ${left === 1 ? "day" : "days"} unless you flip it.` : "Everyone can see this at the top of every page."
  };
}
function flip(porch, lit, note = porch.note, now = /* @__PURE__ */ new Date()) {
  return { lit, note: note.trim(), flippedAt: now.toISOString() };
}
export {
  TRUSTED_FOR_DAYS,
  defaultNote,
  flip,
  noPorch,
  ownerStatus,
  porchState
};
