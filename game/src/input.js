// Keyboard and mouse: WASD or arrows to move, Shift to sneak, Space to run,
// and a click (or Q) to toss a coin toward the cursor. Clicks land in playfield
// coordinates, below the HUD bar.
import { HUD_HEIGHT } from './config.js';

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.toss = null;
    this.onAdvance = null;
    this.onMute = null;
    this.canvas = canvas;
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      this.keys.add(event.key.toLowerCase());
      if (event.key === 'Enter' && this.onAdvance) this.onAdvance();
      if ((event.key === 'm' || event.key === 'M') && this.onMute) this.onMute();
      if ((event.key === 'q' || event.key === 'Q') && this.onTossKey) this.onTossKey();
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());
    canvas.addEventListener('mousedown', (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.toss = {
        x: (event.clientX - rect.left) * scaleX,
        y: (event.clientY - rect.top) * scaleY - HUD_HEIGHT,
      };
      if (this.onAdvance) this.onAdvance();
    });
  }

  read() {
    const k = this.keys;
    const state = {
      up: k.has('w') || k.has('arrowup'),
      down: k.has('s') || k.has('arrowdown'),
      left: k.has('a') || k.has('arrowleft'),
      right: k.has('d') || k.has('arrowright'),
      sneak: k.has('shift'),
      run: k.has(' '),
      toss: this.toss,
    };
    // A toss is a single throw, not a held button.
    this.toss = null;
    return state;
  }
}
