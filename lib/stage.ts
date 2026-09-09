/**
 * A mutable, non-reactive store.
 *
 * Scroll progress and pointer position change every frame; routing them through
 * React state would re-render the tree 60 times a second. Everything that the
 * WebGL scene reads per-frame lives here and is mutated in place.
 */
export type Stage = {
  /** eased scroll position, 0 -> 1 across the whole document */
  progress: number;
  /** raw (un-eased) scroll position, 0 -> 1 */
  raw: number;
  /** normalised scroll velocity, roughly -1 -> 1 */
  velocity: number;
  /** progress mapped onto the chapter index space, 0 -> 4 */
  phase: number;
  /** un-damped phase, written by the per-chapter scroll triggers */
  phaseTarget: number;
  /** pointer in NDC-ish space, -1 -> 1, damped */
  pointer: { x: number; y: number };
  /** pointer target before damping */
  pointerTarget: { x: number; y: number };
  /** false until the first pointer event, so the field is not dented at (0,0) */
  pointerSeen: boolean;
  /** 0 -> 1 across the Kiln traverse; the camera makes one full orbit on it */
  orbit: number;
  orbitTarget: number;
  /** what the HUD names the section currently under the viewport centre */
  label: string;
  /** true once the first WebGL frame has been presented */
  ready: boolean;
  /** true once the visitor has passed the entry gate */
  entered: number;
  reducedMotion: boolean;
};

export const stage: Stage = {
  progress: 0,
  raw: 0,
  velocity: 0,
  phase: 0,
  phaseTarget: 0,
  pointer: { x: 0, y: 0 },
  pointerTarget: { x: 0, y: 0 },
  pointerSeen: false,
  orbit: 0,
  orbitTarget: 0,
  label: '00 · Ignition',
  ready: false,
  entered: 0,
  reducedMotion: false,
};

/** Framerate-independent exponential damping. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
