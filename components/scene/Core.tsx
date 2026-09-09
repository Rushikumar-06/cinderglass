'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLSL_COMMON } from '@/lib/shaders/common';
import { stage, damp, clamp, smoothstep } from '@/lib/stage';

/**
 * The body at the centre of chapter 00: a nearly black sphere with molten
 * seams running under its surface. It survives the fracture by a few hundred
 * milliseconds and then goes out.
 */
const vertexShader = /* glsl */ `
${GLSL_COMMON}

uniform float uTime;
uniform float uSwell;

varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  vec3 n = normalize(normal);
  float d = fbm(n * 2.1 + vec3(0.0, uTime * 0.09, 0.0)) * 0.085;
  vec3 displaced = position + n * (d + uSwell * 0.06);

  vec4 world = modelMatrix * vec4(displaced, 1.0);
  vPos = displaced;
  vNormal = normalize(mat3(modelMatrix) * n);
  vView = normalize(cameraPosition - world.xyz);

  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
${GLSL_COMMON}

uniform float uTime;
uniform float uOpacity;
uniform float uHeat;

varying vec3 vPos;
varying vec3 vNormal;
varying vec3 vView;

void main() {
  float n = fbm(vPos * 2.35 + vec3(0.0, uTime * 0.10, uTime * 0.03));
  // Ridge the noise: bright only where it crosses zero, giving seams. Kept
  // wide and low — thin super-bright lines shred under chromatic aberration.
  float seam = pow(clamp(1.0 - abs(n) * 2.1, 0.0, 1.0), 3.4);

  float fres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), 3.2);

  vec3 body  = vec3(0.0075, 0.0055, 0.0052);
  vec3 ember = vec3(1.000, 0.115, 0.020);
  vec3 gold  = vec3(1.000, 0.470, 0.090);

  vec3 col = body;
  col += ember * seam * (0.80 * uHeat);
  col += gold * pow(seam, 2.6) * (0.42 * uHeat);
  col += gold * fres * (0.26 * uHeat);

  gl_FragColor = vec4(col, uOpacity);
}
`;

export function Core() {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const geometry = useMemo(() => new THREE.IcosahedronGeometry(1.18, 24), []);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uHeat: { value: 1 },
      uSwell: { value: 0 },
    }),
    [],
  );
  const shown = useRef(0);

  // See EmberField: the applied uniforms are a clone of the prop.
  useFrame((state, dt) => {
    const u = matRef.current?.uniforms;
    if (!u) return;
    const step = Math.min(dt, 0.1);
    const t = state.clock.elapsedTime;
    u.uTime.value = t;

    // Present through ignition, gone by the time the shell is fully thrown.
    const target = (1 - smoothstep(0.38, 0.98, stage.phase)) * stage.entered;
    shown.current = damp(shown.current, target, 3.2, step);
    u.uOpacity.value = shown.current;
    u.uHeat.value = clamp(0.45 + shown.current * 0.85, 0, 1.4);
    u.uSwell.value = Math.sin(t * 0.75) * 0.5 + 0.5;

    if (group.current) {
      group.current.rotation.y = t * 0.055;
      group.current.rotation.x = Math.sin(t * 0.11) * 0.12;
      const s = 0.55 + shown.current * 0.45;
      group.current.scale.setScalar(s);
      group.current.visible = shown.current > 0.005;
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite
        />
      </mesh>
    </group>
  );
}
