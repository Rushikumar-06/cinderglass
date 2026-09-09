'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

/**
 * Not a fake progress bar: the fill eases toward 92% while shaders compile and
 * fonts land, then completes only once the scene has presented a frame. The
 * gate at the end is deliberate — it gives the piece a curtain.
 */
export function Preloader({ ready, onEnter }: { ready: boolean; onEnter: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const num = useRef<HTMLSpanElement>(null);
  const enterBtn = useRef<HTMLButtonElement>(null);
  const [armed, setArmed] = useState(false);
  const readyRef = useRef(ready);
  readyRef.current = ready;

  useEffect(() => {
    let v = 0;
    let raf = 0;
    let done = false;

    const loop = () => {
      const cap = readyRef.current ? 100 : 92;
      v = Math.min(cap, v + (cap - v) * 0.035 + 0.22);
      if (fill.current) fill.current.style.transform = `scaleX(${(v / 100).toFixed(4)})`;
      if (num.current) num.current.textContent = String(Math.round(v)).padStart(3, '0');
      if (!done && v > 99.4) {
        done = true;
        setArmed(true);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!armed || !enterBtn.current) return;
    gsap.to(enterBtn.current, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: 0.15 });
  }, [armed]);

  const handleEnter = () => {
    if (!armed) return;
    const el = root.current;
    onEnter();
    if (!el) return;
    gsap
      .timeline()
      .to(el.querySelector('.preloader__inner'), { opacity: 0, y: -18, duration: 0.7, ease: 'power3.in' })
      .to(el, { opacity: 0, duration: 1.0, ease: 'power2.inOut' }, '-=0.3')
      .set(el, { display: 'none' });
  };

  return (
    <div className="preloader" ref={root}>
      <div className="preloader__inner">
        <div className="preloader__mark">
          Cinder<em>glass</em>
        </div>

        <div className="preloader__track">
          <div className="preloader__fill" ref={fill} />
        </div>

        <div className="preloader__meta label">
          <span ref={num}>000</span>
          <span>—</span>
          <span>{armed ? 'field stable' : 'compiling field'}</span>
        </div>

        <button className="preloader__enter" ref={enterBtn} onClick={handleEnter} disabled={!armed}>
          Enter
        </button>
      </div>
    </div>
  );
}
