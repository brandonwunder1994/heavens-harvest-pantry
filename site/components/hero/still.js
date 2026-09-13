// Everything, without the graphics.
//
// This file decides — before the moving pour is asked for — whether this
// visitor gets the pour or the photograph of it. That order matters. A
// fallback that only appears after the download has already failed has cost
// the visitor the download.
//
// The photograph is the same scene, settled, with the lid on. Nobody seeing
// it is told they are missing anything, because they are not.

/**
 * Why this visitor should not be given the 3D, or null to go ahead with it.
 *
 * @returns {null | 'no-webgl' | 'reduced-motion' | 'save-data' | 'slow-network' | 'small-device'}
 */
export function stillReason(win = window) {
  // An override, for reviewing each case on a machine that has none of these
  // problems. The site never sets it; the screenshots do.
  const forced = new URLSearchParams(win.location.search).get('still');
  if (forced) return forced === '1' ? 'no-webgl' : forced;

  // Someone has asked their device to stop moving things. Honour it by not
  // downloading the moving thing, rather than by downloading it and holding
  // it still.
  if (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'reduced-motion';
  }

  const nav = win.navigator || {};

  // Data Saver is a person telling us they are paying for each megabyte.
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  if (conn) {
    if (conn.saveData === true) return 'save-data';
    if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') return 'slow-network';
  }

  // An old, small phone. These numbers are deliberately low: the test is
  // "will this device struggle", not "is this device new". Browsers that do
  // not report either one are given the benefit of the doubt.
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 2) return 'small-device';
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) return 'small-device';

  // Last, and cheapest to be wrong about: can it draw at all.
  try {
    const probe = win.document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return 'no-webgl';
  } catch {
    return 'no-webgl';
  }

  return null;
}

/**
 * Swap the still frame in. Loads one image, sized to the shape of the screen,
 * and reveals it only once it has actually decoded — so the page goes from the
 * blurred colour already in the stylesheet to the photograph, and never through
 * a white rectangle.
 *
 * Safe to call twice; the second call is ignored.
 */
export function showStill(el, { base = './still/', onReady } = {}) {
  if (!el || el.dataset.stillShown === 'yes') return;
  el.dataset.stillShown = 'yes';

  const tall = window.innerHeight > window.innerWidth;
  const img = new Image();
  img.decoding = 'async';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.className = 'still-photo';
  img.src = `${base}counter-${tall ? 'tall' : 'wide'}.webp`;

  const done = () => {
    img.classList.add('in');
    if (onReady) onReady();
  };

  el.appendChild(img);
  if (img.decode) img.decode().then(done, done);
  else img.onload = img.onerror = done;
}
