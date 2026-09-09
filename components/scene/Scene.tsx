'use client';

import { Suspense, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Backdrop } from './Backdrop';
import { CameraRig } from './CameraRig';
import { Core } from './Core';
import { EmberField } from './EmberField';
import { Effects } from './Effects';
import { Monolith } from './Monolith';
import { stage } from '@/lib/stage';

/** Flips `stage.ready` once a frame has actually reached the screen. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => void invalidate(), [invalidate]);
  useFrame(() => {
    if (!stage.ready) {
      stage.ready = true;
      onReady();
    }
  });
  return null;
}

export default function Scene({ quality, onReady }: { quality: number; onReady: () => void }) {
  const count = quality > 0 ? 130_000 : 34_000;

  return (
    <Canvas
      className="scene__canvas"
      dpr={quality > 0 ? [1, 1.75] : [1, 1.4]}
      camera={{ fov: 42, near: 0.1, far: 220, position: [0, 0, 11] }}
      gl={{
        antialias: false,
        alpha: false,
        stencil: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
      }}
      flat
    >
      <color attach="background" args={['#050506']} />

      <Suspense fallback={null}>
        <Backdrop />
        <Core />
        <EmberField count={count} size={quality > 0 ? 0.34 : 0.5} />
        <Monolith />
      </Suspense>

      <CameraRig />
      <Effects quality={quality} />
      <ReadySignal onReady={onReady} />
    </Canvas>
  );
}
