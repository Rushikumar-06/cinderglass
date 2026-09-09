'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { stage, damp } from '@/lib/stage';

/**
 * One key per chapter. The camera lerps between adjacent keys on the same
 * `phase` value that drives the particle formations, so framing and form
 * always arrive together.
 */
type Key = { pos: [number, number, number]; look: [number, number, number]; fov: number };

const KEYS: Key[] = [
  { pos: [0, 0.15, 5.7], look: [0, 0, 0], fov: 42 },          // 00 ignition — close
  { pos: [2.9, 1.35, 7.6], look: [0, 0, 0], fov: 46 },        // 01 fracture — pull back, off-axis
  { pos: [-3.9, 0.55, 6.0], look: [0.7, -0.1, 0], fov: 52 },  // 02 drift — wide, low
  { pos: [0.2, -1.85, 6.9], look: [0, 0.85, 0], fov: 44 },    // 03 anneal — looking up at the slab
  { pos: [0, 1.6, 11.0], look: [0, 1.4, 0], fov: 40 },        // 04 residue — far, rising
];

export function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const scratch = useMemo(
    () => ({
      pos: new THREE.Vector3(...KEYS[0].pos),
      look: new THREE.Vector3(...KEYS[0].look),
      posA: new THREE.Vector3(),
      lookA: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
    }),
    [],
  );
  const fov = useRef(KEYS[0].fov);

  useFrame((state, dt) => {
    const step = Math.min(dt, 0.1);
    const t = state.clock.elapsedTime;

    const phase = Math.min(Math.max(stage.phase, 0), KEYS.length - 1.0001);
    const i = Math.floor(phase);
    const f = phase - i;
    const e = f * f * (3 - 2 * f);
    const k0 = KEYS[i];
    const k1 = KEYS[Math.min(i + 1, KEYS.length - 1)];

    scratch.posA.set(...k0.pos).lerp(scratch.tmp.set(...k1.pos), e);
    scratch.lookA.set(...k0.look).lerp(scratch.tmp.set(...k1.look), e);

    // A portrait viewport crops the horizontal field badly — the same framing
    // that reads as a body on a laptop fills the whole screen on a phone. Back
    // the camera off along its own view vector to compensate.
    const aspect = state.size.width / Math.max(1, state.size.height);
    if (aspect < 1) {
      const fit = 1 + (1 - aspect) * 1.35;
      scratch.posA.sub(scratch.lookA).multiplyScalar(fit).add(scratch.lookA);
    }

    // The Kiln: one full revolution around the shattered field as the
    // specimens go past. The orbit resolves to exactly 2π, so the framing is
    // handed back to the keyframes unchanged.
    if (stage.orbit > 0.0005 && stage.orbit < 0.9995) {
      const a = stage.orbit * Math.PI * 2;
      scratch.tmp.copy(scratch.posA).sub(scratch.lookA);
      const x = scratch.tmp.x * Math.cos(a) - scratch.tmp.z * Math.sin(a);
      const z = scratch.tmp.x * Math.sin(a) + scratch.tmp.z * Math.cos(a);
      scratch.tmp.x = x;
      scratch.tmp.z = z;
      // Dip low through the middle of the turn, then climb back out.
      scratch.tmp.y -= Math.sin(stage.orbit * Math.PI) * 1.6;
      scratch.tmp.multiplyScalar(1 - Math.sin(stage.orbit * Math.PI) * 0.18);
      scratch.posA.copy(scratch.lookA).add(scratch.tmp);
    }

    // Parallax, and a slow float so a motionless page is never truly still.
    if (!stage.reducedMotion) {
      scratch.posA.x += stage.pointer.x * 0.85 + Math.sin(t * 0.13) * 0.1;
      scratch.posA.y += stage.pointer.y * 0.5 + Math.cos(t * 0.17) * 0.08;
    }
    // Entry: settle in from further out.
    scratch.posA.z += (1 - stage.entered) * 6;

    scratch.pos.lerp(scratch.posA, 1 - Math.exp(-3.4 * step));
    scratch.look.lerp(scratch.lookA, 1 - Math.exp(-2.6 * step));

    camera.position.copy(scratch.pos);
    // Scrolling hard shakes the rig — a high-frequency wobble that scales with
    // the square of velocity so an ordinary scroll never triggers it.
    if (!stage.reducedMotion) {
      const shake = stage.velocity * stage.velocity * 0.11;
      camera.position.x += Math.sin(t * 43.0) * shake;
      camera.position.y += Math.cos(t * 31.0) * shake * 0.7;
    }
    camera.lookAt(scratch.look);
    // A hair of roll keeps the horizon from feeling mechanically level.
    if (!stage.reducedMotion) {
      camera.rotation.z += Math.sin(t * 0.09) * 0.012 - stage.pointer.x * 0.012;
    }

    const targetFov = k0.fov + (k1.fov - k0.fov) * e + Math.abs(stage.velocity) * 3.5;
    fov.current = damp(fov.current, targetFov, 3, step);
    if (Math.abs(camera.fov - fov.current) > 0.001) {
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
