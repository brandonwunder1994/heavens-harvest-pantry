// Every surface in the scene, drawn in code.
//
// Not one of these is fetched: the oak of the counter, the paper of the label,
// the speckle on a cluster and the light of the room are all painted into a
// canvas here and handed to the renderer. It is why the whole scene weighs less
// than one photograph of it would.
//
// Lifted out of pour.js unchanged, so the jar looks exactly as it always has.

import * as THREE from 'three';
import { mulberry32 } from './random.js';

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function woodTexture() {
  const tex = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#87643c';
    g.fillRect(0, 0, w, h);
    // planks
    for (let y = 0; y < h; y += 84) {
      g.fillStyle = 'rgba(58,33,12,0.45)';
      g.fillRect(0, y, w, 3);
      g.fillStyle = 'rgba(226,186,132,0.22)';
      g.fillRect(0, y + 3, w, 2);
    }
    // grain
    const rnd = mulberry32(9182);
    for (let i = 0; i < 1600; i++) {
      const y = rnd() * h;
      const x = rnd() * w;
      const len = 28 + rnd() * 140;
      g.strokeStyle = `rgba(${rnd() < 0.5 ? '86,52,20' : '214,176,124'},${0.05 + rnd() * 0.13})`;
      g.lineWidth = 0.6 + rnd() * 1.4;
      g.beginPath();
      g.moveTo(x, y);
      g.bezierCurveTo(x + len * 0.35, y + (rnd() - 0.5) * 4, x + len * 0.7, y + (rnd() - 0.5) * 4, x + len, y);
      g.stroke();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 5);
  return tex;
}

export function labelTexture() {
  return canvasTexture(1024, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // the paper
    const pad = 40;
    g.fillStyle = '#f4eee2';
    g.fillRect(pad, pad, w - pad * 2, h - pad * 2);
    g.strokeStyle = '#a9b18a';
    g.lineWidth = 3;
    g.setLineDash([9, 9]);
    g.strokeRect(pad + 22, pad + 22, w - pad * 2 - 44, h - pad * 2 - 44);
    g.setLineDash([]);

    g.textAlign = 'center';
    g.fillStyle = '#5b3d1e';
    g.font = '600 54px Georgia, serif';
    g.fillText("HEAVEN'S", w / 2, 190);
    g.fillText('HARVEST', w / 2, 250);
    g.font = 'italic 44px Georgia, serif';
    g.fillStyle = '#6b7a4a';
    g.fillText('Honey Almond', w / 2, 330);

    // the gold heart from her logo
    g.fillStyle = '#c9a06a';
    g.beginPath();
    const cx = w / 2, cy = 382, s = 26;
    g.moveTo(cx, cy + s * 0.9);
    g.bezierCurveTo(cx - s * 1.5, cy - s * 0.2, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.3);
    g.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.2, cx, cy + s * 0.9);
    g.fill();
  });
}

export function oatTexture() {
  // Flecks of oat, seed and salt scattered over each cluster. Multiplied by the
  // instance colour, so it adds surface without touching the shade.
  const tex = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#efe6d6';
    g.fillRect(0, 0, w, h);
    const rnd = mulberry32(6203);
    for (let i = 0; i < 900; i++) {
      const x = rnd() * w, y = rnd() * h;
      const r = 1.2 + rnd() * 4.2;
      const shade = rnd();
      g.fillStyle = shade < 0.42 ? 'rgba(120,84,44,0.5)'
                  : shade < 0.72 ? 'rgba(255,250,238,0.75)'
                  : shade < 0.9  ? 'rgba(76,48,20,0.45)'
                                 : 'rgba(198,158,104,0.6)';
      g.beginPath();
      g.ellipse(x, y, r, r * (0.45 + rnd() * 0.6), rnd() * 3.14, 0, 6.283);
      g.fill();
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  return tex;
}

export function contactTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, w, h);
    const grad = g.createRadialGradient(w / 2, h / 2, w * 0.12, w / 2, h / 2, w * 0.46);
    grad.addColorStop(0, 'rgba(52,30,10,0.62)');
    grad.addColorStop(0.55, 'rgba(72,44,18,0.26)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

export function backdropTexture() {
  return canvasTexture(64, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#f6ead2');
    grad.addColorStop(0.55, '#e9d7b6');
    grad.addColorStop(1, '#d9c096');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

export function kitchenEnvironment() {
  // A stand-in for a captured kitchen: warm sky, a bright window to the left,
  // a wooden floor bounce below. Enough for the glass to have something to
  // refract until a real photographed environment is dropped in.
  const tex = canvasTexture(512, 256, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fff6e4');
    grad.addColorStop(0.48, '#f0e2c8');
    grad.addColorStop(0.52, '#c69a63');
    grad.addColorStop(1, '#8a6134');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);

    // the window
    g.fillStyle = '#fffdf6';
    g.fillRect(w * 0.16, h * 0.06, w * 0.2, h * 0.36);
    g.fillStyle = 'rgba(200,170,120,0.5)';
    g.fillRect(w * 0.255, h * 0.06, 6, h * 0.36);
    g.fillRect(w * 0.16, h * 0.23, w * 0.2, 6);

    // a softer second source opposite
    const soft = g.createRadialGradient(w * 0.72, h * 0.22, 10, w * 0.72, h * 0.22, w * 0.16);
    soft.addColorStop(0, 'rgba(255,246,226,0.85)');
    soft.addColorStop(1, 'rgba(255,246,226,0)');
    g.fillStyle = soft;
    g.fillRect(w * 0.5, 0, w * 0.5, h * 0.5);
  });
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}


/**
 * One puff of warm air, as a soft cloud with a hole in the middle of nowhere.
 *
 * A plain radial fade reads as a glowing ball. Steam is ragged, so the fade is
 * broken up by a handful of overlapping blobs before it is blurred back into
 * one shape. Drawn white; the scene tints it.
 */
export function steamTexture() {
  const tex = canvasTexture(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const rnd = mulberry32(4471);

    g.filter = 'blur(9px)';
    for (let i = 0; i < 9; i++) {
      const a = rnd() * Math.PI * 2;
      const d = rnd() * w * 0.17;
      const x = w / 2 + Math.cos(a) * d;
      const y = h / 2 + Math.sin(a) * d;
      const r = w * (0.13 + rnd() * 0.14);
      const blob = g.createRadialGradient(x, y, 0, x, y, r);
      blob.addColorStop(0, 'rgba(255,255,255,0.85)');
      blob.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = blob;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    g.filter = 'none';

    // Anything still alive at the very edge would show the square it was drawn
    // in, so the whole thing is closed off inside a circle.
    g.globalCompositeOperation = 'destination-in';
    const mask = g.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.5);
    mask.addColorStop(0, 'rgba(255,255,255,1)');
    mask.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = mask;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = 'source-over';
  });
  return tex;
}
