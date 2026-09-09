'use client';

/**
 * The soundtrack is synthesised, not loaded: two detuned sines an octave below
 * A1, a filtered saw for body, and a band-passed noise bed that stands in for
 * the crackle. Cutoff and hiss track the chapter, so the room cools audibly.
 */
export class Drone {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private cutoff: BiquadFilterNode | null = null;
  private hiss: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];

  on = false;

  private build() {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const cutoff = ctx.createBiquadFilter();
    cutoff.type = 'lowpass';
    cutoff.frequency.value = 420;
    cutoff.Q.value = 0.8;
    cutoff.connect(master);
    this.cutoff = cutoff;

    const voice = (type: OscillatorType, freq: number, gain: number) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g).connect(cutoff);
      osc.start();
      this.sources.push(osc);
      return osc;
    };

    voice('sine', 55, 0.5);
    voice('sine', 55.19, 0.42); // ~0.2 Hz beat
    voice('sine', 82.4, 0.11); // a fifth, barely there
    voice('sawtooth', 110, 0.055);

    // Noise bed.
    const len = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.06; // brown-ish, gentler than white
      data[i] = b0;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 900;
    band.Q.value = 0.9;

    const hiss = ctx.createGain();
    hiss.gain.value = 0.35;
    noise.connect(band).connect(hiss).connect(master);
    noise.start();
    this.sources.push(noise);
    this.hiss = hiss;

    // Slow swell on the cutoff so the drone never sits still.
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.055;
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain).connect(cutoff.frequency);
    lfo.start();
    this.sources.push(lfo);
  }

  async toggle() {
    if (!this.ctx) this.build();
    const ctx = this.ctx!;
    if (ctx.state === 'suspended') await ctx.resume();

    this.on = !this.on;
    this.master?.gain.setTargetAtTime(this.on ? 0.085 : 0, ctx.currentTime, this.on ? 1.4 : 0.6);
    return this.on;
  }

  /** Called at a low rate; the room cools as the piece progresses. */
  update(phase: number) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime;
    this.cutoff?.frequency.setTargetAtTime(560 - phase * 96, t, 1.5);
    this.hiss?.gain.setTargetAtTime(Math.max(0.05, 0.4 - phase * 0.085), t, 1.5);
  }

  dispose() {
    this.sources.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* already stopped */
      }
    });
    this.sources = [];
    this.ctx?.close().catch(() => {});
    this.ctx = null;
    this.on = false;
  }
}
