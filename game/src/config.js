// Shared tuning for Shadow Gallery: a top-down stealth game in a museum at night.
// All distances are pixels on the playfield; the loop runs at a fixed 60 steps a second.
export const TILE = 32;
export const COLS = 30;
export const ROWS = 18;
export const HUD_HEIGHT = 24;
export const FIELD_WIDTH = COLS * TILE;
export const FIELD_HEIGHT = ROWS * TILE;
export const CANVAS_WIDTH = FIELD_WIDTH;
export const CANVAS_HEIGHT = HUD_HEIGHT + FIELD_HEIGHT;
export const STEP = 1 / 60;

// The player: a quick walk, a slow sneak, and a sprint that is loud.
export const PLAYER = {
  radius: 11,
  walkSpeed: 150,
  sneakSpeed: 82,
  runSpeed: 205,
  // Noise a guard can hear, in pixels, while moving at each pace.
  walkNoise: 55,
  sneakNoise: 18,
  runNoise: 130,
};

// Guards: patrol slowly, investigate a noise, chase when the alarm is up.
export const GUARD = {
  radius: 12,
  patrolSpeed: 62,
  investigateSpeed: 105,
  chaseSpeed: 168,
  viewRange: 185,
  viewHalfAngle: 0.62,
  // Detection fills 0..100. Rates are per second at point blank, scaled by distance.
  detectRate: 95,
  decayRate: 26,
  suspicionAt: 45,
  alertAt: 100,
  // How long a guard stares at the last seen spot before giving up and patrolling again.
  searchSeconds: 4,
  // A guard that loses you entirely calms down after this long without a trace.
  calmSeconds: 6,
};

// A tossed coin: how far it flies, how loud it lands, how long guards stay curious.
export const COIN = {
  range: 260,
  noise: 150,
  cooldownSeconds: 2.5,
};

export const LIVES = 3;

// Colours are the game's own night palette: deep blue floor, warm pools of light.
export const COLORS = {
  floor: '#1c2438',
  floorAlt: '#202a40',
  shadowFloor: '#141b2c',
  wall: '#3a4666',
  wallTop: '#4d5c85',
  crate: '#6b4f2a',
  crateTop: '#8a6a3b',
  caseGlass: '#7fd4d9',
  caseBase: '#2c3550',
  statue: '#9aa5bd',
  artifact: '#ffd166',
  exit: '#39d98a',
  player: '#e8eefc',
  playerSneak: '#9fb4dd',
  coneCalm: 'rgba(255, 214, 90, 0.20)',
  coneSuspicious: 'rgba(255, 150, 50, 0.30)',
  coneAlert: 'rgba(255, 70, 70, 0.34)',
  coneEdgeCalm: 'rgba(255, 214, 90, 0.55)',
  coneEdgeSuspicious: 'rgba(255, 150, 50, 0.75)',
  coneEdgeAlert: 'rgba(255, 70, 70, 0.85)',
  guardCalm: '#ffd65a',
  guardSuspicious: '#ff9632',
  guardAlert: '#ff4646',
  hud: '#0d1322',
  text: '#e8eefc',
  dimText: '#93a1c0',
};

/** Small deterministic PRNG so a seed always builds the same level. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clamp a number into a range. */
export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

/** Distance between two points. */
export function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}
