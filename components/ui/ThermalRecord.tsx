'use client';

import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SCHEDULE } from '@/lib/content';

const W = 1000;
const H = 440;
const PAD = { l: 76, r: 36, t: 34, b: 52 };
const K_MIN = 250;
const K_MAX = 1950;

const xOf = (h: number) => PAD.l + (h / SCHEDULE.hours) * (W - PAD.l - PAD.r);
const yOf = (k: number) => PAD.t + (1 - (k - K_MIN) / (K_MAX - K_MIN)) * (H - PAD.t - PAD.b);

/**
 * THE RECORD — the annealing schedule, drawn by scroll.
 *
 * The curve is a real schedule: a fast descent to the strain point, a long
 * hold there, and a slow release. Progress through the section advances the
 * cursor along it and updates the readouts; nothing is animated on a clock.
 */
export function ThermalRecord() {
  const root = useRef<HTMLElement>(null);
  const path = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const cursor = useRef<SVGLineElement>(null);
  const kelvin = useRef<HTMLSpanElement>(null);
  const hour = useRef<HTMLSpanElement>(null);
  const state = useRef<HTMLSpanElement>(null);

  const d = useMemo(() => {
    const n = 140;
    const pts: string[] = [];
    for (let i = 0; i <= n; i++) {
      const h = (i / n) * SCHEDULE.hours;
      pts.push(`${i === 0 ? 'M' : 'L'}${xOf(h).toFixed(2)} ${yOf(SCHEDULE.kelvinAt(h)).toFixed(2)}`);
    }
    return pts.join(' ');
  }, []);

  useEffect(() => {
    const el = root.current;
    const p = path.current;
    if (!el || !p) return;
    gsap.registerPlugin(ScrollTrigger);

    const len = p.getTotalLength();
    p.style.strokeDasharray = `${len}`;
    p.style.strokeDashoffset = `${len}`;

    let lastState = '';
    const apply = (t: number) => {
      const h = t * SCHEDULE.hours;
      const k = SCHEDULE.kelvinAt(h);
      p.style.strokeDashoffset = `${len * (1 - t)}`;
      const pt = p.getPointAtLength(len * t);
      dot.current?.setAttribute('cx', pt.x.toFixed(2));
      dot.current?.setAttribute('cy', pt.y.toFixed(2));
      cursor.current?.setAttribute('x1', pt.x.toFixed(2));
      cursor.current?.setAttribute('x2', pt.x.toFixed(2));
      if (kelvin.current) kelvin.current.textContent = String(Math.round(k));
      if (hour.current) {
        const mm = Math.round((h % 1) * 60);
        hour.current.textContent = `T+${String(Math.floor(h)).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
      }
      const st = SCHEDULE.stateAt(h);
      if (st !== lastState && state.current) {
        lastState = st;
        state.current.textContent = st;
      }
    };
    apply(0);

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.4,
      onUpdate: (self) => apply(self.progress),
    });

    return () => trigger.kill();
  }, []);

  const gridK = [300, 600, 900, 1200, 1500, 1800];
  const gridH = [0, 2, 4, 6, 8, 10, 12, 14];

  return (
    <section className="record" ref={root} data-label="The Record">
      <div className="record__sticky">
        <header className="record__head">
          <span className="label label--bright">The Record — annealing schedule</span>
          <span className="label">Kelvin over hours · 4 °C per minute on the descent</span>
        </header>

        <div className="record__body">
          <div className="record__readout">
            <span className="record__kelvin display">
              <span ref={kelvin}>1870</span>
              <span className="record__unit">K</span>
            </span>
            <span className="record__state label label--ember" ref={state}>
              Liquid
            </span>
            <span className="record__hour label" ref={hour}>
              T+00:00
            </span>
          </div>

          <svg className="record__chart" viewBox={`0 0 ${W} ${H}`} aria-hidden>
            {/* the hold */}
            <rect
              className="record__hold"
              x={xOf(4)}
              y={PAD.t}
              width={xOf(9) - xOf(4)}
              height={H - PAD.t - PAD.b}
            />
            {gridK.map((k) => (
              <g key={k}>
                <line className="record__grid" x1={PAD.l} x2={W - PAD.r} y1={yOf(k)} y2={yOf(k)} />
                <text className="record__tick" x={PAD.l - 12} y={yOf(k) + 4} textAnchor="end">
                  {k}
                </text>
              </g>
            ))}
            {gridH.map((h) => (
              <g key={h}>
                <line className="record__grid record__grid--v" x1={xOf(h)} x2={xOf(h)} y1={H - PAD.b} y2={H - PAD.b + 6} />
                <text className="record__tick" x={xOf(h)} y={H - PAD.b + 22} textAnchor="middle">
                  {h}h
                </text>
              </g>
            ))}
            <text className="record__tick record__tick--note" x={xOf(6.5)} y={yOf(SCHEDULE.hold) - 14} textAnchor="middle">
              held · 812 K
            </text>

            <path className="record__ghost" d={d} />
            <path className="record__curve" d={d} ref={path} />
            <line className="record__cursor" ref={cursor} x1={xOf(0)} x2={xOf(0)} y1={PAD.t} y2={H - PAD.b} />
            <circle className="record__dot" ref={dot} r="5" cx={xOf(0)} cy={yOf(SCHEDULE.start)} />
          </svg>
        </div>

        <footer className="record__foot">
          <span className="label">Fig. 03 — cooling curve, specimen 05</span>
          <span className="label">Scroll to advance</span>
        </footer>
      </div>
    </section>
  );
}
