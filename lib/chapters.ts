export type Chapter = {
  index: string;
  id: string;
  title: string;
  /** display lines for the headline, split for staggered reveal */
  headline: string[];
  body: string[];
  /** small mono annotation shown beside the body */
  note?: string;
  /** temperature readout for the HUD, in kelvin */
  kelvin: number;
};

export const CHAPTERS: Chapter[] = [
  {
    index: '00',
    id: 'ignition',
    title: 'Ignition',
    headline: ['Cinderglass'],
    body: ['A study in slow combustion.'],
    kelvin: 4300,
  },
  {
    index: '01',
    id: 'fracture',
    title: 'Fracture',
    headline: ['Everything that', 'holds a shape', 'was once too', 'hot to hold.'],
    body: [
      'Heat does not destroy structure. It suspends the argument for it.',
      'For a few seconds the material forgets which way it was folded — and that forgetting is the only moment it can be made into something else.',
    ],
    note: 'Phase I — the shell gives way along the lines it was already carrying.',
    kelvin: 1870,
  },
  {
    index: '02',
    id: 'drift',
    title: 'Drift',
    headline: ['Ash is not the', 'end of fire.', 'It is fire,', 'told slowly.'],
    body: [
      'What leaves the flame is not waste. It is the same event, running at a speed we can finally stand to watch.',
      'Every particle here still carries the vector it was given at the burst. It simply has the rest of the room to spend it in.',
    ],
    note: 'Phase II — drift field, no attractor, no correction.',
    kelvin: 740,
  },
  {
    index: '03',
    id: 'anneal',
    title: 'Anneal',
    headline: ['Glass is a liquid', 'that agreed', 'to wait.'],
    body: [
      'Anneal too fast and the surface sets while the core is still moving. The object survives the night and fails in the morning, for reasons it acquired hours earlier.',
      'So the kiln comes down by degrees. Patience is not a virtue here — it is a load-bearing element.',
    ],
    note: 'Phase III — controlled descent, 4°C per minute.',
    kelvin: 812,
  },
  {
    index: '04',
    id: 'residue',
    title: 'Residue',
    headline: ['Nothing burns', 'twice the', 'same way.'],
    body: [
      'The record of a fire is not the fire. It is the shape the room was left in.',
      'You have been reading one now for about four minutes.',
    ],
    note: 'Phase IV — the field returns what it borrowed.',
    kelvin: 291,
  },
];
