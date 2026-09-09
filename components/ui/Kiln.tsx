'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SPECIMENS, type Specimen } from '@/lib/content';
import { stage, damp } from '@/lib/stage';

/**
 * A faceted shard, drawn from the polygon: the outline, a smaller echo of it,
 * and hairlines from the centroid to every vertex. Turns slowly on its own.
 */
function Shard({ s }: { s: Specimen }) {
  const pts = s.shape.split(' ').map((p) => p.split(',').map(Number) as [number, number]);
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  const id = `shard-${s.index}`;
  return (
    <svg className="shard" viewBox="0 0 200 200" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f0a63c" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="#ff5a1a" stopOpacity="0.08" />
          <stop offset="1" stopColor="#ff5a1a" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon className="shard__body" points={s.shape} fill={`url(#${id})`} />
      {pts.map((p, i) => (
        <line key={i} className="shard__facet" x1={cx} y1={cy} x2={p[0]} y2={p[1]} />
      ))}
      <polygon
        className="shard__echo"
        points={s.shape}
        transform={`translate(${cx} ${cy}) scale(0.62) translate(${-cx} ${-cy})`}
      />
      <circle className="shard__core" cx={cx} cy={cy} r="2.4" />
    </svg>
  );
}

/**
 * THE KILN — the specimen index, traversed sideways.
 *
 * The section is tall; its inner is sticky; scroll progress through the
 * section slides a horizontal track. The same progress is written to
 * `stage.orbitTarget`, which the camera reads to make one full revolution
 * around the shattered field, so the room turns as the specimens go past.
 */
export function Kiln() {
  const root = useRef<HTMLElement>(null);
  const sticky = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const panels = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const section = root.current;
    const stick = sticky.current;
    const rail = track.current;
    if (!section || !stick || !rail) return;
    gsap.registerPlugin(ScrollTrigger);

    let target = 0;
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        target = self.progress;
        stage.orbitTarget = self.progress;
      },
      onLeaveBack: () => {
        stage.orbitTarget = 0;
      },
      onLeave: () => {
        stage.orbitTarget = 1;
      },
    });

    let x = 0;
    let raf = 0;
    let last = performance.now();
    let active = -1;
    const items = panels.current.filter(Boolean) as HTMLElement[];

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const max = Math.max(0, rail.scrollWidth - stick.clientWidth);
      x = damp(x, target * max, 10, dt);
      rail.style.transform = `translate3d(${(-x).toFixed(2)}px, 0, 0)`;

      // Focus falls off with distance from the viewport centre.
      const vc = stick.clientWidth / 2;
      let best = 0;
      let bestD = Infinity;
      items.forEach((p, i) => {
        const d = p.offsetLeft + p.offsetWidth / 2 - x - vc;
        const n = Math.min(1, Math.abs(d) / (vc * 1.25));
        p.style.opacity = (1 - n * 0.72).toFixed(3);
        p.style.transform = `translate3d(0, ${(n * 26).toFixed(1)}px, 0) scale(${(1 - n * 0.05).toFixed(4)})`;
        if (Math.abs(d) < bestD) {
          bestD = Math.abs(d);
          best = i;
        }
      });
      if (best !== active) {
        items[active]?.classList.remove('is-active');
        items[best]?.classList.add('is-active');
        active = best;
        if (counter.current) counter.current.textContent = SPECIMENS[best].index;
      }
      if (bar.current) bar.current.style.transform = `scaleX(${target.toFixed(4)})`;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      trigger.kill();
    };
  }, []);

  return (
    <section className="kiln" ref={root} data-label="The Kiln">
      <div className="kiln__sticky" ref={sticky} data-cursor="Traverse →">
        <header className="kiln__head">
          <span className="label label--bright">The Kiln — specimen index</span>
          <span className="label kiln__counter">
            <span ref={counter}>01</span>
            <span className="kiln__of"> / {SPECIMENS[SPECIMENS.length - 1].index}</span>
          </span>
        </header>

        <div className="kiln__track" ref={track}>
          {SPECIMENS.map((s, i) => (
            <article
              className="specimen"
              key={s.index}
              ref={(el) => {
                panels.current[i] = el;
              }}
            >
              <span className="specimen__num display" aria-hidden>
                {s.index}
              </span>
              <div className="specimen__shard">
                <Shard s={s} />
              </div>
              <div className="specimen__text">
                <div className="specimen__meta">
                  <span className="label">Specimen {s.index}</span>
                  <span className="label label--ember">{s.kelvin} K</span>
                </div>
                <h3 className="display specimen__name">{s.name}</h3>
                <p className="specimen__line">{s.line}</p>
                <p className="body specimen__detail">{s.detail}</p>
                <dl className="specimen__props">
                  <dt>Cooled</dt>
                  <dd>{s.cooled}</dd>
                  <dt>Result</dt>
                  <dd>{s.result}</dd>
                </dl>
              </div>
            </article>
          ))}
        </div>

        <footer className="kiln__foot">
          <span className="kiln__bar">
            <span ref={bar} />
          </span>
          <span className="label kiln__hint">Scroll to traverse →</span>
        </footer>
      </div>
    </section>
  );
}
