import { AudioSettings } from '../types/pinball';

// Pentatonic / warm major scale frequencies (C5 major pentatonic + octaves)
const MUSIC_BOX_MELODY: (number | null)[] = [
  523.25, 659.25, 783.99, 659.25, 880.0, 783.99, 659.25, 587.33,
  523.25, 587.33, 659.25, 783.99, 659.25, null, 587.33, null,
  523.25, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 587.33,
  659.25, 587.33, 523.25, 440.0, 523.25, null, 392.0, null,
];

const MUSIC_BOX_BASS: (number | null)[] = [
  261.63, null, null, null, 220.0, null, null, null,
  174.61, null, null, null, 196.0, null, null, null,
  261.63, null, null, null, 220.0, null, null, null,
  174.61, null, 196.0, null, 261.63, null, null, null,
];

const COMBO_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];

class PinballSoundEngine {
  private ctx: AudioContext | null = null;
  private settings: AudioSettings = { bgmEnabled: true, sfxEnabled: true };
  private bgmTimer: number | null = null;
  private stepIndex = 0;
  private bgmShouldPlay = false;
  private lastWallSoundAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (ctx && this.bgmShouldPlay && this.settings.bgmEnabled && this.bgmTimer === null) {
      this.startLoop();
    }
  }

  public updateSettings(next: AudioSettings): void {
    this.settings = next;
    if (!next.bgmEnabled) {
      this.stopLoop();
    } else if (this.bgmShouldPlay) {
      this.ensureContext();
      this.startLoop();
    }
  }

  public setBgmPlaying(playing: boolean): void {
    this.bgmShouldPlay = playing;
    if (playing && this.settings.bgmEnabled) {
      this.ensureContext();
      this.startLoop();
    } else {
      this.stopLoop();
    }
  }

  private startLoop(): void {
    if (this.bgmTimer !== null) return;
    const stepMs = 260; // ~115 BPM eighth-note cheerful music box feel
    this.bgmTimer = window.setInterval(() => {
      if (!this.settings.bgmEnabled || !this.bgmShouldPlay) return;
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;

      const lead = MUSIC_BOX_MELODY[this.stepIndex % MUSIC_BOX_MELODY.length];
      const bass = MUSIC_BOX_BASS[this.stepIndex % MUSIC_BOX_BASS.length];
      const now = ctx.currentTime;

      if (lead) {
        this.playMusicBoxNote(ctx, lead, now, 0.045, 0.55);
      }
      if (bass) {
        this.playMusicBoxNote(ctx, bass, now, 0.028, 0.75);
      }

      this.stepIndex = (this.stepIndex + 1) % MUSIC_BOX_MELODY.length;
    }, stepMs);
  }

  private stopLoop(): void {
    if (this.bgmTimer !== null) {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private playMusicBoxNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    volume: number,
    duration: number
  ): void {
    const osc = ctx.createOscillator();
    const overtone = ctx.createOscillator();
    const gain = ctx.createGain();
    const overGain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    overGain.gain.setValueAtTime(0.0001, startTime);
    overGain.gain.exponentialRampToValueAtTime(volume * 0.28, startTime + 0.008);
    overGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.45);

    osc.connect(gain);
    overtone.connect(overGain);
    overGain.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    overtone.start(startTime);
    osc.stop(startTime + duration + 0.02);
    overtone.stop(startTime + duration + 0.02);
  }

  public playFlipperUp(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playLaunch(powerRatio: number): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const startFreq = 180 + powerRatio * 100;
    const endFreq = 460 + powerRatio * 340;
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.16);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playTriangleBumper(points: number, comboCount: number): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const baseIndex = points === 50 ? 3 : points === 20 ? 1 : 0;
    const scaleIndex = Math.min(COMBO_SCALE.length - 1, baseIndex + Math.max(0, comboCount - 1));
    const freq = COMBO_SCALE[scaleIndex];

    this.playMusicBoxNote(ctx, freq, now, 0.14, 0.36);
    if (points === 50 || comboCount >= 3) {
      this.playMusicBoxNote(ctx, freq * 1.5, now + 0.03, 0.08, 0.32);
    }
  }

  public playSideBumper(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(240, now + 0.08);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playWallTap(speed: number): void {
    if (!this.settings.sfxEnabled) return;
    const nowMs = performance.now();
    if (nowMs - this.lastWallSoundAt < 55 || speed < 140) return;
    this.lastWallSoundAt = nowMs;

    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const volume = Math.min(0.055, (speed / 1200) * 0.055);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playVanishHole(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    osc.frequency.exponentialRampToValueAtTime(170, now + 0.28);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playWarpReentry(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.playMusicBoxNote(ctx, 523.25, now, 0.1, 0.22);
    this.playMusicBoxNote(ctx, 783.99, now + 0.08, 0.11, 0.26);
    this.playMusicBoxNote(ctx, 1046.5, now + 0.17, 0.12, 0.34);
  }

  public playBallDrain(): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    this.playMusicBoxNote(ctx, 392.0, now, 0.09, 0.25);
    this.playMusicBoxNote(ctx, 293.66, now + 0.11, 0.09, 0.35);
  }

  public playGameOver(isTopRank: boolean): void {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const notes = isTopRank
      ? [523.25, 659.25, 783.99, 1046.5]
      : [523.25, 440.0, 392.0, 523.25];
    notes.forEach((freq, idx) => {
      this.playMusicBoxNote(ctx, freq, now + idx * 0.11, 0.1, 0.45);
    });
  }
}

export const soundEngine = new PinballSoundEngine();
