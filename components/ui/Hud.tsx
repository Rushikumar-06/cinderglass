'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { CHAPTERS } from '@/lib/chapters';
import { nav } from '@/lib/scrolling';
import { stage } from '@/lib/stage';

const METER_BARS = 6;

/**
 * Fixed instrumentation. Everything that changes per-frame is written straight
 * to the DOM from one rAF loop; only the discrete chapter index goes through
 * React state, and only when it actually changes.
 */
export function Hud({
  entered,
  audioOn,
  onToggleAudio,
  particles,
}: {
  entered: boolean;
  audioOn: boolean;
  onToggleAudio: () => void;
  particles: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const phaseEl = useRef<HTMLSpanElement>(null);
  const kelvinEl = useRef<HTMLSpanElement>(null);
  const depthEl = useRef<HTMLSpanElement>(null);
  const barEl = useRef<HTMLSpanElement>(null);
  const frameEl = useRef<HTMLSpanElement>(null);
  const meterEl = useRef<HTMLSpanElement>(null);
  const clockEl = useRef<HTMLSpanElement>(null);
  const cueEl = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const enteredAt = useRef<number | null>(null);

  useEffect(() => {
    if (entered && enteredAt.current === null) enteredAt.current = performance.now();
  }, [entered]);

  useEffect(() => {
    let raf = 0;
    let lastIndex = -1;
    let lastLabel = '';
    let lastSecond = -1;
    const bars = meterEl.current ? Array.from(meterEl.current.children) as HTMLElement[] : [];

    const loop = () => {
      const phase = stage.phase;
      const i = Math.max(0, Math.min(CHAPTERS.length - 1, Math.round(phase)));
      if (i !== lastIndex) {
        lastIndex = i;
        setActive(i);
      }

      const lo = Math.max(0, Math.min(CHAPTERS.length - 1, Math.floor(phase)));
      const hi = Math.min(CHAPTERS.length - 1, lo + 1);
      const f = phase - lo;
      const kelvin = CHAPTERS[lo].kelvin + (CHAPTERS[hi].kelvin - CHAPTERS[lo].kelvin) * f;

      if (stage.label !== lastLabel && phaseEl.current) {
        lastLabel = stage.label;
        phaseEl.current.textContent = stage.label;
      }
      if (kelvinEl.current) kelvinEl.current.textContent = `${Math.round(kelvin)} K`;
      if (depthEl.current) depthEl.current.textContent = `${(stage.progress * 100).toFixed(1)}%`;
      if (barEl.current) barEl.current.style.transform = `scaleX(${stage.progress.toFixed(4)})`;
      if (frameEl.current) frameEl.current.style.transform = `scaleY(${stage.progress.toFixed(4)})`;
      if (cueEl.current) cueEl.current.style.opacity = stage.progress > 0.012 ? '0' : '1';

      const v = Math.min(1, Math.abs(stage.velocity) * 1.6);
      bars.forEach((b, k) => {
        const level = Math.max(0.08, Math.min(1, v * METER_BARS - k));
        b.style.transform = `scaleY(${level.toFixed(3)})`;
      });

      if (enteredAt.current !== null && clockEl.current) {
        const s = Math.floor((performance.now() - enteredAt.current) / 1000);
        if (s !== lastSecond) {
          lastSecond = s;
          clockEl.current.textContent = `T+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!entered || !root.current) return;
    const el = root.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.to(el, { opacity: 1, duration: 1.2, ease: 'power2.out', delay: 0.8 });
    if (!reduced) {
      gsap.from(el.querySelectorAll('[data-hud]'), {
        opacity: 0,
        y: 10,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.06,
        delay: 0.9,
      });
    }
  }, [entered]);

  return (
    <div className="hud" ref={root}>
      {/* Hairline frame; the left rule fills with scroll progress. */}
      <div className="frame" aria-hidden>
        <span className="frame__fill" ref={frameEl} />
      </div>

      <div className="hud__top">
        <a className="hud__mark" data-hud href="#ignition" onClick={(e) => { e.preventDefault(); nav.to(0); }}>
          <span className="hud__dot" />
          Cinderglass
        </a>
        <div className="hud__meta" data-hud>
          <span className="label">Field study no. IX</span>
          <span className="label label--bright">Real-time · WebGL</span>
        </div>
      </div>

      <nav className="rail" aria-label="Chapters">
        {CHAPTERS.map((ch, i) => (
          <button
            key={ch.id}
            data-hud
            className={`rail__item${i === active ? ' is-active' : ''}`}
            onClick={() => nav.to(`#${ch.id}`)}
          >
            <span>{ch.index}</span>
            <span className="rail__tick" />
            <span>{ch.title}</span>
          </button>
        ))}
      </nav>

      <div className="telemetry">
        <div className="telemetry__row" data-hud>
          <span>Phase</span>
          <span className="telemetry__val" ref={phaseEl}>
            00 · Ignition
          </span>
        </div>
        <div className="telemetry__row" data-hud>
          <span>Thermal</span>
          <span className="telemetry__val" ref={kelvinEl}>
            4300 K
          </span>
        </div>
        <div className="telemetry__row" data-hud>
          <span>Field</span>
          <span className="telemetry__val">{particles.toLocaleString('en-US')} pts</span>
        </div>
        <div className="telemetry__row" data-hud>
          <span>Velocity</span>
          <span className="meter" ref={meterEl}>
            {Array.from({ length: METER_BARS }).map((_, k) => (
              <i key={k} />
            ))}
          </span>
        </div>
        <div className="telemetry__row" data-hud>
          <span>Elapsed</span>
          <span className="telemetry__val" ref={clockEl}>
            T+00:00
          </span>
        </div>
        <div className="telemetry__row" data-hud>
          <span>Depth</span>
          <span className="telemetry__bar">
            <span ref={barEl} />
          </span>
        </div>
      </div>

      <div className="cue" ref={cueEl}>
        <span className="label">Scroll</span>
        <span className="cue__line" />
      </div>

      <div className="controls">
        <button className={`ctrl${audioOn ? ' is-on' : ''}`} data-hud onClick={onToggleAudio}>
          <span className="ctrl__bars">
            <i />
            <i />
            <i />
            <i />
          </span>
          {audioOn ? 'Sound on' : 'Sound off'}
        </button>
      </div>
    </div>
  );
}
