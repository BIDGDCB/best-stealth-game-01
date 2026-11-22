// All sound is synthesised with WebAudio: no audio files, no network, nothing to
// ship. Footsteps tick, a coin clinks, a pickup chimes, and the alarm stings.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.stepTimer = 0;
  }

  /** Create the audio context on the first user gesture, as browsers require. */
  unlock() {
    if (!this.ctx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
      } catch (err) {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  tone(freq, seconds, type, gainValue, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainValue, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  noiseBurst(seconds, gainValue, filterFreq) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const length = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.value = gainValue;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    source.start(t0);
  }

  /** A soft footstep; quieter and lower while sneaking, sharper while running. */
  footstep(sneaking, running) {
    if (!this.ctx || this.muted) return;
    this.noiseBurst(0.05, sneaking ? 0.03 : running ? 0.16 : 0.08, sneaking ? 500 : 900);
  }

  /** Footsteps on a steady beat while the player walks, so guards feel near. */
  updateFootsteps(dt, moving, sneaking, running) {
    if (!moving) {
      this.stepTimer = 0;
      return;
    }
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.footstep(sneaking, running);
      this.stepTimer = sneaking ? 0.55 : running ? 0.26 : 0.38;
    }
  }

  coin() {
    this.tone(2093, 0.09, 'sine', 0.12);
    this.tone(2637, 0.14, 'sine', 0.1, 0.07);
  }

  coinLand() {
    this.noiseBurst(0.08, 0.2, 2500);
    this.tone(1568, 0.12, 'triangle', 0.12, 0.02);
  }

  pickup() {
    this.tone(880, 0.12, 'sine', 0.14);
    this.tone(1318, 0.18, 'sine', 0.12, 0.08);
  }

  spotted() {
    this.tone(220, 0.28, 'sawtooth', 0.12);
    this.tone(233, 0.28, 'sawtooth', 0.12, 0.02);
  }

  caught() {
    this.tone(196, 0.4, 'sawtooth', 0.16);
    this.tone(147, 0.5, 'sawtooth', 0.16, 0.18);
  }

  clear() {
    [523, 659, 784, 1047].forEach((freq, i) => this.tone(freq, 0.22, 'triangle', 0.12, i * 0.09));
  }
}
