'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { stage, damp, clamp } from './stage';

/** Set once the driver mounts, so any component can drive the page. */
export const nav = {
  to: (_target: string | number, _opts?: { immediate?: boolean }) => {},
};

/**
 * Wires Lenis -> GSAP ScrollTrigger -> the mutable stage.
 *
 * `phase` is not a linear function of scroll. Each chapter owns one trigger
 * that morphs the field from the previous formation to its own as the chapter
 * approaches, and holds it there afterwards — so the interludes between
 * chapters (the manifesto, the kiln, the curve) play out over a fully resolved
 * formation instead of a half-melted one.
 */
export function useStageDriver() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stage.reducedMotion = reduced;

    const lenis = new Lenis({
      lerp: reduced ? 1 : 0.085,
      wheelMultiplier: 0.95,
      touchMultiplier: 1.4,
      smoothWheel: !reduced,
      autoRaf: false,
    });

    nav.to = (target, opts) =>
      lenis.scrollTo(target as never, { duration: 1.6, immediate: opts?.immediate, offset: 0 });

    let scrolledThisFrame = false;
    const onScroll = ({ scroll, limit, velocity }: { scroll: number; limit: number; velocity: number }) => {
      stage.raw = limit > 0 ? clamp(scroll / limit) : 0;
      stage.velocity = clamp(velocity / 55, -1, 1);
      scrolledThisFrame = true;
    };
    lenis.on('scroll', onScroll);
    lenis.on('scroll', ScrollTrigger.update);

    const absTop = (el: Element) => el.getBoundingClientRect().top + window.scrollY;
    const centreScroll = (el: Element) =>
      absTop(el) + el.getBoundingClientRect().height / 2 - window.innerHeight / 2;

    const chapters = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
    const triggers: ScrollTrigger[] = [];

    chapters.forEach((section, i) => {
      if (i === 0) return;
      const prev = chapters[i - 1];
      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          // Begin roughly a viewport and a third before the chapter arrives,
          // but never before the previous chapter has actually been centred.
          start: () => Math.max(centreScroll(prev), absTop(section) - window.innerHeight * 1.35),
          end: () => centreScroll(section),
          onUpdate: (self) => {
            stage.phaseTarget = i - 1 + self.progress;
          },
        }),
      );
    });

    // Whatever sits under the viewport centre names itself in the HUD. Polled
    // rather than triggered: an instant jump can skip straight past a section,
    // and a toggle that never fires would leave a stale name on screen.
    const labelled = Array.from(document.querySelectorAll<HTMLElement>('[data-label]'));
    let labelClock = 0;
    const nameSection = () => {
      const mid = window.innerHeight / 2;
      for (const el of labelled) {
        const r = el.getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) {
          stage.label = el.dataset.label ?? '';
          return;
        }
      }
    };

    const onPointer = (e: PointerEvent) => {
      stage.pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
      stage.pointerTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
      stage.pointerSeen = true;
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    let last = performance.now();
    const tick = (time: number) => {
      scrolledThisFrame = false;
      lenis.raf(time * 1000);

      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      stage.progress = damp(stage.progress, stage.raw, 9, dt);
      stage.phase = damp(stage.phase, stage.phaseTarget, 8, dt);
      stage.orbit = damp(stage.orbit, stage.orbitTarget, 7, dt);
      stage.pointer.x = damp(stage.pointer.x, stage.pointerTarget.x, 3.2, dt);
      stage.pointer.y = damp(stage.pointer.y, stage.pointerTarget.y, 3.2, dt);

      // Lenis only reports velocity while it is emitting scroll events; once
      // it goes quiet the last value would otherwise stick forever.
      if (!scrolledThisFrame) stage.velocity *= 0.82;

      labelClock += dt;
      if (labelClock > 0.1) {
        labelClock = 0;
        nameSection();
      }
    };

    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('resize', refresh);
    // Fonts landing late changes section heights.
    document.fonts?.ready.then(refresh).catch(() => {});
    ScrollTrigger.refresh();

    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', refresh);
      gsap.ticker.remove(tick);
      triggers.forEach((t) => t.kill());
      lenis.off('scroll', onScroll);
      lenis.off('scroll', ScrollTrigger.update);
      lenis.destroy();
      nav.to = () => {};
    };
  }, []);
}
