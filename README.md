# Cinderglass

*A study in slow combustion.* — a real-time WebGL piece in five chapters.

A field of 130,000 embers ignites, fractures, drifts, anneals around a slab of
black glass, and settles into ash. Scroll is the only control. Nothing is
loaded: no textures, no models, no HDRIs, no audio files. Every pixel and every
tone is generated on the device, each frame.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm run start
```

Node 20+. No environment variables, no external services.

## How it works

**One point cloud, no simulation.** Instead of a GPGPU ping-pong buffer, every
particle's position is *derived* each frame in the vertex shader from a stable
seed. Five target formations are evaluated and cross-faded by a single `uPhase`
uniform that scroll drives from 0 to 4:

| phase | formation | chapter |
| --- | --- | --- |
| 0 | corona around a molten body | 00 Ignition |
| 1 | shell quantised into tumbling plates | 01 Fracture |
| 2 | wide turbulent drift field | 02 Drift |
| 3 | orbiting annulus, inner radii faster | 03 Anneal |
| 4 | rising ash column | 04 Residue |

The morph to each formation happens as its chapter approaches; through the
interludes the field holds the previous formation, fully resolved.

The system is stateless, so scrubbing backwards retraces it exactly, and the
whole field is one draw call. At most two formations carry weight at a time and
`uPhase` is uniform across the draw, so the branches in the shader are
wave-uniform and effectively free.

**Three pinned interludes sit between the chapters.** Each is a tall section
with a sticky inner, so the scrub has room to be slow:

- *On method* — a passage that lights one word at a time as you scroll.
- *The Kiln* — a 420vh horizontal traverse through five glass specimens. The
  same progress drives the camera through one full orbit of the shattered
  field, so the room turns as the specimens go past.
- *The Record* — the annealing schedule as a curve that draws itself, with a
  live kelvin readout, elapsed time and state.

**The field answers the pointer.** A world-space repulsion in the vertex
shader parts the embers around the cursor and warms the ones it touches; the
force scales with pointer speed, so a resting hand only dents the field.

**Phase is not linear in scroll.** One `ScrollTrigger` per chapter maps "this
chapter is centred in the viewport" to an exact integer phase. The formation is
always fully resolved while its text is readable, and the morphs happen in the
space between. Turbulence peaks at the midpoint of each transition, so
formations swirl into each other instead of sliding along straight lines.

**Nothing per-frame goes through React.** Scroll position, velocity and pointer
live in a mutable module (`lib/stage.ts`) that the render loop reads directly.
Only the discrete chapter index reaches React state, and only when it changes.

## Layout

```
app/            routes, metadata, generated icon + OG image, design tokens
components/
  scene/        Canvas, camera rig, ember field, body, monolith, post stack
  ui/           preloader, HUD, chapters, cursor
                Manifesto, Kiln, ThermalRecord, Marquee — the interludes
lib/
  shaders/      shared GLSL — hashes, simplex noise, flow field, rotation
  stage.ts      the mutable per-frame store
  scrolling.ts  Lenis -> ScrollTrigger -> stage
  drone.ts      Web Audio drone, synthesised on the fly
  chapters.ts   the chapters
  content.ts    the manifesto, the specimen index, the schedule
```

## Notes

- **Uniforms are read back off the material.** React Three Fiber clones the
  `uniforms` prop when it applies it, so the object handed to `<shaderMaterial>`
  is not the one the GPU sees. Every per-frame write goes through
  `matRef.current.uniforms`.
- **AgX, not ACES.** The palette is almost entirely saturated orange, and ACES
  shifts it toward yellow-white the moment it clips. AgX holds the hue into the
  highlights.
- **The monolith is hand-shaded.** A near-mirror PBR metal needs an environment
  to reflect, and the only environment here is a particle field. Flat box
  normals give one constant highlight per face, which is how polished stone
  actually behaves.
- **Quality tiers.** Coarse pointer, narrow viewport or ≤4 cores drops to 34,000
  particles and a lighter post stack. `prefers-reduced-motion` disables smooth
  scroll, the reveal animations and the camera float.
- Sound is off by default and starts only on an explicit toggle.

## Stack

Next.js · React Three Fiber · three.js · GSAP ScrollTrigger · Lenis · postprocessing
