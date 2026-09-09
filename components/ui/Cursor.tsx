'use client';

import { useEffect, useRef } from 'react';

/**
 * Two-part cursor: the dot is exact, the ring trails and lags into place.
 * Elements carrying `data-cursor` hand it a word to show beside the ring.
 */
export function Cursor() {
  const wrap = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...target };
    let scale = 1;
    let scaleTarget = 1;
    let raf = 0;
    let labelled = false;

    const move = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (wrap.current) wrap.current.style.opacity = '1';

      const el = e.target as HTMLElement | null;
      const tagged = el?.closest<HTMLElement>('[data-cursor]');
      const clickable = !!el?.closest('a, button');
      scaleTarget = tagged ? 2.4 : clickable ? 1.85 : 1;

      const want = !!tagged;
      if (want !== labelled) {
        labelled = want;
        wrap.current?.classList.toggle('has-label', want);
      }
      if (tagged && label.current && label.current.textContent !== tagged.dataset.cursor) {
        label.current.textContent = tagged.dataset.cursor ?? '';
      }
    };
    const leave = () => {
      if (wrap.current) wrap.current.style.opacity = '0';
    };

    const loop = () => {
      ringPos.x += (target.x - ringPos.x) * 0.16;
      ringPos.y += (target.y - ringPos.y) * 0.16;
      scale += (scaleTarget - scale) * 0.14;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) scale(${scale.toFixed(3)})`;
      }
      if (label.current) label.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      if (dot.current) dot.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', leave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', leave);
    };
  }, []);

  return (
    <div className="cursor" ref={wrap} aria-hidden>
      <div className="cursor__ring" ref={ring} />
      <div className="cursor__dot" ref={dot} />
      <span className="cursor__label" ref={label} />
    </div>
  );
}
