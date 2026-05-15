import { state } from './state';

type OscType = 'sine' | 'square' | 'triangle' | 'sawtooth';

interface NoteOpts {
  freq: number;
  duration?: number;
  type?: OscType;
  volume?: number;
  attack?: number;
  release?: number;
  detune?: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicNodes: { stop: () => void } | null = null;
  private currentMood: string | null = null;
  private pendingMood: string | null = null;
  private comboPitch = 0;
  private comboResetTimer: ReturnType<typeof setTimeout> | null = null;
  private unlocked = false;

  /**
   * Create the AudioContext. On iOS Safari this MUST be called from inside
   * a user-gesture handler, otherwise the context will be created in a
   * permanently-suspended state on some iOS versions. Returns null if Web
   * Audio isn't supported at all (extremely rare).
   */
  ensureContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.value = state.mute ? 0 : 0.85;
      master.connect(ctx.destination);
      const music = ctx.createGain();
      music.gain.value = 0.55;
      music.connect(master);
      const sfx = ctx.createGain();
      sfx.gain.value = 1;
      sfx.connect(master);
      this.ctx = ctx;
      this.master = master;
      this.musicGain = music;
      this.sfxGain = sfx;
      return ctx;
    } catch {
      return null;
    }
  }

  /**
   * Resume the AudioContext (required after creation on most browsers, and
   * after returning from background on iOS). Idempotent — safe to call
   * from every user gesture. Plays a 1-sample silent buffer the first
   * time, the canonical iOS unlock trick.
   */
  resume(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    if (!this.unlocked) {
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch {
        /* best-effort */
      }
      this.unlocked = true;
      // If music was requested before audio was unlocked, start it now.
      if (this.pendingMood && !this.musicNodes) {
        this.playMusic(this.pendingMood);
        this.pendingMood = null;
      }
    }
  }

  applyMute(): void {
    if (!this.master || !this.ctx) return;
    const target = state.mute ? 0 : 0.85;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(target, t + 0.1);
  }

  private playNote(opts: NoteOpts): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.unlocked) return;
    const {
      freq,
      duration = 0.18,
      type = 'triangle',
      volume = 0.4,
      attack = 0.005,
      release = 0.1,
      detune = 0,
    } = opts;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + attack);
    gain.gain.setValueAtTime(volume, now + duration);
    gain.gain.linearRampToValueAtTime(0, now + duration + release);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + release + 0.02);
  }

  private playNoise(duration: number, volume: number, filterFreq = 1200): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain || !this.unlocked) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start();
    src.stop(ctx.currentTime + duration);
  }

  // ─── Public SFX ───────────────────────────────────────────────────────

  collect(): void {
    const base = 660 + Math.min(this.comboPitch, 12) * 60;
    this.playNote({ freq: base, duration: 0.05, type: 'triangle', volume: 0.35, release: 0.08 });
    this.playNote({ freq: base * 1.5, duration: 0.07, type: 'sine', volume: 0.22, release: 0.12 });
    this.comboPitch += 1;
    if (this.comboResetTimer) clearTimeout(this.comboResetTimer);
    this.comboResetTimer = setTimeout(() => { this.comboPitch = 0; }, 1500);
  }

  bottle(): void {
    [880, 1320, 1760].forEach((f, i) => setTimeout(() => {
      this.playNote({ freq: f, duration: 0.05, type: 'sine', volume: 0.32, release: 0.1 });
    }, i * 35));
  }

  jump(): void {
    this.playNote({ freq: 520, duration: 0.05, type: 'square', volume: 0.18, release: 0.06 });
    this.playNote({ freq: 880, duration: 0.04, type: 'square', volume: 0.12, release: 0.06, detune: 30 });
  }

  doubleJump(): void {
    this.playNote({ freq: 720, duration: 0.04, type: 'square', volume: 0.16, release: 0.05 });
    this.playNote({ freq: 1080, duration: 0.05, type: 'sine', volume: 0.18, release: 0.08 });
  }

  slide(): void {
    this.playNoise(0.18, 0.18, 1800);
  }

  hit(): void {
    this.playNoise(0.25, 0.5, 600);
    this.playNote({ freq: 110, duration: 0.15, type: 'sawtooth', volume: 0.3, release: 0.18 });
  }

  death(): void {
    [440, 330, 220, 165].forEach((f, i) => setTimeout(() => {
      this.playNote({ freq: f, duration: 0.18, type: 'triangle', volume: 0.32, release: 0.18 });
    }, i * 110));
  }

  powerup(): void {
    [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => {
      this.playNote({ freq: f, duration: 0.07, type: 'triangle', volume: 0.28, release: 0.12 });
    }, i * 50));
  }

  victory(): void {
    [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => {
      this.playNote({ freq: f, duration: 0.12, type: 'triangle', volume: 0.32, release: 0.18 });
    }, i * 90));
  }

  click(): void {
    this.playNote({ freq: 880, duration: 0.03, type: 'square', volume: 0.18, release: 0.04 });
  }

  // ─── Music (procedural per island) ────────────────────────────────────

  playMusic(mood: string): void {
    if (this.currentMood === mood && this.musicNodes) return;
    // If audio isn't unlocked yet (no user gesture since page load),
    // queue the mood — resume() will start it as soon as the user taps.
    if (!this.unlocked || !this.ctx || !this.musicGain) {
      this.pendingMood = mood;
      return;
    }
    this.stopMusic();
    this.currentMood = mood;
    this.pendingMood = null;
    this.musicNodes = startProceduralLoop(this.ctx, this.musicGain, mood);
  }

  stopMusic(): void {
    if (this.musicNodes) {
      this.musicNodes.stop();
      this.musicNodes = null;
    }
    this.currentMood = null;
  }

  /** Call when the page is hidden (visibility change) so music can be
   * cleanly restarted on return — required on iOS where backgrounded
   * AudioContexts often get into a glitchy state. */
  suspendForBackground(): void {
    const mood = this.currentMood;
    this.stopMusic();
    if (mood) this.pendingMood = mood;
  }

  /** Restart whatever music was playing before background, after the
   * AudioContext has been resumed (i.e. inside a user gesture or
   * immediately on visibilitychange to visible). */
  restoreFromBackground(): void {
    if (!this.pendingMood) return;
    if (!this.unlocked || !this.ctx) return;
    const mood = this.pendingMood;
    this.pendingMood = null;
    this.playMusic(mood);
  }
}

interface PatternNote {
  step: number; // 16th notes
  freq: number;
  dur: number;
  type?: OscType;
  vol?: number;
}

interface MoodPattern {
  bpm: number;
  bass: PatternNote[];
  lead: PatternNote[];
  perc: number[]; // steps where shaker hits
  kick: number[];
}

const C4 = 261.63;
const E4 = 329.63;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.26;
const G5 = 783.99;
const A3 = 220.0;
const C3 = 130.81;
const E3 = 164.81;
const G3 = 196.0;

const PATTERNS: Record<string, MoodPattern> = {
  biguine: {
    bpm: 120,
    bass: [
      { step: 0, freq: C3, dur: 0.4 },
      { step: 4, freq: G3, dur: 0.4 },
      { step: 8, freq: A3, dur: 0.4 },
      { step: 12, freq: E3, dur: 0.4 },
    ],
    lead: [
      { step: 0, freq: E5, dur: 0.18 },
      { step: 2, freq: G5, dur: 0.18 },
      { step: 4, freq: D5, dur: 0.18 },
      { step: 6, freq: E5, dur: 0.18 },
      { step: 8, freq: C5, dur: 0.18 },
      { step: 10, freq: E5, dur: 0.18 },
      { step: 12, freq: A4, dur: 0.18 },
      { step: 14, freq: C5, dur: 0.18 },
    ],
    perc: [2, 6, 10, 14],
    kick: [0, 8],
  },
  calypso: {
    bpm: 128,
    bass: [
      { step: 0, freq: G3, dur: 0.4 },
      { step: 4, freq: C3, dur: 0.4 },
      { step: 8, freq: G3, dur: 0.4 },
      { step: 12, freq: A3, dur: 0.4 },
    ],
    lead: [
      { step: 0, freq: G4, dur: 0.18 },
      { step: 3, freq: C5, dur: 0.18 },
      { step: 6, freq: E5, dur: 0.18 },
      { step: 8, freq: G5, dur: 0.18 },
      { step: 11, freq: E5, dur: 0.18 },
      { step: 14, freq: D5, dur: 0.18 },
    ],
    perc: [1, 3, 5, 7, 9, 11, 13, 15],
    kick: [0, 4, 8, 12],
  },
  salsa: {
    bpm: 132,
    bass: [
      { step: 0, freq: C3, dur: 0.3 },
      { step: 3, freq: C3, dur: 0.3 },
      { step: 6, freq: G3, dur: 0.3 },
      { step: 8, freq: A3, dur: 0.3 },
      { step: 11, freq: E3, dur: 0.3 },
      { step: 14, freq: G3, dur: 0.3 },
    ],
    lead: [
      { step: 0, freq: C5, dur: 0.18 },
      { step: 2, freq: E5, dur: 0.18 },
      { step: 4, freq: G5, dur: 0.18 },
      { step: 6, freq: E5, dur: 0.18 },
      { step: 8, freq: A4, dur: 0.18 },
      { step: 10, freq: C5, dur: 0.18 },
      { step: 12, freq: E5, dur: 0.18 },
      { step: 14, freq: D5, dur: 0.18 },
    ],
    perc: [0, 2, 3, 6, 8, 10, 11, 14],
    kick: [0, 6, 8, 14],
  },
  samba: {
    bpm: 140,
    bass: [
      { step: 0, freq: C3, dur: 0.3 },
      { step: 4, freq: E3, dur: 0.3 },
      { step: 8, freq: G3, dur: 0.3 },
      { step: 12, freq: E3, dur: 0.3 },
    ],
    lead: [
      { step: 0, freq: E5, dur: 0.15 },
      { step: 2, freq: G5, dur: 0.15 },
      { step: 4, freq: A4, dur: 0.15 },
      { step: 5, freq: C5, dur: 0.15 },
      { step: 8, freq: D5, dur: 0.15 },
      { step: 10, freq: E5, dur: 0.15 },
      { step: 12, freq: G5, dur: 0.15 },
      { step: 14, freq: E5, dur: 0.15 },
    ],
    perc: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    kick: [0, 4, 8, 12],
  },
  marimba: {
    bpm: 110,
    bass: [
      { step: 0, freq: A3, dur: 0.4 },
      { step: 4, freq: E3, dur: 0.4 },
      { step: 8, freq: C3, dur: 0.4 },
      { step: 12, freq: G3, dur: 0.4 },
    ],
    lead: [
      { step: 0, freq: A4, dur: 0.2, type: 'sine' },
      { step: 2, freq: C5, dur: 0.2, type: 'sine' },
      { step: 4, freq: E5, dur: 0.2, type: 'sine' },
      { step: 6, freq: D5, dur: 0.2, type: 'sine' },
      { step: 8, freq: C5, dur: 0.2, type: 'sine' },
      { step: 10, freq: A4, dur: 0.2, type: 'sine' },
      { step: 12, freq: G4, dur: 0.2, type: 'sine' },
      { step: 14, freq: E4, dur: 0.2, type: 'sine' },
    ],
    perc: [4, 12],
    kick: [0, 8],
  },
  cumbia: {
    bpm: 96,
    bass: [
      { step: 0, freq: A3, dur: 0.5 },
      { step: 6, freq: A3, dur: 0.5 },
      { step: 8, freq: E3, dur: 0.5 },
      { step: 14, freq: G3, dur: 0.4 },
    ],
    lead: [
      { step: 0, freq: A4, dur: 0.18 },
      { step: 4, freq: C5, dur: 0.18 },
      { step: 6, freq: E5, dur: 0.18 },
      { step: 8, freq: D5, dur: 0.18 },
      { step: 12, freq: C5, dur: 0.18 },
      { step: 14, freq: A4, dur: 0.18 },
    ],
    perc: [2, 6, 10, 14],
    kick: [0, 4, 8, 12],
  },
  menu: {
    bpm: 100,
    bass: [
      { step: 0, freq: C3, dur: 0.5 },
      { step: 8, freq: G3, dur: 0.5 },
    ],
    lead: [
      { step: 0, freq: G4, dur: 0.3, type: 'sine' },
      { step: 4, freq: C5, dur: 0.3, type: 'sine' },
      { step: 8, freq: E5, dur: 0.3, type: 'sine' },
      { step: 12, freq: D5, dur: 0.3, type: 'sine' },
    ],
    perc: [4, 12],
    kick: [0, 8],
  },
};

function startProceduralLoop(ctx: AudioContext, out: GainNode, mood: string): { stop: () => void } {
  const pattern = PATTERNS[mood] ?? PATTERNS.menu;
  const stepDur = 60 / pattern.bpm / 4;
  const loopDur = stepDur * 16;

  let stopped = false;
  let nextLoopTime = ctx.currentTime + 0.05;
  const sources: AudioScheduledSourceNode[] = [];

  const schedulerInterval = window.setInterval(() => {
    if (stopped) return;
    while (nextLoopTime < ctx.currentTime + 0.5) {
      scheduleLoop(ctx, out, pattern, nextLoopTime, stepDur, sources);
      nextLoopTime += loopDur;
    }
  }, 100);

  return {
    stop() {
      stopped = true;
      clearInterval(schedulerInterval);
      sources.forEach((s) => {
        try { s.stop(); } catch { /* may already be stopped */ }
      });
    },
  };
}

function scheduleLoop(
  ctx: AudioContext,
  out: GainNode,
  pattern: MoodPattern,
  startAt: number,
  stepDur: number,
  sinks: AudioScheduledSourceNode[],
): void {
  for (const note of pattern.bass) {
    scheduleNote(ctx, out, note.freq, startAt + note.step * stepDur, note.dur, note.type ?? 'triangle', note.vol ?? 0.18, sinks);
  }
  for (const note of pattern.lead) {
    scheduleNote(ctx, out, note.freq, startAt + note.step * stepDur, note.dur, note.type ?? 'triangle', note.vol ?? 0.12, sinks);
  }
  for (const step of pattern.perc) {
    scheduleNoise(ctx, out, startAt + step * stepDur, 0.04, 0.08, 4000, sinks);
  }
  for (const step of pattern.kick) {
    scheduleKick(ctx, out, startAt + step * stepDur, sinks);
  }
}

function scheduleNote(
  ctx: AudioContext,
  out: GainNode,
  freq: number,
  at: number,
  dur: number,
  type: OscType,
  vol: number,
  sinks: AudioScheduledSourceNode[],
): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.01);
  g.gain.setValueAtTime(vol, at + dur * 0.6);
  g.gain.linearRampToValueAtTime(0, at + dur);
  osc.connect(g);
  g.connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.02);
  sinks.push(osc);
}

function scheduleNoise(
  ctx: AudioContext,
  out: GainNode,
  at: number,
  dur: number,
  vol: number,
  filterFreq: number,
  sinks: AudioScheduledSourceNode[],
): void {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = filterFreq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(at);
  src.stop(at + dur + 0.02);
  sinks.push(src);
}

function scheduleKick(ctx: AudioContext, out: GainNode, at: number, sinks: AudioScheduledSourceNode[]): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120, at);
  osc.frequency.exponentialRampToValueAtTime(40, at + 0.15);
  g.gain.setValueAtTime(0.3, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.2);
  osc.connect(g);
  g.connect(out);
  osc.start(at);
  osc.stop(at + 0.22);
  sinks.push(osc);
}

export const audio = new AudioEngine();
