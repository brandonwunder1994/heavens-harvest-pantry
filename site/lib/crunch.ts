// One sound, once.
//
// A soft crunch when something goes into the basket. Nothing else on this site
// makes a sound. On unless somebody has switched it off.
//
// The crunch is built in the browser rather than downloaded: a short burst of
// filtered noise with a fast attack and a quick decay, which is what a dry,
// brittle thing breaking actually is. That means no audio file to fetch, no
// licence to buy, and no eighty kilobytes spent on a fifth of a second.
//
// Three rules it keeps, and they are the difference between charming and the
// reason somebody closes a tab:
//
//   1. On by default. It only ever fires on a click into the basket, so a first
//      visit is still quiet until somebody adds something.
//   2. The choice is remembered, and it is remembered per person, not per page.
//   3. It never plays twice on top of itself, and never more than once for one
//      action, however many times a button is pressed.

export const STORAGE_KEY = "hhp-sound";

type Ctx = AudioContext & { state: AudioContextState };

let ctx: Ctx | null = null;
let lastPlayedAt = 0;

/** Two crunches inside this many milliseconds are one crunch. */
export const DEBOUNCE_MS = 180;

/** Whether sound is on. On unless somebody has explicitly said otherwise. */
export function soundIsOn(store: Pick<Storage, "getItem"> | null = safeStorage()): boolean {
  try {
    return store?.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

/** Remember the choice. Silently does nothing where storage is unavailable. */
export function setSound(on: boolean, store: Pick<Storage, "setItem"> | null = safeStorage()): void {
  try {
    store?.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // A private window, or storage switched off. The switch still works for
    // this visit; it just will not be remembered, which is the right failure.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * The crunch itself.
 *
 * Returns false when nothing was played and says nothing about why: sound off,
 * too soon after the last one, or no audio on this device are all the same
 * answer to the caller, which is "carry on".
 */
export function crunch(now: number = Date.now()): boolean {
  if (!soundIsOn()) return false;
  if (now - lastPlayedAt < DEBOUNCE_MS) return false;

  const audio = context();
  if (!audio) return false;

  lastPlayedAt = now;

  // A browser will not make a sound until somebody has interacted with the
  // page. Since this only ever fires on a click, resuming here is safe.
  if (audio.state === "suspended") void audio.resume();

  render(audio, audio.currentTime);
  return true;
}

/** How long one crunch lasts, in seconds. */
export const DURATION = 0.16;

/**
 * Builds the crunch into whatever audio context it is handed, starting at `t`.
 *
 * Separated out so it can be rendered offline and looked at: a sound nobody can
 * inspect is a sound nobody can prove works.
 */
export function render(audio: BaseAudioContext, t: number): void {
  const dur = DURATION;

  // Noise: the raw material of anything breaking.
  const frames = Math.ceil(audio.sampleRate * dur);
  const buffer = audio.createBuffer(1, frames, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) {
    // Slightly correlated noise rather than white: less hiss, more grain.
    data[i] = (Math.random() * 2 - 1) * (1 - (i / frames) * 0.25);
  }

  const source = audio.createBufferSource();
  source.buffer = buffer;

  // Bandpass around two kilohertz: the register a dry cluster actually breaks
  // in. Wider than this is a hiss, narrower is a beep.
  const band = audio.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.setValueAtTime(2000, t);
  band.Q.setValueAtTime(0.9, t);

  // Roll the top off, so it is a crunch in a kitchen rather than static.
  const roll = audio.createBiquadFilter();
  roll.type = "lowpass";
  roll.frequency.setValueAtTime(5200, t);

  // The shape: almost no attack, then gone. That shape is the whole illusion.
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.16, t + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  source.connect(band).connect(roll).connect(gain).connect(audio.destination);
  source.start(t);
  source.stop(t + dur + 0.02);
}

/** For a switch that should let somebody hear what they just turned on. */
export function preview(): boolean {
  lastPlayedAt = 0;
  return crunch();
}

function context(): Ctx | null {
  if (ctx) return ctx;
  try {
    const Ctor =
      typeof AudioContext !== "undefined"
        ? AudioContext
        : (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor() as Ctx;
    return ctx;
  } catch {
    return null;
  }
}

/** Only for tests: forgets the debounce and the audio context. */
export function reset(): void {
  lastPlayedAt = 0;
  ctx = null;
}
