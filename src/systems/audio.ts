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
  private musicEl: HTMLAudioElement | null = null;
  private comboPitch = 0;
  private comboResetTimer: ReturnType<typeof setTimeout> | null = null;
  private unlocked = false;
  private musicPending = false;

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
    }
    // If music was requested before audio was unlocked, start it now
    // (always safe to call — playMusic is idempotent if already playing).
    if (this.musicPending) {
      this.musicPending = false;
      this.playMusic();
    }
  }

  applyMute(): void {
    if (this.master && this.ctx) {
      const target = state.mute ? 0 : 0.85;
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.linearRampToValueAtTime(target, t + 0.1);
    }
    // Music plays through an HTMLAudioElement (not Web Audio), so mute
    // it independently of the WebAudio master gain.
    if (this.musicEl) {
      this.musicEl.muted = state.mute;
    }
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

  // ─── Music (single ambient track: pi-bèl-bouteille) ───────────────────

  private ensureMusicEl(): HTMLAudioElement {
    if (this.musicEl) return this.musicEl;
    const el = new Audio('./music/pi-bel-bouteille.mp3');
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0.55;
    el.muted = state.mute;
    el.crossOrigin = 'anonymous';
    this.musicEl = el;
    return el;
  }

  /**
   * Plays the ambient track. The `mood` argument is kept for API
   * compatibility with the caller scenes but is ignored — there is now a
   * single hand-picked track for the whole game (Tmadkaud's own
   * "Pi-bèl-bouteille"). If the user hasn't tapped yet (so audio is
   * locked), queue the play and start it from the next gesture.
   */
  playMusic(_mood?: string): void {
    void _mood;
    const el = this.ensureMusicEl();
    el.muted = state.mute;
    if (!this.unlocked) {
      this.musicPending = true;
      return;
    }
    if (!el.paused) return;
    el.play().catch(() => {
      // Autoplay blocked — flag for retry on the next gesture.
      this.musicPending = true;
    });
  }

  stopMusic(): void {
    this.musicPending = false;
    if (this.musicEl) {
      this.musicEl.pause();
    }
  }

  /** Pause music when the page goes to background; iOS suspends the tab
   * and we want a clean restart on return. */
  suspendForBackground(): void {
    const wasPlaying = this.musicEl ? !this.musicEl.paused : false;
    this.stopMusic();
    if (wasPlaying) this.musicPending = true;
  }

  /** Resume music after background, when the page becomes visible. */
  restoreFromBackground(): void {
    if (!this.musicPending) return;
    this.musicPending = false;
    this.playMusic();
  }
}

export const audio = new AudioEngine();
