export interface AudioPreferences {
  enabled: boolean;
  muted: boolean;
  masterVolume: number; // 0..1
  ambienceVolume: number; // 0..1
  sfxVolume: number; // 0..1
}

export const DEFAULT_AUDIO_PREFS: AudioPreferences = {
  enabled: true,
  muted: false,
  masterVolume: 0.72,
  ambienceVolume: 0.6,
  sfxVolume: 0.8,
};

const STORAGE_KEY = 'ares4_audio_prefs_v1';

interface ActiveLoop {
  stop: (fadeSec?: number) => void;
  setLevel?: (level: number) => void;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private prefs: AudioPreferences = DEFAULT_AUDIO_PREFS;
  private userUnlocked = false;

  private activeLoops = new Map<string, ActiveLoop>();
  private lastCueMs = new Map<string, number>();

  constructor() {
    this.prefs = this.loadPrefs();
  }

  private loadPrefs(): AudioPreferences {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_AUDIO_PREFS };
      const parsed = JSON.parse(raw) as Partial<AudioPreferences>;
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : DEFAULT_AUDIO_PREFS.enabled,
        muted: typeof parsed.muted === 'boolean' ? parsed.muted : DEFAULT_AUDIO_PREFS.muted,
        masterVolume:
          typeof parsed.masterVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.masterVolume))
            : DEFAULT_AUDIO_PREFS.masterVolume,
        ambienceVolume:
          typeof parsed.ambienceVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.ambienceVolume))
            : DEFAULT_AUDIO_PREFS.ambienceVolume,
        sfxVolume:
          typeof parsed.sfxVolume === 'number'
            ? Math.max(0, Math.min(1, parsed.sfxVolume))
            : DEFAULT_AUDIO_PREFS.sfxVolume,
      };
    } catch {
      return { ...DEFAULT_AUDIO_PREFS };
    }
  }

  public savePrefs(next: AudioPreferences): void {
    this.prefs = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
    this.applyGains();
    if (!this.isAudible()) {
      this.cancelSpeech();
    }
  }

  public getPrefs(): AudioPreferences {
    return this.prefs;
  }

  public isAudible(): boolean {
    return this.userUnlocked && this.prefs.enabled && !this.prefs.muted && this.prefs.masterVolume > 0.005;
  }

  public unlockFromUserGesture(): boolean {
    this.userUnlocked = true;
    const ctx = this.ensureContext();
    if (!ctx) return false;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    this.applyGains();
    return true;
  }

  private ensureContext(): AudioContext | null {
    if (!this.userUnlocked) return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 6;
      comp.attack.value = 0.004;
      comp.release.value = 0.2;

      const master = ctx.createGain();
      const ambience = ctx.createGain();
      const sfx = ctx.createGain();

      ambience.connect(master);
      sfx.connect(master);
      master.connect(comp);
      comp.connect(ctx.destination);

      this.ctx = ctx;
      this.masterGain = master;
      this.ambienceGain = ambience;
      this.sfxGain = sfx;
      this.noiseBuffer = this.buildNoiseBuffer(ctx, 2.0);
      this.applyGains();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private buildNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Warm pink-ish noise for smoother engines, wind, dust, crowd
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = Math.max(-1, Math.min(1, (b0 + b1 + b2 + white * 0.18) * 0.14));
    }
    return buffer;
  }

  private applyGains(): void {
    if (!this.ctx || !this.masterGain || !this.ambienceGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const masterVal =
      this.prefs.enabled && !this.prefs.muted ? this.prefs.masterVolume : 0;
    this.masterGain.gain.setTargetAtTime(masterVal, now, 0.03);
    this.ambienceGain.gain.setTargetAtTime(this.prefs.ambienceVolume, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.prefs.sfxVolume, now, 0.03);
  }

  private canPlayCue(key: string, cooldownMs = 70): boolean {
    if (!this.isAudible()) return false;
    const now = performance.now();
    const prev = this.lastCueMs.get(key) ?? 0;
    if (now - prev < cooldownMs) return false;
    this.lastCueMs.set(key, now);
    return true;
  }

  public stopLoop(name: string, fadeSec = 0.25): void {
    const existing = this.activeLoops.get(name);
    if (existing) {
      this.activeLoops.delete(name);
      existing.stop(fadeSec);
    }
  }

  public setLoopLevel(name: string, level: number): void {
    const existing = this.activeLoops.get(name);
    existing?.setLevel?.(level);
  }

  public stopAllLoops(fadeSec = 0.25): void {
    for (const key of Array.from(this.activeLoops.keys())) {
      this.stopLoop(key, fadeSec);
    }
    this.cancelSpeech();
  }

  public cancelSpeech(): void {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // Ignore
    }
  }

  public speakAnnouncement(text: string): void {
    if (!this.isAudible() || this.prefs.sfxVolume < 0.05) return;
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.04;
      utter.pitch = 0.92;
      utter.volume = Math.min(1, this.prefs.masterVolume * this.prefs.sfxVolume * 0.9);
      window.speechSynthesis.speak(utter);
    } catch {
      // Ignore speech synthesis failures
    }
  }

  // ---------------- LOW-LEVEL TONE & NOISE HELPERS ----------------

  private playTone(opts: {
    freq: number;
    endFreq?: number;
    type?: OscillatorType;
    duration?: number;
    gain?: number;
    delay?: number;
    channel?: 'sfx' | 'ambience';
  }): void {
    const ctx = this.ensureContext();
    const out = opts.channel === 'ambience' ? this.ambienceGain : this.sfxGain;
    if (!ctx || !out) return;

    const start = ctx.currentTime + (opts.delay ?? 0);
    const dur = opts.duration ?? 0.14;
    const peak = opts.gain ?? 0.15;

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(opts.freq, start);
    if (opts.endFreq && opts.endFreq !== opts.freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.endFreq), start + dur);
    }

    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(peak, start + Math.min(0.015, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);

    osc.connect(g);
    g.connect(out);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  }

  private playNoiseBurst(opts: {
    filterType: BiquadFilterType;
    freq: number;
    endFreq?: number;
    q?: number;
    duration: number;
    gain: number;
    delay?: number;
    channel?: 'sfx' | 'ambience';
  }): void {
    const ctx = this.ensureContext();
    const out = opts.channel === 'ambience' ? this.ambienceGain : this.sfxGain;
    if (!ctx || !out || !this.noiseBuffer) return;

    const start = ctx.currentTime + (opts.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType;
    filter.frequency.setValueAtTime(opts.freq, start);
    if (opts.endFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, opts.endFreq), start + opts.duration);
    }
    if (opts.q) filter.Q.value = opts.q;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(opts.gain, start + Math.min(0.025, opts.duration * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(out);
    src.start(start);
    src.stop(start + opts.duration + 0.03);
  }

  // ---------------- PHASE 1: ROVER ASSEMBLY ----------------

  public playUiClick(): void {
    if (!this.canPlayCue('ui-click', 65)) return;
    this.playTone({ freq: 880, endFreq: 1120, type: 'triangle', duration: 0.055, gain: 0.09 });
  }

  public playDragMove(): void {
    if (!this.canPlayCue('drag-move', 220)) return;
    this.playTone({ freq: 240, endFreq: 310, type: 'sine', duration: 0.09, gain: 0.045 });
    this.playNoiseBurst({
      filterType: 'bandpass',
      freq: 900,
      q: 2.2,
      duration: 0.075,
      gain: 0.035,
    });
  }

  public playInstallSlide(): void {
    if (!this.canPlayCue('install-slide', 260)) return;
    this.playTone({ freq: 180, endFreq: 360, type: 'triangle', duration: 0.48, gain: 0.08 });
    this.playNoiseBurst({
      filterType: 'bandpass',
      freq: 620,
      endFreq: 1200,
      q: 1.8,
      duration: 0.42,
      gain: 0.06,
    });
  }

  public playInstallLock(): void {
    if (!this.canPlayCue('install-lock', 200)) return;
    this.playTone({ freq: 190, endFreq: 75, type: 'triangle', duration: 0.12, gain: 0.22 });
    this.playTone({ freq: 1180, endFreq: 860, type: 'sine', duration: 0.09, gain: 0.1, delay: 0.03 });
    this.playNoiseBurst({
      filterType: 'bandpass',
      freq: 1850,
      q: 3,
      duration: 0.08,
      gain: 0.12,
    });
  }

  public playDiagnosticBeep(passed = true): void {
    if (!this.canPlayCue(passed ? 'diag-pass' : 'diag-step', 120)) return;
    if (passed) {
      this.playTone({ freq: 740, type: 'sine', duration: 0.07, gain: 0.09 });
      this.playTone({ freq: 1080, type: 'sine', duration: 0.12, gain: 0.1, delay: 0.06 });
    } else {
      this.playTone({ freq: 620, type: 'sine', duration: 0.06, gain: 0.06 });
    }
  }

  public playConfirmChord(): void {
    if (!this.canPlayCue('confirm-chord', 500)) return;
    this.playTone({ freq: 523.25, type: 'triangle', duration: 0.28, gain: 0.12, delay: 0 });
    this.playTone({ freq: 659.25, type: 'triangle', duration: 0.3, gain: 0.12, delay: 0.07 });
    this.playTone({ freq: 783.99, type: 'sine', duration: 0.42, gain: 0.14, delay: 0.14 });
    this.playTone({ freq: 1046.5, type: 'sine', duration: 0.5, gain: 0.11, delay: 0.22 });
  }

  // ---------------- PHASE 2: MACHINE ACTIVATION ----------------

  public playPowerStartup(): void {
    if (!this.canPlayCue('power-startup', 800)) return;
    this.playTone({ freq: 95, endFreq: 520, type: 'sawtooth', duration: 0.95, gain: 0.09 });
    this.playTone({ freq: 190, endFreq: 760, type: 'sine', duration: 0.85, gain: 0.08, delay: 0.1 });
  }

  public playElectricalRelay(): void {
    if (!this.canPlayCue('elec-relay', 240)) return;
    this.playNoiseBurst({
      filterType: 'highpass',
      freq: 2400,
      duration: 0.045,
      gain: 0.11,
    });
    this.playTone({ freq: 1320, endFreq: 1640, type: 'sine', duration: 0.12, gain: 0.09, delay: 0.02 });
  }

  public playMotorWhir(pitchHz = 260, duration = 0.55): void {
    if (!this.canPlayCue(`motor-${Math.round(pitchHz / 40)}`, 280)) return;
    this.playTone({
      freq: pitchHz,
      endFreq: pitchHz * 1.18,
      type: 'triangle',
      duration,
      gain: 0.075,
    });
    this.playNoiseBurst({
      filterType: 'bandpass',
      freq: pitchHz * 2.1,
      q: 2.8,
      duration,
      gain: 0.045,
    });
  }

  public playArmServo(duration = 0.65): void {
    if (!this.canPlayCue('arm-servo', 320)) return;
    this.playTone({ freq: 310, endFreq: 440, type: 'sawtooth', duration: duration * 0.55, gain: 0.045 });
    this.playTone({
      freq: 440,
      endFreq: 280,
      type: 'triangle',
      duration: duration * 0.45,
      gain: 0.055,
      delay: duration * 0.45,
    });
  }

  public playAntennaSlew(): void {
    if (!this.canPlayCue('antenna-slew', 400)) return;
    this.playTone({ freq: 380, endFreq: 520, type: 'sine', duration: 0.4, gain: 0.06 });
    this.playTone({ freq: 1480, endFreq: 1860, type: 'sine', duration: 0.14, gain: 0.07, delay: 0.25 });
  }

  // ---------------- PHASE 3: ROCKET LAUNCH ----------------

  public startPadCrowdLoop(): void {
    if (!this.isAudible() || this.activeLoops.has('pad-crowd')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.ambienceGain || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'bandpass';
    lp.frequency.value = 540;
    lp.Q.value = 0.7;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.35;
    lfoGain.gain.value = 0.025;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 0.6);

    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    src.connect(lp);
    lp.connect(g);
    g.connect(this.ambienceGain);

    src.start();
    lfo.start();

    this.activeLoops.set('pad-crowd', {
      stop: (fade = 0.6) => {
        const now = ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            src.stop();
            lfo.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 60);
      },
    });
  }

  public playCountdownBeep(finalUrgent = false): void {
    if (!this.canPlayCue('cd-beep', 400)) return;
    this.playTone({
      freq: finalUrgent ? 1160 : 880,
      type: 'sine',
      duration: finalUrgent ? 0.18 : 0.09,
      gain: finalUrgent ? 0.13 : 0.085,
    });
  }

  public playWarningSiren(): void {
    if (!this.canPlayCue('warn-siren', 900)) return;
    this.playTone({ freq: 520, endFreq: 720, type: 'sawtooth', duration: 0.36, gain: 0.065 });
    this.playTone({ freq: 720, endFreq: 480, type: 'sawtooth', duration: 0.36, gain: 0.055, delay: 0.38 });
  }

  public playRocketIgnition(): void {
    if (!this.canPlayCue('rocket-ignition', 1000)) return;
    this.playNoiseBurst({
      filterType: 'lowpass',
      freq: 920,
      endFreq: 420,
      duration: 1.4,
      gain: 0.24,
    });
    this.playTone({ freq: 88, endFreq: 48, type: 'sawtooth', duration: 1.2, gain: 0.16 });
  }

  public startRocketExhaustLoop(): void {
    if (!this.isAudible() || this.activeLoops.has('rocket-exhaust')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 340;

    const sub = ctx.createOscillator();
    sub.type = 'sawtooth';
    sub.frequency.value = 52;

    const subGain = ctx.createGain();
    subGain.gain.value = 0.14;

    const masterLoopGain = ctx.createGain();
    masterLoopGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterLoopGain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 0.5);

    src.connect(lp);
    lp.connect(masterLoopGain);
    sub.connect(subGain);
    subGain.connect(masterLoopGain);
    masterLoopGain.connect(this.sfxGain);

    src.start();
    sub.start();

    this.activeLoops.set('rocket-exhaust', {
      setLevel: (level: number) => {
        const now = ctx.currentTime;
        const clamped = Math.max(0.02, Math.min(1, level));
        masterLoopGain.gain.setTargetAtTime(0.32 * clamped, now, 0.25);
        lp.frequency.setTargetAtTime(140 + clamped * 260, now, 0.25);
      },
      stop: (fade = 0.8) => {
        const now = ctx.currentTime;
        masterLoopGain.gain.setValueAtTime(masterLoopGain.gain.value, now);
        masterLoopGain.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            src.stop();
            sub.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 80);
      },
    });
  }

  public playStageSeparation(): void {
    if (!this.canPlayCue('stage-sep', 500)) return;
    this.playTone({ freq: 140, endFreq: 48, type: 'triangle', duration: 0.22, gain: 0.2 });
    this.playNoiseBurst({
      filterType: 'bandpass',
      freq: 1400,
      endFreq: 420,
      duration: 0.28,
      gain: 0.16,
    });
  }

  // ---------------- PHASE 4: DEEP SPACE CRUISE ----------------

  public startSpaceAmbienceLoop(): void {
    if (!this.isAudible() || this.activeLoops.has('space-ambience')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.ambienceGain) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const osc3 = ctx.createOscillator();
    osc1.type = 'sine';
    osc2.type = 'sine';
    osc3.type = 'triangle';
    osc1.frequency.value = 65.41; // C2
    osc2.frequency.value = 98.0; // G2
    osc3.frequency.value = 196.0; // G3

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 1.1);

    const g3 = ctx.createGain();
    g3.gain.value = 0.32;

    osc1.connect(lp);
    osc2.connect(lp);
    osc3.connect(g3);
    g3.connect(lp);
    lp.connect(g);
    g.connect(this.ambienceGain);

    osc1.start();
    osc2.start();
    osc3.start();

    this.activeLoops.set('space-ambience', {
      stop: (fade = 0.7) => {
        const now = ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
            osc3.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 80);
      },
    });
  }

  public startSpacecraftHumLoop(): void {
    if (!this.isAudible() || this.activeLoops.has('cruise-hum')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.ambienceGain) return;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 112;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.045, ctx.currentTime + 0.6);

    osc.connect(g);
    g.connect(this.ambienceGain);
    osc.start();

    this.activeLoops.set('cruise-hum', {
      stop: (fade = 0.5) => {
        const now = ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            osc.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 60);
      },
    });
  }

  public playControlPanelBeep(): void {
    if (!this.canPlayCue('panel-beep', 180)) return;
    this.playTone({ freq: 1240, type: 'sine', duration: 0.065, gain: 0.075 });
  }

  public playCommPing(): void {
    if (!this.canPlayCue('comm-ping', 320)) return;
    this.playTone({ freq: 1620, endFreq: 2140, type: 'sine', duration: 0.14, gain: 0.08 });
    this.playTone({ freq: 2140, endFreq: 1780, type: 'sine', duration: 0.16, gain: 0.06, delay: 0.13 });
  }

  public playNotificationChime(): void {
    if (!this.canPlayCue('mission-notif', 300)) return;
    this.playTone({ freq: 660, type: 'sine', duration: 0.11, gain: 0.085 });
    this.playTone({ freq: 990, type: 'sine', duration: 0.18, gain: 0.09, delay: 0.09 });
  }

  // ---------------- PHASE 5: MARS ENTRY, DESCENT & LANDING ----------------

  public startEntryPlasmaLoop(): void {
    if (!this.isAudible() || this.activeLoops.has('entry-plasma')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 740;
    bp.Q.value = 1.1;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.5);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start();

    this.activeLoops.set('entry-plasma', {
      stop: (fade = 0.4) => {
        const now = ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            src.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 60);
      },
    });
  }

  public playParachuteDeploy(): void {
    if (!this.canPlayCue('chute-deploy', 800)) return;
    this.playTone({ freq: 160, endFreq: 52, type: 'triangle', duration: 0.25, gain: 0.22 });
    this.playNoiseBurst({
      filterType: 'bandpass',
      freq: 1100,
      endFreq: 480,
      duration: 0.65,
      gain: 0.2,
    });
  }

  public startDescentEngineLoop(): void {
    if (!this.isAudible() || this.activeLoops.has('descent-engine')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 460;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.19, ctx.currentTime + 0.35);

    src.connect(lp);
    lp.connect(g);
    g.connect(this.sfxGain);
    src.start();

    this.activeLoops.set('descent-engine', {
      stop: (fade = 0.45) => {
        const now = ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            src.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 60);
      },
    });
  }

  public playMarsTouchdown(): void {
    if (!this.canPlayCue('mars-touchdown', 800)) return;
    this.playTone({ freq: 115, endFreq: 38, type: 'sine', duration: 0.34, gain: 0.24 });
    this.playNoiseBurst({
      filterType: 'lowpass',
      freq: 620,
      endFreq: 220,
      duration: 0.75,
      gain: 0.14,
      delay: 0.05,
    });
  }

  public playRoverDeploy(): void {
    if (!this.canPlayCue('rover-deploy', 500)) return;
    this.playArmServo(0.75);
    this.playTone({ freq: 240, endFreq: 180, type: 'triangle', duration: 0.15, gain: 0.12, delay: 0.45 });
  }

  // ---------------- PHASE 6: MARS EXPLORATION ----------------

  public startMarsWindAmbience(): void {
    if (!this.isAudible() || this.activeLoops.has('mars-wind')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.ambienceGain || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 340;
    bp.Q.value = 1.4;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.075, ctx.currentTime + 0.8);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.ambienceGain);
    src.start();

    this.activeLoops.set('mars-wind', {
      stop: (fade = 0.5) => {
        const now = ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            src.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 60);
      },
    });
  }

  public setRoverDriveAudio(active: boolean, speedNorm = 0.7, turning = false): void {
    if (!active || !this.isAudible()) {
      this.stopLoop('rover-drive', 0.15);
      return;
    }

    const existing = this.activeLoops.get('rover-drive');
    if (existing) {
      existing.setLevel?.(Math.max(0.25, Math.min(1, speedNorm + (turning ? 0.2 : 0))));
      return;
    }

    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = this.noiseBuffer;
    noiseSrc.loop = true;

    const gravelFilter = ctx.createBiquadFilter();
    gravelFilter.type = 'bandpass';
    gravelFilter.frequency.value = 460;
    gravelFilter.Q.value = 1.2;

    const motorOsc = ctx.createOscillator();
    motorOsc.type = 'triangle';
    motorOsc.frequency.value = 135;

    const motorGain = ctx.createGain();
    motorGain.gain.value = 0.28;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.095, ctx.currentTime + 0.12);

    noiseSrc.connect(gravelFilter);
    gravelFilter.connect(g);
    motorOsc.connect(motorGain);
    motorGain.connect(g);
    g.connect(this.sfxGain);

    noiseSrc.start();
    motorOsc.start();

    this.activeLoops.set('rover-drive', {
      setLevel: (lvl: number) => {
        const now = ctx.currentTime;
        g.gain.setTargetAtTime(0.04 + lvl * 0.08, now, 0.08);
        motorOsc.frequency.setTargetAtTime(110 + lvl * 85, now, 0.08);
        gravelFilter.frequency.setTargetAtTime(360 + lvl * 320, now, 0.08);
      },
      stop: (fade = 0.18) => {
        const now = ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            noiseSrc.stop();
            motorOsc.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 60);
      },
    });
  }

  public startRockDrillLoop(): void {
    if (!this.isAudible() || this.activeLoops.has('rock-drill')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 155;

    const pulse = ctx.createOscillator();
    pulse.type = 'square';
    pulse.frequency.value = 14;
    const pulseGain = ctx.createGain();
    pulseGain.gain.value = 0.045;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    noise.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1350;
    bp.Q.value = 2.0;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 0.1);

    pulse.connect(pulseGain);
    pulseGain.connect(g.gain);
    osc.connect(g);
    noise.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);

    osc.start();
    pulse.start();
    noise.start();

    this.activeLoops.set('rock-drill', {
      stop: (fade = 0.15) => {
        const now = ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            osc.stop();
            pulse.stop();
            noise.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 50);
      },
    });
  }

  public startSoilScoopLoop(): void {
    if (!this.isAudible() || this.activeLoops.has('soil-scoop')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 680;
    bp.Q.value = 1.4;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.12);

    src.connect(bp);
    bp.connect(g);
    g.connect(this.sfxGain);
    src.start();

    this.activeLoops.set('soil-scoop', {
      stop: (fade = 0.18) => {
        const now = ctx.currentTime;
        g.gain.setValueAtTime(g.gain.value, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + fade);
        setTimeout(() => {
          try {
            src.stop();
          } catch {
            // ignore
          }
        }, fade * 1000 + 50);
      },
    });
  }

  public playCameraShutter(): void {
    if (!this.canPlayCue('cam-shutter', 350)) return;
    this.playNoiseBurst({
      filterType: 'highpass',
      freq: 2200,
      duration: 0.032,
      gain: 0.22,
    });
    this.playTone({ freq: 1480, endFreq: 720, type: 'triangle', duration: 0.04, gain: 0.11 });
    this.playNoiseBurst({
      filterType: 'bandpass',
      freq: 1900,
      q: 2.5,
      duration: 0.035,
      gain: 0.16,
      delay: 0.065,
    });
  }

  public playSensorBeep(): void {
    if (!this.canPlayCue('sensor-beep', 260)) return;
    this.playTone({ freq: 1380, type: 'sine', duration: 0.06, gain: 0.08 });
    this.playTone({ freq: 1720, type: 'sine', duration: 0.08, gain: 0.08, delay: 0.09 });
  }

  // ---------------- PHASE 7: DATA TRANSMISSION ----------------

  public startTransmissionStreamLoop(): void {
    if (!this.isAudible() || this.activeLoops.has('tx-stream')) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const timer = window.setInterval(() => {
      if (!this.isAudible()) return;
      const f = 1100 + Math.floor(Math.random() * 6) * 140;
      this.playTone({ freq: f, type: 'sine', duration: 0.045, gain: 0.05 });
    }, 340);

    this.activeLoops.set('tx-stream', {
      stop: () => {
        window.clearInterval(timer);
      },
    });
  }

  public playMissionSuccessFanfare(): void {
    if (!this.canPlayCue('mission-success', 1200)) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, idx) => {
      this.playTone({
        freq: f,
        type: idx < 3 ? 'triangle' : 'sine',
        duration: idx === notes.length - 1 ? 0.78 : 0.34,
        gain: 0.12,
        delay: idx * 0.11,
      });
    });
  }
}

export const soundEngine = new SoundEngine();
