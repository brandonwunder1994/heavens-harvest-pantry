// Her label, all the way round the jar.
//
// The hero's label is one panel on the front, because the hero's jar never
// turns. This one has two: the name on the front, and what is actually in it on
// the back — which is where it is on a real jar, and why turning it over is how
// you read it.
//
// Everything on it is hers. Rename a flavour or change its allergens on her own
// page and the label is redrawn from that; there is no second copy of the words
// anywhere in here.

import * as THREE from 'three';
import { canvasTexture } from './textures.js';

const W = 2048;
const H = 640;

/** The paper, the dashed rule and the gold heart, shared by both panels. */
function panel(g, x, wide) {
  const pad = 26;
  g.fillStyle = '#f4eee2';
  g.fillRect(x + pad, pad, wide - pad * 2, H - pad * 2);
  g.strokeStyle = '#a9b18a';
  g.lineWidth = 3;
  g.setLineDash([9, 9]);
  g.strokeRect(x + pad + 20, pad + 20, wide - pad * 2 - 40, H - pad * 2 - 40);
  g.setLineDash([]);
}

function heart(g, cx, cy, s) {
  g.fillStyle = '#c9a06a';
  g.beginPath();
  g.moveTo(cx, cy + s * 0.9);
  g.bezierCurveTo(cx - s * 1.5, cy - s * 0.2, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.3);
  g.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.2, cx, cy + s * 0.9);
  g.fill();
}

/** Break `text` to `wide` pixels and draw it, returning where the next line goes. */
function paragraph(g, text, x, y, wide, step) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  let line = '';
  let at = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (g.measureText(next).width > wide && line) {
      g.fillText(line, x, at);
      at += step;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) {
    g.fillText(line, x, at);
    at += step;
  }
  return at;
}

/** Shrink the flavour name until it fits, because some of hers are long. */
function fitted(g, text, wide, start) {
  let size = start;
  for (;;) {
    g.font = `italic ${size}px Georgia, serif`;
    if (g.measureText(text).width <= wide || size <= 26) return size;
    size -= 2;
  }
}

/**
 * @param {object} o
 * @param {string} o.name         the flavour, as she wrote it
 * @param {string} o.ingredients
 * @param {string} o.allergens
 * @param {string} [o.forWhom]     a name somebody asked to have on the glass
 */
export function wrapTexture({ name, ingredients, allergens, forWhom = '' }) {
  return canvasTexture(W, H, (g) => {
    g.clearRect(0, 0, W, H);

    // The wrap runs right round the jar with bare glass between the panels.
    // three starts a cylinder's texture facing +Z, which is the camera — so the
    // seam is the FRONT, and the back panel is the one at half a turn.
    const wide = W * 0.36;
    const front = W - wide / 2;         // straddles the seam, facing you
    const back = W * 0.5 - wide / 2;

    // ---------------------------------------------------------------- front
    // Drawn twice, half a canvas apart, so the panel that straddles the seam
    // is whole from either side of it.
    for (const shift of [-W / 2, W / 2]) {
      g.save();
      g.translate(shift, 0);
      const mid = front - W / 2 + wide / 2;
      panel(g, front - W / 2, wide);
      g.textAlign = 'center';
      g.fillStyle = '#5b3d1e';
      g.font = '600 62px Georgia, serif';
      g.fillText("HEAVEN'S", mid, 190);
      g.fillText('HARVEST', mid, 258);
      g.fillStyle = '#6b7a4a';
      fitted(g, name || 'Granola', wide - 150, 50);
      g.fillText(name || 'Granola', mid, 350);
      heart(g, mid, 430, 26);

      // A name goes where the kitchen line usually is, in her own hand, so a
      // jar with somebody's name on it looks made for them rather than
      // stickered afterwards.
      if (forWhom) {
        g.fillStyle = '#8a5f2e';
        fitted(g, `for ${forWhom}`, wide - 200, 40);
        g.fillText(`for ${forWhom}`, mid, 522);
      } else {
        g.fillStyle = '#8a7a5c';
        g.font = '600 22px Georgia, serif';
        g.fillText('BAKED IN A HOME KITCHEN', mid, 520);
      }
      g.restore();
    }

    // ----------------------------------------------------------------- back
    {
      panel(g, back, wide);
      const left = back + 78;
      const room = wide - 156;

      g.textAlign = 'left';
      g.fillStyle = '#8a7a5c';
      g.font = '600 24px Georgia, serif';
      g.fillText('INGREDIENTS', left, 140);

      g.fillStyle = '#4a3520';
      g.font = '28px Georgia, serif';
      const afterIngredients = paragraph(g, ingredients, left, 186, room, 38);

      g.fillStyle = '#8a7a5c';
      g.font = '600 24px Georgia, serif';
      g.fillText('ALLERGENS', left, afterIngredients + 42);

      g.fillStyle = '#4a3520';
      g.font = '28px Georgia, serif';
      paragraph(g, allergens, left, afterIngredients + 88, room, 38);
    }
  });
}

/**
 * The label as a sleeve all the way round the jar, rather than the hero's
 * single panel. The mesh is returned on its own so the jar can turn with it.
 */
export function createWrap({ radius, flavor, forWhom = '' }) {
  const map = wrapTexture({ ...flavor, forWhom });
  const geometry = new THREE.CylinderGeometry(radius + 0.004, radius + 0.004, 0.72, 96, 1, true);
  const material = new THREE.MeshStandardMaterial({
    map,
    transparent: true,
    roughness: 0.92,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.6;

  return {
    mesh,

    /** Redraw for a different flavour or a different name on the glass. */
    setFlavor(next, nextName) {
      const fresh = wrapTexture({ ...next, forWhom: nextName });
      material.map?.dispose();
      material.map = fresh;
      material.needsUpdate = true;
    },

    dispose() {
      geometry.dispose();
      material.map?.dispose();
      material.dispose();
    },
  };
}
