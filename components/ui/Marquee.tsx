'use client';

import { useEffect, useRef } from 'react';
import { MARQUEE } from '@/lib/content';
import { stage } from '@/lib/stage';

/**
 * A band of type that runs on its own and takes scroll velocity as a shove —
 * faster on the way down, reversing on the way up, skewing with the push.
 */
export function Marquee() {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let x = 0;
    let raf = 0;
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const half = el.scrollWidth / 2;
      const v = reduced ? 0 : stage.velocity;
      x += (26 + v * 620) * dt;
      x = ((x % half) + half) % half;
      el.style.transform = `translate3d(${(-x).toFixed(2)}px, 0, 0) skewX(${(-v * 8).toFixed(2)}deg)`;
      raf = requestAnimationFrame(loop);
    };
    if (!reduced) raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const items = [...MARQUEE, ...MARQUEE, ...MARQUEE];
  return (
    <div className="marquee" aria-hidden>
      <div className="marquee__track" ref={track}>
        {[0, 1].map((half) => (
          <div className="marquee__half" key={half}>
            {items.map((t, i) => (
              <span className="marquee__item" key={i}>
                <em>{t}</em>
                <i className="marquee__dot" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
