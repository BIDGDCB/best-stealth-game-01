// The simulation: guards patrol, watch, investigate and chase; the player sneaks,
// runs, tosses coins and steals artifacts. Nothing here draws or listens: render.js
// and audio.js read this state and main.js steps it at a fixed 60 Hz.
import {
  TILE,
  COLS,
  ROWS,
  PLAYER,
  GUARD,
  COIN,
  LIVES,
  clamp,
  distance,
  mulberry32,
} from './config.js';
import { LEVELS, parseLevel } from './levels.js';

export const EVENT_NONE = 0;
export const EVENT_PICKUP = 1 << 0;
export const EVENT_SPOTTED = 1 << 1;
export const EVENT_CAUGHT = 1 << 2;
export const EVENT_CLEAR = 1 << 3;
export const EVENT_OVER = 1 << 4;
export const EVENT_WIN = 1 << 5;
export const EVENT_COIN = 1 << 6;
export const EVENT_ALARM_END = 1 << 7;

/** A tile blocks movement and sight when it holds a wall or a piece of cover. */
function buildBlocked(level) {
  const blocked = new Set();
  for (const w of level.walls) blocked.add(`${w.col},${w.row}`);
  for (const c of level.cover) blocked.add(`${c.col},${c.row}`);
  return blocked;
}

function tileAt(x, y) {
  return { col: Math.floor(x / TILE), row: Math.floor(y / TILE) };
}

export class World {
  constructor(seed = 1) {
    this.seed = seed;
    this.rng = mulberry32(seed);
    this.levelIndex = 0;
    this.score = 0;
    this.lives = LIVES;
    this.screen = 'title';
    this.time = 0;
    this.timesSpotted = 0;
    this.coinsUsed = 0;
    this.alarm = 0;
    this.message = '';
    this.messageTimer = 0;
    this.coin = null;
    this.coinCooldown = 0;
    this.invulnerable = 0;
    this.loadLevel(0);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = parseLevel(LEVELS[index], this.seed + index * 7919);
    this.blocked = buildBlocked(this.level);
    this.shadowTiles = new Set(this.level.shadows.map((s) => `${s.col},${s.row}`));
    this.player = {
      x: this.level.playerStart.x,
      y: this.level.playerStart.y,
      angle: 0,
      sneaking: false,
      running: false,
      moving: false,
      noise: 0,
    };
    this.artifactsLeft = this.level.artifacts.length;
    this.levelTime = 0;
    this.levelSpotted = false;
    this.coin = null;
    this.coinCooldown = 0;
    this.invulnerable = 0;
    this.alarm = 0;
  }

  get levelName() {
    return this.level.name;
  }

  get briefing() {
    return this.level.briefing;
  }

  isBlocked(col, row) {
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
    return this.blocked.has(`${col},${row}`);
  }

  isShadow(x, y) {
    const t = tileAt(x, y);
    return this.shadowTiles.has(`${t.col},${t.row}`);
  }

  /** True when no wall or cover stands between two points. */
  lineOfSight(ax, ay, bx, by) {
    const steps = Math.ceil(distance(ax, ay, bx, by) / 4);
    for (let i = 1; i < steps; i += 1) {
      const x = ax + ((bx - ax) * i) / steps;
      const y = ay + ((by - ay) * i) / steps;
      const t = tileAt(x, y);
      if (this.isBlocked(t.col, t.row)) return false;
    }
    return true;
  }

  /** Move a circle through the tile grid, sliding along walls instead of sticking. */
  moveCircle(body, dx, dy) {
    const r = body.radius;
    let nx = body.x + dx;
    const top = Math.floor((body.y - r) / TILE);
    const bottom = Math.floor((body.y + r) / TILE);
    for (let row = top; row <= bottom; row += 1) {
      for (const col of [Math.floor((nx - r) / TILE), Math.floor((nx + r) / TILE)]) {
        if (this.isBlocked(col, row)) {
          nx = dx > 0 ? col * TILE - r - 0.01 : (col + 1) * TILE + r + 0.01;
        }
      }
    }
    body.x = nx;
    let ny = body.y + dy;
    const left = Math.floor((body.x - r) / TILE);
    const right = Math.floor((body.x + r) / TILE);
    for (let col = left; col <= right; col += 1) {
      for (const row of [Math.floor((ny - r) / TILE), Math.floor((ny + r) / TILE)]) {
        if (this.isBlocked(col, row)) {
          ny = dy > 0 ? row * TILE - r - 0.01 : (row + 1) * TILE + r + 0.01;
        }
      }
    }
    body.y = ny;
  }

  /** Can this guard see the player right now, and how clearly? 0 means not at all. */
  visibility(guard) {
    const p = this.player;
    const d = distance(guard.x, guard.y, p.x, p.y);
    if (d > GUARD.viewRange) return 0;
    const angleTo = Math.atan2(p.y - guard.y, p.x - guard.x);
    let diff = Math.abs(angleTo - guard.angle);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff > GUARD.viewHalfAngle) return 0;
    if (!this.lineOfSight(guard.x, guard.y, p.x, p.y)) return 0;
    let clarity = 1 - (d / GUARD.viewRange) * 0.6;
    if (p.sneaking) clarity *= 0.5;
    if (this.isShadow(p.x, p.y)) clarity *= 0.3;
    if (!p.moving) clarity *= 0.7;
    if (p.running) clarity *= 1.3;
    return clamp(clarity, 0, 1);
  }

  step(dt, input) {
    if (this.screen !== 'play') return EVENT_NONE;
    this.time += dt;
    this.levelTime += dt;
    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.coinCooldown > 0) this.coinCooldown -= dt;
    if (this.messageTimer > 0) this.messageTimer -= dt;
    let events = EVENT_NONE;
    if (this.alarm > 0) {
      this.alarm -= dt;
      if (this.alarm <= 0) events |= EVENT_ALARM_END;
    }
    events |= this.stepPlayer(dt, input);
    events |= this.stepGuards(dt);
    events |= this.stepCoin(dt);
    events |= this.stepPickups();
    return events;
  }

  stepPlayer(dt, input) {
    const p = this.player;
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    p.moving = mx !== 0 || my !== 0;
    p.sneaking = !!input.sneak;
    p.running = !!input.run && !p.sneaking;
    let speed = p.sneaking ? PLAYER.sneakSpeed : p.running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    if (p.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      p.angle = Math.atan2(my, mx);
      this.moveCircle(p, mx * speed * dt, my * speed * dt);
      p.noise = p.sneaking ? PLAYER.sneakNoise : p.running ? PLAYER.runNoise : PLAYER.walkNoise;
      // Running is loud: every guard in earshot turns toward the sound.
      if (p.running) this.hearNoise(p.x, p.y, p.noise, 30);
    } else {
      p.noise = 0;
    }
    if (input.toss && this.coinCooldown <= 0 && !this.coin) {
      const dx = input.toss.x - p.x;
      const dy = input.toss.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      const range = Math.min(d, COIN.range);
      this.coin = {
        x: p.x,
        y: p.y,
        tx: p.x + (dx / d) * range,
        ty: p.y + (dy / d) * range,
        t: 0,
      };
      this.coinCooldown = COIN.cooldownSeconds;
      this.coinsUsed += 1;
      return EVENT_COIN;
    }
    return EVENT_NONE;
  }

  /** Guards within earshot walk over to check a noise. Louder noises pull harder. */
  hearNoise(x, y, radius, suspicion) {
    for (const g of this.level.guards) {
      if (g.state === 'chase') continue;
      if (distance(g.x, g.y, x, y) > radius + 40) continue;
      g.lastSeen = { x, y };
      g.detection = Math.max(g.detection, suspicion);
      if (g.state === 'patrol') g.state = 'investigate';
    }
  }

  stepCoin(dt) {
    if (!this.coin) return EVENT_NONE;
    const c = this.coin;
    c.t += dt / 0.35;
    if (c.t >= 1) {
      this.hearNoise(c.tx, c.ty, COIN.noise, 55);
      this.coin = null;
      return EVENT_COIN;
    }
    return EVENT_NONE;
  }

  stepGuards(dt) {
    let events = EVENT_NONE;
    for (const g of this.level.guards) {
      const seen = this.invulnerable > 0 ? 0 : this.visibility(g);
      if (seen > 0) {
        g.detection = clamp(g.detection + GUARD.detectRate * seen * dt, 0, 100);
        g.lastSeen = { x: this.player.x, y: this.player.y };
        if (g.detection >= GUARD.suspicionAt && g.state === 'patrol') g.state = 'suspicious';
        if (g.detection >= GUARD.alertAt && g.state !== 'chase') {
          g.state = 'chase';
          this.alarm = GUARD.calmSeconds;
          this.levelSpotted = true;
          this.timesSpotted += 1;
          events |= EVENT_SPOTTED;
        }
      } else if (g.state !== 'chase') {
        g.detection = clamp(g.detection - GUARD.decayRate * dt, 0, 100);
        if (g.detection < GUARD.suspicionAt && g.state === 'suspicious') g.state = 'investigate';
        if (g.detection <= 0 && g.state === 'investigate' && !g.lastSeen) g.state = 'patrol';
      }
      events |= this.moveGuard(g, dt);
      // Caught: a chasing guard that reaches you ends the attempt at this level.
      if (g.state === 'chase' && this.invulnerable <= 0) {
        const d = distance(g.x, g.y, this.player.x, this.player.y);
        if (d < GUARD.radius + PLAYER.radius - 2) {
          events |= this.getCaught();
        }
      }
    }
    return events;
  }

  moveGuard(g, dt) {
    let target = null;
    let speed = GUARD.patrolSpeed;
    if (g.state === 'patrol') {
      target = g.patrol[g.waypoint];
      speed = GUARD.patrolSpeed;
    } else if (g.state === 'suspicious' || g.state === 'investigate') {
      target = g.lastSeen;
      speed = GUARD.investigateSpeed;
    } else if (g.state === 'chase') {
      target = this.visibility(g) > 0 ? { x: this.player.x, y: this.player.y } : g.lastSeen;
      speed = GUARD.chaseSpeed;
    }
    if (!target) return EVENT_NONE;
    const d = distance(g.x, g.y, target.x, target.y);
    if (d < 4) {
      if (g.state === 'patrol') {
        // Reached a waypoint: turn to the next one, sweeping the room as you go.
        if (g.forward) {
          g.waypoint += 1;
          if (g.waypoint >= g.patrol.length) {
            g.waypoint = g.patrol.length - 2;
            g.forward = false;
          }
        } else {
          g.waypoint -= 1;
          if (g.waypoint < 0) {
            g.waypoint = 1;
            g.forward = true;
          }
        }
        g.angle += 0.9 * dt * 60 * 0.02;
      } else if (g.state === 'investigate' || g.state === 'suspicious') {
        // Stare at the spot, then give up and go back to the patrol.
        g.searchTimer += dt;
        g.angle += Math.sin(this.time * 1.4) * 0.03;
        if (g.searchTimer > GUARD.searchSeconds) {
          g.searchTimer = 0;
          g.lastSeen = null;
          g.state = 'patrol';
        }
      } else if (g.state === 'chase') {
        g.searchTimer += dt;
        if (g.searchTimer > GUARD.searchSeconds) {
          g.searchTimer = 0;
          g.state = 'investigate';
        }
      }
      return EVENT_NONE;
    }
    const nx = (target.x - g.x) / d;
    const ny = (target.y - g.y) / d;
    g.angle = Math.atan2(ny, nx);
    this.moveCircle(g, nx * speed * dt, ny * speed * dt);
    return EVENT_NONE;
  }

  getCaught() {
    this.lives -= 1;
    if (this.lives <= 0) {
      this.screen = 'over';
      return EVENT_CAUGHT | EVENT_OVER;
    }
    this.screen = 'caught';
    return EVENT_CAUGHT;
  }

  /** After being caught, step back to the level entrance with the guards reset. */
  respawn() {
    this.loadLevel(this.levelIndex);
    this.invulnerable = 2;
    this.screen = 'play';
    this.message = 'Caught! Back to the entrance — quieter this time.';
    this.messageTimer = 3;
  }

  stepPickups() {
    let events = EVENT_NONE;
    for (const a of this.level.artifacts) {
      if (!a.taken && distance(a.x, a.y, this.player.x, this.player.y) < 24) {
        a.taken = true;
        this.artifactsLeft -= 1;
        this.score += 100;
        events |= EVENT_PICKUP;
        if (this.artifactsLeft === 0) {
          this.message = 'All relics taken — reach the green exit!';
          this.messageTimer = 3;
        }
      }
    }
    const e = this.level.exit;
    if (this.artifactsLeft === 0 && distance(e.x, e.y, this.player.x, this.player.y) < 26) {
      const timeBonus = Math.max(0, 300 - Math.floor(this.levelTime) * 2);
      const ghostBonus = this.levelSpotted ? 0 : 200;
      this.score += timeBonus + ghostBonus;
      if (this.levelIndex + 1 >= LEVELS.length) {
        this.screen = 'win';
        return events | EVENT_CLEAR | EVENT_WIN;
      }
      this.screen = 'clear';
      return events | EVENT_CLEAR;
    }
    return events;
  }

  /** Start the next wing after a level-clear screen. */
  nextLevel() {
    this.loadLevel(this.levelIndex + 1);
    this.screen = 'play';
  }

  /** Begin a fresh run from the title screen. */
  startRun() {
    this.score = 0;
    this.lives = LIVES;
    this.timesSpotted = 0;
    this.coinsUsed = 0;
    this.time = 0;
    this.loadLevel(0);
    this.screen = 'play';
  }

  reset() {
    this.startRun();
    this.screen = 'title';
  }
}
