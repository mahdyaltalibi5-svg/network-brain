/**
 * Placeholder sound design, synthesised with the Web Audio API (no audio files):
 * low hum → stitch clicks → wind → whoosh on the transformation → shears snip.
 * Off by default; nothing is created until the visitor turns sound on.
 */
export type Cue = "hum" | "stitch" | "wind" | "whoosh" | "snip" | "stop";

export class IntroAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private hum: { stop: () => void } | null = null;
  private wind: { stop: () => void } | null = null;
  enabled = false;

  async enable() {
    this.enabled = true;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
    }
    await this.ctx.resume();
  }

  disable() {
    this.enabled = false;
    this.hum?.stop();
    this.wind?.stop();
    this.hum = this.wind = null;
  }

  dispose() {
    this.disable();
    this.ctx?.close();
    this.ctx = null;
  }

  cue(c: Cue) {
    if (!this.enabled || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const out = this.master;
    const now = ctx.currentTime;
    switch (c) {
      case "hum": {
        if (this.hum) return;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.16, now + 1.2);
        const oscs = [55, 82.4, 110.2].map((f, i) => {
          const o = ctx.createOscillator();
          o.type = i === 0 ? "sine" : "triangle";
          o.frequency.value = f;
          const og = ctx.createGain();
          og.gain.value = i === 0 ? 1 : 0.18;
          o.connect(og).connect(g);
          o.start();
          return o;
        });
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.35;
        lfoGain.gain.value = 0.05;
        lfo.connect(lfoGain).connect(g.gain);
        lfo.start();
        g.connect(out);
        this.hum = {
          stop: () => {
            const t = ctx.currentTime;
            g.gain.cancelScheduledValues(t);
            g.gain.setValueAtTime(g.gain.value, t);
            g.gain.linearRampToValueAtTime(0, t + 0.8);
            [...oscs, lfo].forEach((o) => o.stop(t + 0.85));
          },
        };
        return;
      }
      case "stitch": {
        // a short, bright click: filtered noise burst plus a tiny pitched tick
        const src = this.noise(0.05);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 3200 + Math.random() * 1800;
        bp.Q.value = 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.5, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
        src.connect(bp).connect(g).connect(out);
        src.start(now);
        return;
      }
      case "wind": {
        if (this.wind) return;
        const src = this.noise(4, true);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 500;
        bp.Q.value = 0.8;
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.frequency.value = 0.22;
        lfoG.gain.value = 320;
        lfo.connect(lfoG).connect(bp.frequency);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.22, now + 0.9);
        src.connect(bp).connect(g).connect(out);
        src.start(now);
        lfo.start(now);
        this.wind = {
          stop: () => {
            const t = ctx.currentTime;
            g.gain.setValueAtTime(g.gain.value, t);
            g.gain.linearRampToValueAtTime(0, t + 0.6);
            src.stop(t + 0.65);
            lfo.stop(t + 0.65);
          },
        };
        return;
      }
      case "whoosh": {
        this.wind?.stop();
        this.wind = null;
        const src = this.noise(1.4);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.Q.value = 1.4;
        bp.frequency.setValueAtTime(220, now);
        bp.frequency.exponentialRampToValueAtTime(2600, now + 0.55);
        bp.frequency.exponentialRampToValueAtTime(300, now + 1.3);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.5, now + 0.45);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.35);
        src.connect(bp).connect(g).connect(out);
        src.start(now);
        return;
      }
      case "snip": {
        // shears: two metallic transients, the second slightly lower
        [0, 0.11].forEach((dt, k) => {
          const src = this.noise(0.12);
          const hp = ctx.createBiquadFilter();
          hp.type = "highpass";
          hp.frequency.value = 2500;
          const ring = ctx.createBiquadFilter();
          ring.type = "peaking";
          ring.frequency.value = k ? 4200 : 5600;
          ring.Q.value = 18;
          ring.gain.value = 18;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now + dt);
          g.gain.exponentialRampToValueAtTime(0.6, now + dt + 0.005);
          g.gain.exponentialRampToValueAtTime(0.001, now + dt + 0.1);
          src.connect(hp).connect(ring).connect(g).connect(out);
          src.start(now + dt);
        });
        this.hum?.stop();
        this.hum = null;
        return;
      }
      case "stop":
        this.hum?.stop();
        this.wind?.stop();
        this.hum = this.wind = null;
        return;
    }
  }

  private noise(seconds: number, loop = false) {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    return src;
  }
}
