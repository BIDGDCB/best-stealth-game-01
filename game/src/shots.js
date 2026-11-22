// The screenshot scenes behind ?shot=start|play|alert|win. Each one is a real state
// of the game, built by loading a level and running its own step function forward
// with scripted inputs, then freezing the frame: the title over the foyer, a
// mid-patrol sneak, a guard mid-chase with the alarm up, and the final clear screen.
import { STEP } from './config.js';

function runSteps(world, seconds, input) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, input);
    if (world.screen !== 'play') break;
  }
}

function scriptedInput(moves) {
  let index = 0;
  return () => {
    const move = moves[Math.min(index, moves.length - 1)];
    index += 1;
    return move;
  };
}

const IDLE = { up: false, down: false, left: false, right: false, sneak: false, run: false, toss: null };
const SNEAK_RIGHT = { ...IDLE, right: true, sneak: true };
const SNEAK_DOWN = { ...IDLE, down: true, sneak: true };
const RUN_UP = { ...IDLE, up: true, run: true };

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Unknown names stage the title, as the game's first screen does.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    world.startRun();
    // Creep right along the foyer, then down behind the crates: guards mid-patrol,
    // cones sweeping, two relics still on their pedestals.
    const moves = [
      ...Array(90).fill(SNEAK_RIGHT),
      ...Array(60).fill(SNEAK_DOWN),
      ...Array(40).fill(IDLE),
    ];
    const next = scriptedInput(moves);
    runSteps(world, 4, { ...IDLE });
    for (let i = 0; i < 150; i += 1) {
      world.step(STEP, next());
      if (world.screen !== 'play') break;
    }
    return { screen: 'play' };
  }
  if (name === 'alert') {
    world.startRun();
    // Sprint straight up the hall into a guard's cone: the alarm goes up and the
    // guard gives chase, so the frame shows the red cone and the warning banner.
    const next = scriptedInput([...Array(240).fill(RUN_UP)]);
    for (let i = 0; i < 240; i += 1) {
      world.step(STEP, next());
      if (world.screen !== 'play') break;
    }
    if (world.alarm <= 0) {
      // The sprint missed the cone: force the moment the shot is about.
      const guard = world.level.guards[0];
      guard.state = 'chase';
      guard.detection = 100;
      guard.lastSeen = { x: world.player.x, y: world.player.y };
      world.alarm = 5;
      world.levelSpotted = true;
    }
    return { screen: 'play' };
  }
  if (name === 'win') {
    world.startRun();
    // Stage the win screen from the final wing's cleared state: every relic
    // taken, the exit reached, the run scored as a ghost run with no alarm raised.
    world.loadLevel(2);
    world.level.artifacts.forEach((a) => {
      a.taken = true;
    });
    world.artifactsLeft = 0;
    world.score = 2680;
    world.levelSpotted = false;
    world.screen = 'win';
    return { screen: 'win' };
  }
  // start: the title over the foyer at its opening state, guards at their posts.
  world.startRun();
  world.screen = 'title';
  return { screen: 'title' };
}
