// The jar you can pick up.
//
// The same glass, the same counter and the same light as the pour — this is
// what the engine was opened up for. What is new is that it turns: the flavour
// is on the front, and what is actually in it is on the back, which is where it
// is on a real jar and why turning it over is how you read it.
//
//   const turn = createTurn({ canvas, data, flavor, look });
//   turn.setFlavor(flavor, look);
//   turn.dispose();

import { createStage } from './stage.js';
import { createJar } from './jar.js';
import { createGranola } from './granola.js';
import { createWrap } from './wrap.js';

const TAU = Math.PI * 2;
const FRICTION = 2.4;        // how quickly a spin runs out
const SETTLE = 9;            // how quickly it closes the last of the distance
const SLOW = 1.2;            // the speed at which it starts looking for a face
const CREEP = 0.0022;        // below this it has stopped

export function createTurn({ canvas, data, flavor, look, hour }) {
  const stage = createStage({ canvas, framing: 'jar' });
  if (hour) stage.setHour(hour);

  const jar = createJar({ radius: data.jar.radius, label: false });
  const wrap = createWrap({ radius: jar.outer, flavor });
  jar.group.add(wrap.mesh);
  stage.scene.add(jar.group);

  // The granola rides inside the jar, so it turns with it rather than sitting
  // still while the glass goes round it.
  const granola = createGranola({ data, look });
  granola.recentre(0);
  granola.place(data.duration);
  jar.group.add(granola.mesh);

  let angle = 0;
  let spin = 0;
  /**
   * Where it is being taken, or null while it is simply spinning.
   *
   * A jar has two faces worth looking at, and it should always end up on one of
   * them. Nudging it with a push and hoping was not enough: a push that runs
   * out halfway is pulled back to the face it came from, so "turn it round"
   * would show you the back for a moment and then think better of it. Asking
   * for a destination and easing into it always arrives.
   */
  let goal = null;
  let dragging = false;
  let grabbed = 0;
  let moved = 0;
  let raf = 0;
  let last = 0;
  let disposed = false;

  function paint() {
    jar.group.rotation.y = angle;
    stage.draw();
  }

  function step(now) {
    if (disposed) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;

    if (!dragging) {
      if (goal === null) {
        angle += spin * dt;
        spin -= spin * Math.min(1, FRICTION * dt);
        // Slow enough to be aiming at something: take the nearer face.
        if (Math.abs(spin) < SLOW) {
          goal = Math.round(angle / Math.PI) * Math.PI;
          spin = 0;
        }
      } else {
        // A fixed fraction of what is left, every second, so it always arrives
        // and never overshoots.
        angle += (goal - angle) * (1 - Math.exp(-SETTLE * dt));
        if (Math.abs(goal - angle) < 0.002) {
          // Wound back inside one turn, so a jar somebody has spun for a while
          // is in the same state as one nobody has touched.
          angle = ((goal % TAU) + TAU) % TAU;
          goal = null;
        }
      }
    }

    paint();

    const busy = dragging || goal !== null || Math.abs(spin) > CREEP;
    raf = busy ? requestAnimationFrame(step) : 0;
    if (!busy) last = 0;
  }

  function wake() {
    if (raf || disposed) return;
    last = 0;
    raf = requestAnimationFrame(step);
  }

  // --- turning it ------------------------------------------------------------
  function onDown(event) {
    if (disposed) return;
    dragging = true;
    moved = 0;
    grabbed = event.clientX;
    spin = 0;
    goal = null;
    canvas.setPointerCapture?.(event.pointerId);
    wake();
  }

  function onMove(event) {
    if (!dragging || disposed) return;
    const dx = event.clientX - grabbed;
    grabbed = event.clientX;
    moved += Math.abs(dx);
    // A full turn is about one and a half widths of the jar, which is roughly
    // how far your thumb travels turning a real one.
    const by = (dx / Math.max(1, canvas.clientWidth)) * TAU * 1.5;
    angle += by;
    spin = by * 26;
    paint();
  }

  function onUp(event) {
    if (!dragging) return;
    dragging = false;
    canvas.releasePointerCapture?.(event.pointerId);
    // A tap rather than a drag: show the other side, which is what a tap on a
    // jar in a shop means.
    if (moved < 6) turnBy(Math.PI);
    wake();
  }

  /** Take it round by this much, from wherever it is heading. */
  function turnBy(radians) {
    goal = (goal ?? Math.round(angle / Math.PI) * Math.PI) + radians;
    spin = 0;
    wake();
  }

  function onKey(event) {
    const by = event.key === 'ArrowRight' ? -1 : event.key === 'ArrowLeft' ? 1 : 0;
    if (!by) return;
    event.preventDefault();
    turnBy(by * Math.PI);
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('keydown', onKey);

  stage.onResize(() => {
    granola.recentre(0);
    granola.place(data.duration);
    paint();
  });
  stage.measure();

  return {
    stage,
    jar,
    granola,
    get angle() { return angle; },
    /** Roughly which way it is facing, for anything that wants to say so. */
    get facing() {
      const turn = ((angle % TAU) + TAU) % TAU;
      return turn < Math.PI / 2 || turn > (3 * Math.PI) / 2 ? 'front' : 'back';
    },

    /** Turn it, from a button rather than a thumb. */
    turn(radians = Math.PI) {
      turnBy(radians);
    },

    /** The jar is now this flavour: new label, new granola. */
    setFlavor(next, nextLook) {
      wrap.setFlavor(next);
      if (nextLook) granola.setLook(nextLook);
      paint();
    },

    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('keydown', onKey);
      wrap.dispose();
      granola.dispose();
      jar.dispose();
      stage.dispose();
    },
  };
}
