/** Writing for the interludes: the manifesto, the specimen index, the curve. */

export const MANIFESTO = {
  eyebrow: 'On method',
  /** Words wrapped in *asterisks* are emphasised once lit. */
  text:
    'Most things are made by adding. Glass is made by *waiting*. You bring the material past the point where it can hold a shape, and then you take heat away from it *so slowly* that it never notices the moment it became solid. Every piece here is that moment, stretched out until it can be *read*.',
};

export type Specimen = {
  index: string;
  name: string;
  kelvin: number;
  line: string;
  detail: string;
  cooled: string;
  result: string;
  /** SVG polygon points in a 200×200 box */
  shape: string;
};

export const SPECIMENS: Specimen[] = [
  {
    index: '01',
    name: 'Slag',
    kelvin: 1620,
    line: 'First pour.',
    detail:
      'Too fast. The surface set in open air while the core was still moving, and the piece carried that argument inside it for six hours before it lost. Failed at 06:40, unprovoked.',
    cooled: '41 °C / min',
    result: 'fractured',
    shape: '38,22 150,10 186,72 170,168 94,192 22,150 14,84',
  },
  {
    index: '02',
    name: 'Cullet',
    kelvin: 1410,
    line: 'Broken, and returned.',
    detail:
      'Failed pieces go back into the furnace. Nothing here is lost; it is only reordered. Most of what you are looking at has been glass before, at least once.',
    cooled: '—',
    result: 'recycled',
    shape: '60,14 132,26 190,96 148,182 70,190 20,132 26,58',
  },
  {
    index: '03',
    name: 'Obsidian',
    kelvin: 1180,
    line: 'Cooled by weather.',
    detail:
      'Volcanic. Nobody annealed it, which is why the edges are the sharpest in the set and why it will one day, without warning, split along a plane it decided on ten thousand years ago.',
    cooled: 'unknown',
    result: 'conchoidal',
    shape: '100,8 168,54 192,140 126,194 48,178 10,104 40,32',
  },
  {
    index: '04',
    name: 'Frit',
    kelvin: 980,
    line: 'Ground, and fused again.',
    detail:
      'Crushed fine and fired a second time at a lower heat. The colour is whatever was folded in between the two firings — a record of the interval, not the material.',
    cooled: '12 °C / min',
    result: 'stable',
    shape: '30,40 120,12 178,40 188,120 150,186 62,184 12,116',
  },
  {
    index: '05',
    name: 'Lens',
    kelvin: 812,
    line: 'Held at the strain point.',
    detail:
      'Nine hours at 812 K. The only specimen in the set with no internal stress. Held to the light it shows nothing at all — which is the whole point, and took the longest to make.',
    cooled: '4 °C / min',
    result: 'annealed',
    shape: '100,10 172,44 194,112 160,178 100,192 40,178 6,112 28,44',
  },
];

/** The annealing schedule: hours → kelvin. */
export const SCHEDULE = {
  hours: 14,
  start: 1870,
  hold: 812,
  end: 291,
  kelvinAt(h: number): number {
    if (h <= 4) {
      // Fast exponential descent that lands exactly on the hold.
      const k = Math.exp(-h * 1.05);
      const k4 = Math.exp(-4 * 1.05);
      return this.hold + (this.start - this.hold) * ((k - k4) / (1 - k4));
    }
    if (h <= 9) return this.hold + Math.sin((h - 4) * 3.1) * 3;
    const t = (h - 9) / 5;
    const e = 1 - Math.pow(1 - t, 2.2);
    return this.hold + (this.end - this.hold) * e;
  },
  stateAt(h: number): string {
    if (h < 1.4) return 'Liquid';
    if (h < 3.4) return 'Working range';
    if (h < 4) return 'Softening point';
    if (h < 9) return 'Annealing · held';
    if (h < 12) return 'Strain point passed';
    return 'Rigid';
  },
};

export const MARQUEE = ['Cinderglass', 'Field study no. IX', 'A study in slow combustion', 'MMXXVI'];
