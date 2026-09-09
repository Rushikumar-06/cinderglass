'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ScreenQuad } from '@react-three/drei';
import * as THREE from 'three';
import { GLSL_COMMON } from '@/lib/shaders/common';
import { stage, damp } from '@/lib/stage';

/**
 * Full-screen atmosphere behind everything: a drifting warm haze that cools as
 * the piece progresses, plus low-amplitude smoke so the black is never flat.
 * Drawn at the far plane with depth writes off.
 */
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
${GLSL_COMMON}

uniform float uTime;
uniform float uPhase;
uniform vec2  uResolution;
uniform vec2  uPointer;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uResolution.x / uResolution.y, 1.0);

  float cool = clamp(uPhase / 4.0, 0.0, 1.0);

  // The haze centre drifts, and leans very slightly toward the pointer.
  vec2 c = vec2(sin(uTime * 0.045) * 0.16, -0.06 + cos(uTime * 0.037) * 0.11);
  c += uPointer * 0.05;
  c.y -= cool * 0.22;

  float d = length(p - c);
  float haze = exp(-d * (2.15 + cool * 1.35));

  float smoke = fbm(vec3(p * 2.3, uTime * 0.035));
  smoke = smoke * 0.5 + 0.5;
  haze *= 0.55 + smoke * 0.75;

  vec3 hot  = vec3(0.145, 0.028, 0.006);
  vec3 warm = vec3(0.062, 0.020, 0.010);
  vec3 cold = vec3(0.012, 0.016, 0.026);
  vec3 tint = mix(hot, mix(warm, cold, smoothstep(0.35, 1.0, cool)), smoothstep(0.0, 0.55, cool));

  vec3 col = tint * haze * 0.85;

  // A faint band low in the frame keeps the composition anchored.
  col += vec3(0.020, 0.0075, 0.003) * exp(-abs(p.y + 0.44) * 6.5) * (1.0 - cool * 0.75);

  // Base ground so the darkest pixel is still slightly blue, never #000.
  col += vec3(0.0042, 0.0048, 0.0062);

  col *= 1.0 - smoothstep(0.42, 1.15, length(p)) * 0.55;

  gl_FragColor = vec4(col * uOpacity, 1.0);
}
`;

export function Backdrop() {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uOpacity: { value: 1 },
    }),
    [],
  );
  const opacity = useRef(0);

  // See EmberField: the applied uniforms are a clone of the prop.
  useFrame((state, dt) => {
    const u = matRef.current?.uniforms;
    if (!u) return;
    const step = Math.min(dt, 0.1);
    u.uTime.value = state.clock.elapsedTime;
    u.uPhase.value = stage.phase;
    u.uResolution.value.set(state.size.width, state.size.height);
    u.uPointer.value.set(stage.pointer.x, stage.pointer.y);
    opacity.current = damp(opacity.current, stage.entered ? 1 : 0.15, 1.4, step);
    u.uOpacity.value = opacity.current;
  });

  return (
    <ScreenQuad renderOrder={-1000}>
      <shaderMaterial
        ref={matRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthTest={false}
        depthWrite={false}
      />
    </ScreenQuad>
  );
}
