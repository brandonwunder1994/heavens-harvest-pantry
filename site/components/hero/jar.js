// Her mason jar: glass, threads, label, and the pool of shade under it.
//
// Modelled to match the real one. It is on its own now because the same jar is
// the thing you turn in your hands on the menu, the thing that fills as you
// build a blend, and the thing that takes your name on its label — and all of
// those have to be the same jar, not three that nearly match.
//
// Lifted out of pour.js unchanged.

import * as THREE from 'three';
import { contactTexture, labelTexture } from './textures.js';

export function createJar({ radius, label = true }) {
  const group = new THREE.Group();

  const WALL = 0.035;
  const outer = radius + WALL;
  const NECK = outer * 0.64;

  const glass = new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transmission: 1,
    thickness: 0.10,
    roughness: 0.028,
    metalness: 0,
    ior: 1.5,
    clearcoat: 0.18,
    clearcoatRoughness: 0.06,
    envMapIntensity: 0.95,
    attenuationColor: new THREE.Color('#d8e6d4'),   // the faint green of jar glass
    attenuationDistance: 1.6,
    transparent: true,
    side: THREE.FrontSide,
  });

  // Profile of a squat mason jar, drawn bottom to top and spun on the lathe.
  const profile = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(outer - 0.07, 0.0),
    new THREE.Vector2(outer, 0.07),
    new THREE.Vector2(outer, 1.06),
    new THREE.Vector2(outer - 0.02, 1.17),          // shoulder starts
    new THREE.Vector2(outer * 0.90, 1.28),
    new THREE.Vector2(NECK + 0.02, 1.38),
    new THREE.Vector2(NECK, 1.46),                  // neck
    new THREE.Vector2(NECK, 1.58),
    new THREE.Vector2(NECK - WALL, 1.58),
    new THREE.Vector2(NECK - WALL, 1.46),
    new THREE.Vector2(NECK - WALL + 0.02, 1.38),
    new THREE.Vector2(outer * 0.90 - WALL, 1.28),
    new THREE.Vector2(outer - WALL - 0.02, 1.17),
    new THREE.Vector2(outer - WALL, 1.06),
    new THREE.Vector2(outer - WALL, 0.065),
    new THREE.Vector2(0.0, 0.065),
  ];
  const glassGeo = new THREE.LatheGeometry(profile, 72);
  const glassMesh = new THREE.Mesh(glassGeo, glass);
  glassMesh.castShadow = true;
  group.add(glassMesh);

  // A soft dark pool right under the glass. A shadow map alone leaves the jar
  // looking like it is hovering a centimetre above the counter.
  const contactMap = contactTexture();
  const contactGeo = new THREE.PlaneGeometry(outer * 3.4, outer * 3.4);
  const contactMat = new THREE.MeshBasicMaterial({
    map: contactMap,
    transparent: true,
    depthWrite: false,
    blending: THREE.MultiplyBlending,
    // Multiply blending expects colour already multiplied by alpha; without
    // this three logs a warning on every load and the pool darkens at the
    // edges where the texture fades out.
    premultipliedAlpha: true,
  });
  const contact = new THREE.Mesh(contactGeo, contactMat);
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.004;
  contact.renderOrder = -1;
  group.add(contact);

  // The threads on the neck: three shallow rings.
  const threadMat = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 0.9, thickness: 0.08,
    roughness: 0.12, ior: 1.5, transparent: true,
  });
  const threadGeo = new THREE.TorusGeometry(NECK + 0.008, 0.013, 8, 48);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(threadGeo, threadMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.44 + i * 0.045;
    group.add(ring);
  }

  // The label, wrapped around the front of the glass. The jar on the menu turns
  // in your hands and carries a sleeve with two panels instead, so it asks for
  // no label here and adds its own.
  const labelMap = label ? labelTexture() : null;
  const labelGeo = labelMap
    ? new THREE.CylinderGeometry(outer + 0.004, outer + 0.004, 0.58, 48, 1, true, -0.85, 1.7)
    : null;
  const labelMat = labelMap
    ? new THREE.MeshStandardMaterial({
        map: labelMap,
        transparent: true,
        roughness: 0.92,
        metalness: 0,
        side: THREE.DoubleSide,
      })
    : null;
  const paper = labelGeo ? new THREE.Mesh(labelGeo, labelMat) : null;
  if (paper) {
    paper.position.y = 0.56;
    group.add(paper);
  }

  return {
    group,
    outer,
    neck: NECK,
    label: paper,

    dispose() {
      glassGeo.dispose();
      glass.dispose();
      contactGeo.dispose();
      contactMat.dispose();
      contactMap.dispose();
      threadGeo.dispose();
      threadMat.dispose();
      labelGeo?.dispose();
      labelMat?.dispose();
      labelMap?.dispose();
    },
  };
}
