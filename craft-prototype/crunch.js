// Written by build.mjs from crunch.ts. Do not edit by hand.
const STORAGE_KEY = "hhp-sound";
let ctx = null;
let lastPlayedAt = 0;
const DEBOUNCE_MS = 180;
function soundIsOn(store = safeStorage()) {
  try {
    return store?.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}
function setSound(on, store = safeStorage()) {
  try {
    store?.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
  }
}
function safeStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
function crunch(now = Date.now()) {
  if (!soundIsOn()) return false;
  if (now - lastPlayedAt < DEBOUNCE_MS) return false;
  const audio = context();
  if (!audio) return false;
  lastPlayedAt = now;
  if (audio.state === "suspended") void audio.resume();
  render(audio, audio.currentTime);
  return true;
}
const DURATION = 0.16;
function render(audio, t) {
  const dur = DURATION;
  const frames = Math.ceil(audio.sampleRate * dur);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames * 0.25);
  }
  const source = audio.createBufferSource();
  source.buffer = buffer;
  const band = audio.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(2e3, t);
  band.Q.setValueAtTime(0.9, t);
  const roll = audio.createBiquadFilter();
  roll.type = "lowpass";
  roll.frequency.setValueAtTime(5200, t);
  const gain = audio.createGain();
  gain.gain.setValueAtTime(1e-4, t);
  gain.gain.exponentialRampToValueAtTime(0.16, t + 8e-3);
  gain.gain.exponentialRampToValueAtTime(1e-4, t + dur);
  source.connect(band).connect(roll).connect(gain).connect(audio.destination);
  source.start(t);
  source.stop(t + dur + 0.02);
}
function preview() {
  lastPlayedAt = 0;
  return crunch();
}
function context() {
  if (ctx) return ctx;
  try {
    const Ctor = typeof AudioContext !== "undefined" ? AudioContext : globalThis.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}
function reset() {
  lastPlayedAt = 0;
  ctx = null;
}
export {
  DEBOUNCE_MS,
  DURATION,
  STORAGE_KEY,
  crunch,
  preview,
  render,
  reset,
  setSound,
  soundIsOn
};
