'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLSL_COMMON } from '@/lib/shaders/common';
import { stage, damp, smoothstep } from '@/lib/stage';

/**
 * Chapter 03. A slab of black glass that rises through the annealing ring.
 *
 * Shaded by hand rather than with a PBR material: a near-mirror metal needs an
 * environment to reflect, and the only environment here is a particle field.
 * Flat box normals give one constant highlight per face, which is exactly how
 * polished stone behaves — the faces catch light one at a time as it turns.
 */
const vertexShader = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying vec3 vLocal;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - world.xyz);
  vLocal = position;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const fragmentShader = /* glsl */ `
${GLSL_COMMON}

uniform float uTime;
uniform float uOpacity;
uniform float uHeat;
uniform float uHeight;

varying vec3 vN;
varying vec3 vV;
varying vec3 vLocal;

void main() {
  vec3 N = normalize(vN);
  vec3 V = normalize(vV);

  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 2.8);
  float h = clamp(vLocal.y / uHeight + 0.5, 0.0, 1.0);

  vec3 body = vec3(0.0065, 0.0065, 0.0080);
  vec3 gold = vec3(1.000, 0.460, 0.095);
  vec3 cold = vec3(0.130, 0.185, 0.380);

  // Two fixed key directions; a box's flat normals turn these into per-face
  // highlights that hand off one to the next as the slab rotates.
  float key  = pow(max(0.0, dot(N, normalize(vec3(0.80, 0.26, 0.54)))), 6.0);
  float fill = pow(max(0.0, dot(N, normalize(vec3(-0.72, 0.10, 0.62)))), 9.0);

  vec3 col = body;
  col += gold * key * (0.85 * uHeat);
  col += cold * fill * 0.30;
  col += gold * fres * 0.28;

  // Heat still leaving the base, and a slow bloom of light climbing the slab.
  col += gold * pow(1.0 - h, 6.0) * (0.70 * uHeat);
  float sweep = exp(-pow((h - fract(uTime * 0.055)) * 7.5, 2.0));
  col += gold * sweep * 0.22 * uHeat;

  // Grain in the glass so the faces are never perfectly flat.
  col *= 0.88 + 0.12 * (fbm(vLocal * 3.2 + uTime * 0.04) * 0.5 + 0.5);

  gl_FragColor = vec4(col, uOpacity);
}
`;

const HEIGHT = 5.6;

export function Monolith() {
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const glow = useRef<THREE.Mesh>(null);
  const shown = useRef(0);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uHeat: { value: 1 },
      uHeight: { value: HEIGHT },
    }),
    [],
  );

  useFrame((state, dt) => {
    const step = Math.min(dt, 0.1);
    const t = state.clock.elapsedTime;

    const target =
      smoothstep(2.25, 2.95, stage.phase) * (1 - smoothstep(3.6, 4.0, stage.phase)) * stage.entered;
    shown.current = damp(shown.current, target, 2.6, step);

    if (group.current) {
      group.current.visible = shown.current > 0.004;
      // Rises out of the floor as it fades in, and sinks back on the way out.
      group.current.position.y = -HEIGHT + shown.current * HEIGHT;
      group.current.rotation.y = t * 0.085 + stage.pointer.x * 0.14;
    }

    // See EmberField: the applied uniforms are a clone of the prop.
    const u = matRef.current?.uniforms;
    if (u) {
      u.uTime.value = t;
      u.uOpacity.value = Math.min(1, shown.current * 1.2);
      u.uHeat.value = 0.55 + shown.current * 0.65;
    }

    if (glow.current) {
      const m = glow.current.material as THREE.MeshBasicMaterial;
      m.opacity = shown.current * 0.22 * (0.72 + Math.sin(t * 0.9) * 0.28);
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <boxGeometry args={[0.66, HEIGHT, 0.66]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          transparent
          depthWrite
        />
      </mesh>

      {/* A thin hot band at the base, where the slab is still giving up heat. */}
      <mesh ref={glow} position={[0, -HEIGHT / 2 + 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.44, 1.45, 64]} />
        <meshBasicMaterial
          color="#ff5a1a"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
