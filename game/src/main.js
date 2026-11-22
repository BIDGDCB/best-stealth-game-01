// Boot and the game loop. A fixed 60 Hz step keeps the patrols and the detection
// meter the same on every machine; rendering follows the display's own refresh.
import { CANVAS_WIDTH, CANVAS_HEIGHT, STEP } from './config.js';
import { World, EVENT_PICKUP, EVENT_SPOTTED, EVENT_CAUGHT, EVENT_CLEAR, EVENT_WIN, EVENT_OVER, EVENT_COIN } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const params = new URLSearchParams(window.location.search);
const seed = Number.parseInt(params.get('seed') || '1', 10) || 1;
const shot = params.get('shot');

const world = new World(seed);
const renderer = new Renderer(canvas);
const input = new Input(canvas);
const sounds = new SoundBank();

if (shot) {
  const staged = stageShot(shot, world);
  world.screen = staged.screen;
} else {
  world.reset();
}

function advance() {
  sounds.unlock();
  if (world.screen === 'title') {
    world.startRun();
  } else if (world.screen === 'caught') {
    world.respawn();
  } else if (world.screen === 'clear') {
    world.nextLevel();
  } else if (world.screen === 'over' || world.screen === 'win') {
    world.startRun();
  }
}

input.onAdvance = () => {
  if (world.screen !== 'play') advance();
};
input.onMute = () => {
  sounds.muted = !sounds.muted;
};

function handleEvents(events) {
  if (events & EVENT_PICKUP) sounds.pickup();
  if (events & EVENT_SPOTTED) sounds.spotted();
  if (events & EVENT_CAUGHT) sounds.caught();
  if (events & EVENT_CLEAR) sounds.clear();
  if (events & EVENT_COIN) sounds.coinLand();
  if (events & EVENT_WIN) sounds.clear();
  if (events & EVENT_OVER) sounds.caught();
}

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (world.screen === 'play' && !shot) {
    accumulator += elapsed;
    while (accumulator >= STEP) {
      accumulator -= STEP;
      const state = input.read();
      const events = world.step(STEP, state);
      handleEvents(events);
      sounds.updateFootsteps(STEP, world.player.moving, world.player.sneaking, world.player.running);
    }
  }
  renderer.draw(world);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
