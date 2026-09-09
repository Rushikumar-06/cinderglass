'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLSL_COMMON } from '@/lib/shaders/common';
import { stage, damp, clamp } from '@/lib/stage';

/**
 * The whole piece is one point cloud.
 *
 * Rather than simulating on the GPU with ping-pong buffers, every particle's
 * position is *derived* each frame in the vertex shader from a stable seed:
 * five target formations are evaluated and cross-faded by `uPhase`, which the
 * scroll drives from 0 to 4. That keeps the system stateless — scrub backwards
 * and it retraces itself exactly — and costs one draw call.
 *
 * At most two formations carry weight at any moment, and `uPhase` is uniform
 * across the draw, so the branches below are wave-uniform and effectively free.
 */

const vertexShader = /* glsl */ `
${GLSL_COMMON}

uniform float uTime;
uniform float uPhase;
uniform float uCount;
uniform float uSize;
uniform float uDpr;
uniform float uOpacity;
uniform float uBurst;
uniform float uIgnite;
uniform vec3  uPointer;
uniform float uPush;
uniform float uPushRadius;

attribute float aIndex;
attribute float aRand;
attribute float aScale;

varying float vEnergy;
varying float vFade;

// Triangular cross-fade with smoothstep easing.
float wgt(float i, float phase) {
  float d = clamp(1.0 - abs(phase - i), 0.0, 1.0);
  return d * d * (3.0 - 2.0 * d);
}

// 00 — IGNITION. A corona hugging the body: dense at the surface, thinning
// outward. rad must be independent of the azimuth or the shell spirals.
vec3 targetCore(vec3 dir, float rad, float rnd, float t) {
  float r = 1.24 + pow(rad, 3.4) * 1.75;
  vec3 p = dir * r;
  p += flow(p * 1.15, t * 0.6) * 0.13;
  p *= 1.0 + 0.035 * sin(t * 0.9 + rnd * TAU);
  return p;
}

// 01 — FRACTURE. The shell quantised into plates, each thrown and tumbled
// along its own axis. Reads as a shattering rather than an explosion.
vec3 targetShatter(vec3 dir, float rnd, float t) {
  float pid = floor(snoise(dir * 1.55) * 4.0);
  float h = hash11(pid * 7.13 + 3.71);
  vec3 axis = normalize(hash31(pid * 3.77 + 1.31) * 2.0 - 1.0 + 0.001);
  float ang = (h - 0.5) * 2.1 + t * 0.06 * (h - 0.5);
  vec3 p = rotAxis(axis, ang) * (dir * 1.55);
  p += dir * (0.30 + h * 2.55);
  p += (vec3(rnd) - 0.5) * 0.18;
  return p;
}

// 02 — DRIFT. A wide, shallow field with no attractor left in it.
vec3 targetDrift(vec3 seed, float t) {
  vec3 p = vec3(seed.x * 8.4, seed.y * 2.5, seed.z * 8.4);
  p += flow(p * 0.21, t * 0.8) * 2.6;
  p.y += sin(p.x * 0.32 + t * 0.14) * 0.55;
  return p;
}

// 03 — ANNEAL. An orbiting annulus; inner radii run faster, as they should.
vec3 targetRing(vec3 seed, float rnd, float t) {
  float rr = 2.05 + pow(abs(seed.x), 1.6) * 1.45;
  float a = rnd * TAU + t * (0.62 / rr);
  float y = seed.y * 0.085 * (0.6 + (rr - 2.05) * 1.4);
  vec3 p = vec3(cos(a) * rr, y, sin(a) * rr);
  p += flow(p * 0.55 + rnd * 4.0, t * 0.4) * 0.075;
  return rotAxis(normalize(vec3(1.0, 0.0, 0.34)), -0.38) * p;
}

// 04 — RESIDUE. A rising column that widens and forgets itself near the top.
vec3 targetAsh(vec3 seed, float rnd, float t, out float fade) {
  float h = fract(rnd + t * 0.042);
  float y = -3.4 + h * 11.5;
  float spread = 0.62 + h * 3.6;
  vec3 p = vec3(seed.x * spread, y, seed.z * spread);
  p += flow(p * 0.30 + rnd * 12.0, t * 0.6) * (0.35 + h * 1.7);
  fade = smoothstep(0.0, 0.06, h) * (1.0 - smoothstep(0.55, 1.0, h));
  return p;
}

void main() {
  vec3 seed = position;
  float t = uTime;
  float phase = clamp(uPhase, 0.0, 3.9999);

  // Even latitude from the index, azimuth from the seed: uniform on the sphere
  // without ever hashing a large integer.
  float ct = 1.0 - 2.0 * ((aIndex + 0.5) / uCount);
  float st = sqrt(max(0.0, 1.0 - ct * ct));
  float az = aRand * TAU;
  vec3 dir = vec3(cos(az) * st, ct, sin(az) * st);

  // aRand is spent on the azimuth. Anything else that varies per particle has
  // to come from a different source, or it correlates with position and the
  // formations show seams.
  float rad = seed.x * 0.5 + 0.5;
  float rnd = fract(aRand * 7.31 + seed.z * 3.77 + 0.137);

  float w0 = wgt(0.0, phase);
  float w1 = wgt(1.0, phase);
  float w2 = wgt(2.0, phase);
  float w3 = wgt(3.0, phase);
  float w4 = wgt(4.0, phase);
  float wsum = max(w0 + w1 + w2 + w3 + w4, 0.0001);

  vec3 p = vec3(0.0);
  float fade = w0 + w1 + w2 + w3;

  if (w0 > 0.0005) p += targetCore(dir, rad, rnd, t) * w0;
  if (w1 > 0.0005) p += targetShatter(dir, rnd, t) * w1;
  if (w2 > 0.0005) p += targetDrift(seed, t) * w2;
  if (w3 > 0.0005) p += targetRing(seed, rnd, t) * w3;
  if (w4 > 0.0005) {
    float ashFade = 0.0;
    p += targetAsh(seed, rnd, t, ashFade) * w4;
    fade += w4 * ashFade;
  }
  p /= wsum;
  fade /= wsum;

  // Turbulence peaks mid-transition, so formations swirl into each other
  // instead of sliding along straight lines.
  float trans = sin(fract(phase) * PI);
  p += flow(p * 0.42 + seed * 3.0, t) * (0.45 * trans * trans + 0.045) * (1.0 + uBurst * 1.4);

  p = rotAxis(vec3(0.0, 1.0, 0.0), t * 0.028) * p;

  // Entry: the field falls in from far outside the frame.
  p = mix(seed * 34.0, p, uIgnite);

  // The hand in the field: embers part around the pointer and flare where it
  // passes. Applied in world space, after every formation and rotation.
  vec3 away = p - uPointer;
  float pd = length(away);
  float touch = (1.0 - smoothstep(0.0, uPushRadius, pd)) * uPush;
  float push = touch * touch;
  p += (away / max(pd, 0.05)) * push * 1.45;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;

  float ps = uSize * aScale * uDpr * 30.0 / max(-mv.z, 0.4);
  // Sub-pixel points alias badly; dim them instead of letting them flicker.
  float subPixel = smoothstep(0.0, 1.0, ps);
  gl_PointSize = max(ps, 1.0);

  float dist = length(p);
  float heat = 1.0 / (0.52 + dist * 0.44);
  float cooling = mix(1.28, 0.76, phase / 4.0);
  vEnergy = clamp(heat * (0.30 + rnd * 0.62) * cooling + uBurst * 0.22 + touch * 0.5, 0.0, 1.25);
  vFade = fade * subPixel * uOpacity * uIgnite;
}
`;

const fragmentShader = /* glsl */ `
precision highp float;

varying float vEnergy;
varying float vFade;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = dot(uv, uv);
  if (d > 0.25) discard;

  float a = 1.0 - smoothstep(0.0, 0.25, d);
  a = pow(a, 1.9);

  // Linear-light palette: the composer converts to sRGB at the end.
  vec3 cold  = vec3(0.075, 0.008, 0.004);
  vec3 ember = vec3(1.000, 0.105, 0.018);
  vec3 gold  = vec3(1.000, 0.430, 0.070);
  vec3 bone  = vec3(1.000, 0.870, 0.680);

  float e = clamp(vEnergy, 0.0, 1.25);
  vec3 col = mix(cold, ember, smoothstep(0.00, 0.38, e));
  col = mix(col, gold, smoothstep(0.46, 0.86, e));
  col = mix(col, bone, smoothstep(0.95, 1.22, e));

  gl_FragColor = vec4(col * (0.16 + e * 0.92), a * vFade);
}
`;

export function EmberField({ count, size = 0.34 }: { count: number; size?: number }) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const burst = useRef(0);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const seed = new Float32Array(count * 3);
    const index = new Float32Array(count);
    const rand = new Float32Array(count);
    const scale = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      seed[i * 3 + 0] = Math.random() * 2 - 1;
      seed[i * 3 + 1] = Math.random() * 2 - 1;
      seed[i * 3 + 2] = Math.random() * 2 - 1;
      index[i] = i;
      rand[i] = Math.random();
      // Heavily biased small, with a long tail of bright motes.
      scale[i] = 0.42 + Math.pow(Math.random(), 4.5) * 2.6;
    }

    g.setAttribute('position', new THREE.BufferAttribute(seed, 3));
    g.setAttribute('aIndex', new THREE.BufferAttribute(index, 1));
    g.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    g.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 48);
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uCount: { value: count },
      uSize: { value: size },
      uDpr: { value: 1 },
      uOpacity: { value: 1 },
      uBurst: { value: 0 },
      uIgnite: { value: 0 },
      uPointer: { value: new THREE.Vector3(0, 0, 0) },
      uPush: { value: 0 },
      uPushRadius: { value: 1.15 },
    }),
    [count, size],
  );

  // Pointer -> world: cast through the pointer onto a plane that faces the
  // camera and passes through the scene origin.
  const ray = useMemo(
    () => ({
      caster: new THREE.Raycaster(),
      ndc: new THREE.Vector2(),
      dir: new THREE.Vector3(),
      plane: new THREE.Plane(),
      hit: new THREE.Vector3(),
      origin: new THREE.Vector3(),
      last: new THREE.Vector2(),
      push: 0,
    }),
    [],
  );

  // Read the uniforms back off the material: react-three-fiber clones the
  // `uniforms` prop when it applies it, so the object passed in above is not
  // the one the GPU sees.
  useFrame((state, dt) => {
    const u = matRef.current?.uniforms;
    if (!u) return;
    const step = Math.min(dt, 0.1);
    u.uTime.value = state.clock.elapsedTime;
    u.uPhase.value = stage.phase;
    u.uDpr.value = state.viewport.dpr;

    const targetBurst = clamp(Math.abs(stage.velocity) * 1.6, 0, 1);
    burst.current = damp(burst.current, targetBurst, 5, step);
    u.uBurst.value = burst.current;

    // Ease the entry independently of scroll so the field settles even if the
    // visitor never moves.
    u.uIgnite.value = damp(u.uIgnite.value, stage.entered, 1.7, step);

    ray.ndc.set(stage.pointer.x, stage.pointer.y);
    ray.caster.setFromCamera(ray.ndc, state.camera);
    state.camera.getWorldDirection(ray.dir);
    ray.plane.setFromNormalAndCoplanarPoint(ray.dir, ray.origin);
    if (ray.caster.ray.intersectPlane(ray.plane, ray.hit)) u.uPointer.value.copy(ray.hit);

    // A still hand rests lightly on the field; a moving one carves through it.
    const speed = ray.last.distanceTo(ray.ndc) / Math.max(step, 0.001);
    ray.last.copy(ray.ndc);
    const pushTarget = stage.pointerSeen && stage.entered ? clamp(0.3 + speed * 0.75, 0, 1.1) : 0;
    ray.push = damp(ray.push, pushTarget, speed > 0.05 ? 7 : 2.2, step);
    u.uPush.value = ray.push;
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        depthTest
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
