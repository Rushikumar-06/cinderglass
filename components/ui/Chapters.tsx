'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { CHAPTERS } from '@/lib/chapters';
import { nav } from '@/lib/scrolling';
import { Manifesto } from './Manifesto';
import { Kiln } from './Kiln';
import { ThermalRecord } from './ThermalRecord';
import { Marquee } from './Marquee';

const ALIGN = ['center', 'left', 'right', 'left', 'center'] as const;

/** What sits between a chapter and the next one. */
const INTERLUDE: Record<number, () => React.ReactNode> = {
  0: () => <Manifesto />,
  1: () => <Kiln />,
  2: () => <ThermalRecord />,
};

function Lines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <span className="line" key={i}>
          <span className="line__i">{line}</span>
        </span>
      ))}
    </>
  );
}

function Chapter({ index }: { index: number }) {
  const ch = CHAPTERS[index];
  return (
    <section
      className={`chapter chapter--${ALIGN[index]}`}
      data-chapter
      data-label={`${ch.index} · ${ch.title}`}
      id={ch.id}
    >
      <span className="chapter__num display" aria-hidden>
        {ch.index}
      </span>
      <div className="chapter__inner" data-reveal>
        <div className="chapter__marker">
          <span className="chapter__rule" />
          <span className="label label--bright">
            {ch.index} — {ch.title}
          </span>
        </div>

        <h2 className="display chapter__headline">
          <Lines lines={ch.headline} />
        </h2>

        <div className="chapter__prose">
          {ch.body.map((p, j) => (
            <p className="body" data-fade key={j}>
              {p}
            </p>
          ))}
          {ch.note ? (
            <p className="chapter__note" data-fade>
              {ch.note}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function Chapters({ entered }: { entered: boolean }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!root.current) return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const scope = root.current!;

      const originOf = (el: Element) => (el.closest('.chapter--right') ? '100% 100%' : '0% 100%');

      // Hold everything out of frame from the first paint, so nothing flashes
      // in before its trigger.
      scope.querySelectorAll<HTMLElement>('.line__i').forEach((el) => {
        gsap.set(el, { yPercent: reduced ? 0 : 118, rotate: reduced ? 0 : 3, transformOrigin: originOf(el) });
      });
      gsap.set('[data-fade]', { opacity: reduced ? 1 : 0, y: reduced ? 0 : 22, filter: reduced ? 'none' : 'blur(10px)' });
      gsap.set('.chapter__rule', { scaleX: reduced ? 1 : 0 });
      gsap.set('.hero__word', {
        yPercent: reduced ? 0 : 110,
        scale: reduced ? 1 : 1.08,
        letterSpacing: reduced ? '-0.035em' : '0.05em',
        filter: reduced ? 'none' : 'blur(18px)',
        rotate: 0,
      });

      // The watermark numerals move against the scroll, always.
      scope.querySelectorAll<HTMLElement>('.chapter__num').forEach((num) => {
        gsap.fromTo(
          num,
          { yPercent: -28 },
          {
            yPercent: -72,
            ease: 'none',
            scrollTrigger: { trigger: num.closest('.chapter'), start: 'top bottom', end: 'bottom top', scrub: true },
          },
        );
      });

      if (!entered) return;

      if (reduced) {
        gsap.set('.line__i, .hero__word', { yPercent: 0, rotate: 0 });
        gsap.set('[data-fade]', { opacity: 1, y: 0, filter: 'none' });
        gsap.set('.chapter__rule', { scaleX: 1 });
        return;
      }

      // Chapter 00 plays on entry rather than on scroll — it is already in view.
      const hero = scope.querySelector('[data-hero]');
      if (hero) {
        gsap
          .timeline({ delay: 0.4 })
          .to(hero.querySelector('.hero__word'), {
            yPercent: 0,
            scale: 1,
            letterSpacing: '-0.035em',
            filter: 'blur(0px)',
            duration: 2.1,
            ease: 'expo.out',
          })
          .to(
            hero.querySelectorAll('[data-fade]'),
            { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.3, ease: 'expo.out', stagger: 0.14 },
            '-=1.5',
          );
      }

      scope.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
        const rule = el.querySelector('.chapter__rule');
        const lines = el.querySelectorAll('.line__i');
        const fades = el.querySelectorAll('[data-fade]');
        const tl = gsap.timeline({
          scrollTrigger: { trigger: el, start: 'top 78%', once: true },
        });
        if (rule) tl.to(rule, { scaleX: 1, duration: 1.2, ease: 'expo.out' });
        if (lines.length) {
          tl.to(lines, { yPercent: 0, rotate: 0, duration: 1.4, ease: 'expo.out', stagger: 0.085 }, '-=0.9');
        }
        if (fades.length) {
          tl.to(fades, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out', stagger: 0.11 }, '-=1.0');
        }
      });
    }, root);

    return () => ctx.revert();
  }, [entered]);

  return (
    <div className="content" ref={root}>
      {/* 00 — the hero is its own thing */}
      <section
        className="chapter chapter--hero chapter--center"
        data-chapter
        data-label={`${CHAPTERS[0].index} · ${CHAPTERS[0].title}`}
        id={CHAPTERS[0].id}
      >
        <div className="chapter__inner" data-hero>
          <span className="label" data-fade>
            Field study no. IX — MMXXVI
          </span>
          <h1 className="display hero__wordmark">
            <span className="line">
              <span className="line__i hero__word">
                Cinder<em>glass</em>
              </span>
            </span>
          </h1>
          <div className="hero__rule" data-fade />
          <p className="hero__sub" data-fade>
            A study in slow combustion
          </p>
        </div>
      </section>

      {CHAPTERS.slice(1).map((_, k) => {
        const i = k + 1;
        const Between = INTERLUDE[i - 1];
        return (
          <div key={CHAPTERS[i].id} style={{ display: 'contents' }}>
            {Between ? Between() : null}
            <Chapter index={i} />
          </div>
        );
      })}

      <Marquee />

      <footer className="colophon" data-label="Index">
        <div className="colophon__inner">
          <div className="colophon__col">
            <span className="label">The piece</span>
            <p>
              Cinderglass is a single continuous scene. Nothing here is a video, a texture or a
              downloaded model — the field, the atmosphere and the drone are all generated on the
              device, every frame.
            </p>
          </div>

          <div className="colophon__col">
            <span className="label">Built with</span>
            <p>
              Next.js · three.js
              <br />
              React Three Fiber · GSAP
              <br />
              Lenis · postprocessing
            </p>
          </div>

          <div className="colophon__col">
            <span className="label">Elsewhere</span>
            <a className="colophon__link" href="mailto:studio@cinderglass.test">
              studio@cinderglass.test
            </a>
            <a className="colophon__link" href="https://threejs.org" target="_blank" rel="noreferrer">
              Process notes
            </a>
          </div>

          <div className="colophon__col">
            <span className="label">MMXXVI</span>
            <button className="colophon__link" onClick={() => nav.to(0)}>
              Return to ignition ↑
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
