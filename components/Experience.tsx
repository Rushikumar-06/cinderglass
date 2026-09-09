'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chapters } from './ui/Chapters';
import { Cursor } from './ui/Cursor';
import { Hud } from './ui/Hud';
import { Preloader } from './ui/Preloader';
import { Drone } from '@/lib/drone';
import { useStageDriver } from '@/lib/scrolling';
import { stage } from '@/lib/stage';

const Scene = dynamic(() => import('./scene/Scene'), { ssr: false });

function detectQuality() {
  if (typeof window === 'undefined') return 1;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 8;
  const narrow = window.innerWidth < 900;
  return coarse || narrow || cores <= 4 ? 0 : 1;
}

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Experience() {
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [audioOn, setAudioOn] = useState(false);
  const [quality, setQuality] = useState<number | null>(null);
  const [webgl, setWebgl] = useState(true);
  const drone = useRef<Drone | null>(null);

  useStageDriver();

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    setQuality(detectQuality());
    setWebgl(hasWebGL());
    document.body.classList.add('is-locked');
    return () => document.body.classList.remove('is-locked');
  }, []);

  // Without WebGL there is nothing to wait for.
  useEffect(() => {
    if (!webgl) setReady(true);
  }, [webgl]);

  const onEnter = useCallback(() => {
    setEntered(true);
    stage.entered = 1;
    document.body.classList.remove('is-locked');
    // Body height just changed; let Lenis and ScrollTrigger re-measure.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }, []);

  const toggleAudio = useCallback(async () => {
    drone.current ??= new Drone();
    const on = await drone.current.toggle();
    setAudioOn(on);
  }, []);

  // The drone tracks the chapter, but only needs a few updates a second.
  useEffect(() => {
    if (!audioOn) return;
    const id = window.setInterval(() => drone.current?.update(stage.phase), 400);
    return () => window.clearInterval(id);
  }, [audioOn]);

  useEffect(() => () => drone.current?.dispose(), []);

  const particles = useMemo(() => (quality === 0 ? 34_000 : 130_000), [quality]);
  const onSceneReady = useCallback(() => setReady(true), []);

  return (
    <>
      <div className="scene">
        {webgl && quality !== null ? (
          <Scene quality={quality} onReady={onSceneReady} />
        ) : !webgl ? (
          <div className="scene__fallback">
            <div>
              <p className="label" style={{ marginBottom: '1rem' }}>WebGL unavailable</p>
              <p className="body" style={{ margin: '0 auto' }}>
                Cinderglass renders in real time and needs hardware acceleration. The writing below
                stands on its own; the fire does not.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <Chapters entered={entered} />
      <Hud entered={entered} audioOn={audioOn} onToggleAudio={toggleAudio} particles={particles} />

      <Preloader ready={ready} onEnter={onEnter} />
      <Cursor />
    </>
  );
}
