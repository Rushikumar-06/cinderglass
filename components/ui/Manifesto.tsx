'use client';

import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MANIFESTO } from '@/lib/content';

type Word = { text: string; em: boolean };

/** Splits the passage into words; *asterisks* mark emphasis, spanning words. */
function tokenise(text: string): Word[] {
  const out: Word[] = [];
  const re = /\*([^*]+)\*|[^\s*]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[1]) m[1].split(/\s+/).forEach((w) => out.push({ text: w, em: true }));
    else if (/^[.,;:!?…)]+$/.test(m[0]) && out.length) out[out.length - 1].text += m[0];
    else out.push({ text: m[0], em: false });
  }
  return out;
}

/**
 * A pinned passage that lights one word at a time as the visitor scrolls.
 * The section is 280vh tall; the text sits sticky in the middle of it, so the
 * scrub has room to be slow.
 */
export function Manifesto() {
  const root = useRef<HTMLElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const words = useMemo(() => tokenise(MANIFESTO.text), []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    gsap.registerPlugin(ScrollTrigger);

    const spans = el.querySelectorAll<HTMLElement>('.manifesto__w');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const ctx = gsap.context(() => {
      if (reduced) {
        gsap.set(spans, { opacity: 1 });
        return;
      }
      gsap.set(spans, { opacity: 0.13 });
      gsap.to(spans, {
        opacity: 1,
        duration: 1,
        ease: 'none',
        stagger: 0.42,
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.45,
          onUpdate: (self) => {
            if (bar.current) bar.current.style.transform = `scaleX(${self.progress.toFixed(4)})`;
          },
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section className="manifesto" ref={root} data-label="On method">
      <div className="manifesto__sticky">
        <div className="manifesto__inner">
          <span className="label manifesto__eyebrow">{MANIFESTO.eyebrow}</span>
          <p className="manifesto__text">
            {words.map((w, i) => (
              <span key={i} className={`manifesto__w${w.em ? ' manifesto__w--em' : ''}`}>
                {w.text}
                {i < words.length - 1 ? ' ' : ''}
              </span>
            ))}
          </p>
          <span className="manifesto__bar">
            <span ref={bar} />
          </span>
        </div>
      </div>
    </section>
  );
}
