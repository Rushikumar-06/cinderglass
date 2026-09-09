'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  ToneMapping,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode, type ChromaticAberrationEffect, type BloomEffect } from 'postprocessing';
import * as THREE from 'three';
import { stage, damp, clamp } from '@/lib/stage';

/**
 * AgX rather than ACES: the field is almost entirely saturated orange, and
 * ACES shifts it toward yellow-white as soon as it clips. AgX holds the hue
 * into the highlights, which is the whole point of the palette.
 */
export function Effects({ quality }: { quality: number }) {
  const ca = useRef<ChromaticAberrationEffect>(null);
  const bloom = useRef<BloomEffect>(null);
  const energy = useRef(0);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.1);
    const target = clamp(Math.abs(stage.velocity) * 2.2, 0, 1);
    energy.current = damp(energy.current, target, 6, step);

    if (ca.current) {
      const o = 0.00010 + energy.current * 0.00085;
      ca.current.offset.set(o, o * 0.55);
    }
    if (bloom.current) {
      // Hotter early, and it flares when the visitor scrolls hard.
      const heat = 1 - clamp(stage.phase / 4, 0, 1) * 0.42;
      bloom.current.intensity = (0.50 + energy.current * 0.45) * heat;
    }
  });

  if (quality < 1) {
    return (
      <EffectComposer frameBufferType={THREE.HalfFloatType} multisampling={0}>
        <Bloom ref={bloom} mipmapBlur intensity={0.5} luminanceThreshold={0.24} luminanceSmoothing={0.28} radius={0.7} />
        <Vignette offset={0.2} darkness={0.9} />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer frameBufferType={THREE.HalfFloatType} multisampling={0}>
      <Bloom ref={bloom} mipmapBlur intensity={0.55} luminanceThreshold={0.22} luminanceSmoothing={0.3} radius={0.78} levels={7} />
      <ChromaticAberration ref={ca} radialModulation modulationOffset={0.42} offset={[0.0001, 0.00006]} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.26} />
      <Vignette offset={0.18} darkness={0.95} />
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  );
}
