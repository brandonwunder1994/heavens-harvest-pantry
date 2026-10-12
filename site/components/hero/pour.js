// The Pour — the opening moment for Heaven's Harvest Pantry.
//
// A real glass jar on a warm counter. Granola falls into it, tumbles, settles,
// and goes still. Then the words arrive.
//
// This file used to be the whole scene. It is now only the *pour*: the room is
// in stage.js, the jar in jar.js, the clusters in granola.js, the warmth in
// steam.js, the mess on the counter in crumbs.js, and every surface in
// textures.js. Nothing about how it looks changed when they were separated —
// that is checked by comparing the same frames before and after, pixel for
// pixel — but the counter can now be borrowed by everything that comes after
// this moment rather than rebuilt beside it.
//
//   import { createPour } from './pour.js';
//   const pour = createPour({ canvas, data, onFinish });
//   pour.stage.setHour('evening');
//   pour.dispose();

import * as THREE from 'three';
import { createStage, JAR_X } from './stage.js';
import { createJar } from './jar.js';
import { createGranola } from './granola.js';
import { createSteam } from './steam.js';
import { createCrumbs } from './crumbs.js';

export function createPour({ canvas, data, onFinish = undefined, reducedMotion = false }) {
  const stage = createStage({ canvas });

  const jar = createJar({ radius: data.jar.radius });
  jar.group.position.x = JAR_X;
  stage.scene.add(jar.group);

  const granola = createGranola({ data });
  stage.scene.add(granola.mesh);

  const crumbs = createCrumbs({
    data,
    geometry: granola.geometry,
    material: granola.material,
    jarX: JAR_X,
  });
  stage.scene.add(crumbs.mesh);

  const steam = createSteam({ data, jarX: JAR_X });
  stage.scene.add(steam.mesh);

  // The scene keeps drawing until the granola is at rest *and* the last of the
  // warmth has gone, whichever is later.
  const tail = Math.max(data.duration + 0.35, steam.lastMoment);

  let start = null;
  let last = null;
  let raf = 0;
  let finished = false;
  let disposed = false;
  /** The moment the scene is currently showing, so it can be painted again. */
  let showing = 0;

  function frame(now) {
    if (disposed) return;
    if (start === null) start = now;
    const t = (now - start) / 1000;
    const dt = last === null ? 0 : (now - last) / 1000;
    last = now;

    showing = t;
    granola.place(t);
    steam.place(t, stage.camera);
    const scattering = crumbs.step(dt);
    stage.draw();

    if (!finished && t >= data.duration) {
      finished = true;
      if (onFinish) onFinish();
    }
    // Nothing moves once the pile is at rest and the crumbs are back where they
    // were, so stop drawing and give the phone back to the person holding it.
    if (t < tail || scattering) raf = requestAnimationFrame(frame);
    else raf = 0;
  }

  /** Ask for frames again after the scene has gone quiet. */
  function wake() {
    if (raf || disposed) return;
    // A fresh clock, or the first step after ten idle minutes would be a lurch.
    last = null;
    raf = requestAnimationFrame(frame);
  }

  // --- the cursor on the counter ---------------------------------------------
  // The words sit over the scene, so the whole hero listens rather than the
  // canvas alone: a crumb should still move when the cursor passes above the
  // headline that happens to be in front of it.
  const surface = canvas.parentElement || canvas;
  const ray = new THREE.Raycaster();
  const aim = new THREE.Vector2();
  const counter = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const where = new THREE.Vector3();

  function onPointerMove(event) {
    if (disposed || reducedMotion) return;
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return;
    aim.x = ((event.clientX - box.left) / box.width) * 2 - 1;
    aim.y = -((event.clientY - box.top) / box.height) * 2 + 1;
    ray.setFromCamera(aim, stage.camera);
    if (!ray.ray.intersectPlane(counter, where)) return;
    if (crumbs.shove(where.x, where.z)) wake();
  }

  if (!reducedMotion) {
    surface.addEventListener('pointermove', onPointerMove, { passive: true });
  }

  // On a narrow screen the words go underneath, so the jar comes back to the
  // middle and everything on the counter comes with it.
  //
  // Resizing throws away what the card was holding, so whatever moment the
  // scene is showing has to be painted again straight away. Without this the
  // hero goes blank the instant the fonts land and the headline changes the
  // height of the box — which is to say, on a first visit and no other.
  stage.onResize(({ jarX }) => {
    jar.group.position.x = jarX;
    granola.recentre(jarX);
    crumbs.recentre(jarX);
    steam.recentre(jarX);
    granola.place(showing);
    steam.place(showing, stage.camera);
    stage.draw();
  });
  stage.measure();

  if (reducedMotion) {
    // Someone has asked their device to keep still. Show them the jar already
    // full, in the same light, and skip the fall entirely.
    showing = steam.lastMoment;
    granola.place(data.duration);
    steam.place(showing, stage.camera);
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
    crumbs,
    steam,

    // Freeze the pour at a given second. Used to review individual beats while
    // designing, and by the screenshots that prove the scene has not moved.
    seek(t) {
      cancelAnimationFrame(raf);
      raf = 0;
      showing = t;
      granola.place(t);
      steam.place(t, stage.camera);
      stage.draw();
    },

    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      surface.removeEventListener('pointermove', onPointerMove);
      steam.dispose();
      crumbs.dispose();
      granola.dispose();
      jar.dispose();
      stage.dispose();
    },
  };
}
