// The Pour — the opening moment for Heaven's Harvest Pantry.
//
// A real glass jar on a warm counter. Granola falls into it, tumbles, settles,
// and goes still. Then the words arrive.
//
// This file used to be the whole scene. It is now only the *pour*: the room is
// in stage.js, the jar in jar.js, the clusters in granola.js, and every surface
// in textures.js. Nothing about how it looks changed when they were separated —
// that is checked by comparing the same frames before and after, pixel for
// pixel — but the counter can now be borrowed by everything that comes after
// this moment rather than rebuilt beside it.
//
//   import { createPour } from './pour.js';
//   const pour = createPour({ canvas, data, onFinish });
//   pour.dispose();

import { createStage, JAR_X } from './stage.js';
import { createJar } from './jar.js';
import { createGranola } from './granola.js';

export function createPour({ canvas, data, onFinish, reducedMotion = false }) {
  const stage = createStage({ canvas });

  const jar = createJar({ radius: data.jar.radius });
  jar.group.position.x = JAR_X;
  stage.scene.add(jar.group);

  const granola = createGranola({ data });
  stage.scene.add(granola.mesh);

  let start = null;
  let raf = 0;
  let finished = false;
  let disposed = false;

  function frame(now) {
    if (disposed) return;
    if (start === null) start = now;
    const t = (now - start) / 1000;
    granola.place(t);
    stage.draw();

    if (!finished && t >= data.duration) {
      finished = true;
      if (onFinish) onFinish();
    }
    // Nothing moves once the pile is at rest, so stop drawing and give the
    // phone back to the person holding it.
    if (t < data.duration + 0.35) raf = requestAnimationFrame(frame);
  }

  // On a narrow screen the words go underneath, so the jar comes back to the
  // middle and the pile comes with it.
  stage.onResize(({ jarX }) => {
    jar.group.position.x = jarX;
    granola.recentre(jarX);
    if (finished || reducedMotion) {
      granola.place(data.duration);
      stage.draw();
    }
  });
  stage.measure();

  if (reducedMotion) {
    // Someone has asked their device to keep still. Show them the jar already
    // full, in the same light, and skip the fall entirely.
    granola.place(data.duration);
    stage.draw();
    finished = true;
    if (onFinish) onFinish();
  } else {
    raf = requestAnimationFrame(frame);
  }

  return {
    get finished() { return finished; },

    /** The room this pour is standing in, for anything that comes after it. */
    stage,
    jar,
    granola,

    // Freeze the pour at a given second. Used to review individual beats while
    // designing, and by the screenshots that prove the scene has not moved.
    seek(t) {
      cancelAnimationFrame(raf);
      granola.place(t);
      stage.draw();
    },

    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      granola.dispose();
      jar.dispose();
      stage.dispose();
    },
  };
}
