// Everything the player sees: the museum floor, the guards and their vision cones,
// the cover to hide behind, the HUD, and the title and end screens. Canvas 2D only.
import {
  TILE,
  COLS,
  ROWS,
  HUD_HEIGHT,
  FIELD_WIDTH,
  FIELD_HEIGHT,
  PLAYER,
  GUARD,
  COLORS,
  clamp,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

function coneColor(state) {
  if (state === 'chase') return { fill: COLORS.coneAlert, edge: COLORS.coneEdgeAlert };
  if (state === 'suspicious' || state === 'investigate') {
    return { fill: COLORS.coneSuspicious, edge: COLORS.coneEdgeSuspicious };
  }
  return { fill: COLORS.coneCalm, edge: COLORS.coneEdgeCalm };
}

function guardColor(state) {
  if (state === 'chase') return COLORS.guardAlert;
  if (state === 'suspicious' || state === 'investigate') return COLORS.guardSuspicious;
  return COLORS.guardCalm;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  draw(world) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.save();
    ctx.translate(0, HUD_HEIGHT);
    this.drawFloor(world);
    this.drawExit(world);
    this.drawArtifacts(world);
    this.drawCover(world);
    this.drawWalls(world);
    this.drawCones(world);
    this.drawCoin(world);
    this.drawGuards(world);
    this.drawPlayer(world);
    this.drawDarkness(world);
    ctx.restore();
    this.drawHud(world);
    if (world.screen === SCREEN_TITLE) this.drawTitle(world);
    else if (world.screen === SCREEN_CAUGHT) this.drawCaught(world);
    else if (world.screen === SCREEN_CLEAR) this.drawClear(world);
    else if (world.screen === SCREEN_OVER) this.drawOver(world);
    else if (world.screen === SCREEN_WIN) this.drawWin(world);
  }

  drawFloor(world) {
    const ctx = this.ctx;
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const shadow = world.shadowTiles.has(`${col},${row}`);
        ctx.fillStyle = shadow ? COLORS.shadowFloor : (col + row) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        ctx.fillRect(col * TILE, row * TILE, TILE, TILE);
        if (shadow) {
          ctx.fillStyle = 'rgba(120, 160, 255, 0.05)';
          ctx.fillRect(col * TILE + 2, row * TILE + 2, TILE - 4, TILE - 4);
        }
      }
    }
    // Faint rug runners down the main halls, so the floor reads as a museum.
    ctx.fillStyle = 'rgba(120, 60, 60, 0.18)';
    ctx.fillRect(0, 8 * TILE, FIELD_WIDTH, TILE);
    ctx.fillRect(14 * TILE, 0, TILE, FIELD_HEIGHT);
  }

  drawWalls(world) {
    const ctx = this.ctx;
    for (const w of world.level.walls) {
      const x = w.col * TILE;
      const y = w.row * TILE;
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(x, y, TILE, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x + 3, y + 8, TILE - 6, 2);
    }
  }

  drawCover(world) {
    const ctx = this.ctx;
    for (const c of world.level.cover) {
      const x = c.col * TILE;
      const y = c.row * TILE;
      if (c.kind === 'C') {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.crateTop;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 5, y + 5, TILE - 10, TILE - 10);
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + TILE - 2, y + TILE - 2);
        ctx.moveTo(x + TILE - 2, y + 2);
        ctx.lineTo(x + 2, y + TILE - 2);
        ctx.stroke();
      } else if (c.kind === 'D') {
        ctx.fillStyle = COLORS.caseBase;
        ctx.fillRect(x + 2, y + 18, TILE - 4, TILE - 20);
        ctx.fillStyle = COLORS.caseGlass;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(x + 4, y + 3, TILE - 8, 16);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillRect(x + 7, y + 5, 4, 12);
      } else {
        // Statue: a pale figure on a plinth.
        ctx.fillStyle = '#5c6a8c';
        ctx.fillRect(x + 6, y + 22, TILE - 12, 7);
        ctx.fillStyle = COLORS.statue;
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + 11, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x + TILE / 2 - 5, y + 16, 10, 7);
      }
    }
  }

  drawArtifacts(world) {
    const ctx = this.ctx;
    for (const a of world.level.artifacts) {
      if (a.taken) continue;
      const bob = Math.sin(world.time * 2 + a.x) * 2;
      ctx.save();
      ctx.translate(a.x, a.y + bob);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = COLORS.artifact;
      ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = '#fff3c4';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
      ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(a.x, a.y + bob, 13, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  drawExit(world) {
    const ctx = this.ctx;
    const e = world.level.exit;
    const open = world.artifactsLeft === 0;
    ctx.fillStyle = open ? COLORS.exit : 'rgba(57, 217, 138, 0.25)';
    ctx.fillRect(e.x - 15, e.y - 15, 30, 30);
    ctx.strokeStyle = open ? '#d8ffe9' : 'rgba(216, 255, 233, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 15, e.y - 15, 30, 30);
    ctx.fillStyle = open ? '#0d2b1a' : 'rgba(13, 43, 26, 0.6)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', e.x, e.y + 1);
  }

  drawCones(world) {
    const ctx = this.ctx;
    for (const g of world.level.guards) {
      const { fill, edge } = coneColor(g.state);
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.arc(g.x, g.y, GUARD.viewRange, g.angle - GUARD.viewHalfAngle, g.angle + GUARD.viewHalfAngle);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawGuards(world) {
    const ctx = this.ctx;
    for (const g of world.level.guards) {
      const color = guardColor(g.state);
      // Body: a uniformed guard with a cap brim pointing where he looks.
      ctx.fillStyle = '#2b3247';
      ctx.beginPath();
      ctx.arc(g.x, g.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(g.x, g.y, GUARD.radius - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.angle) * (GUARD.radius + 6), g.y + Math.sin(g.angle) * (GUARD.radius + 6));
      ctx.stroke();
      // Detection ring fills as the guard grows sure of you.
      if (g.detection > 2) {
        ctx.strokeStyle = g.detection >= GUARD.alertAt ? COLORS.guardAlert : COLORS.guardSuspicious;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, GUARD.radius + 5, -Math.PI / 2, -Math.PI / 2 + (g.detection / 100) * Math.PI * 2);
        ctx.stroke();
      }
      // "?" when suspicious, "!" when chasing.
      if (g.state === 'suspicious' || g.state === 'investigate') {
        this.drawMark(g.x, g.y - 24, '?', COLORS.guardSuspicious);
      } else if (g.state === 'chase') {
        this.drawMark(g.x, g.y - 24, '!', COLORS.guardAlert);
      }
    }
  }

  drawMark(x, y, text, color) {
    const ctx = this.ctx;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  drawCoin(world) {
    if (!world.coin) return;
    const ctx = this.ctx;
    const c = world.coin;
    const x = c.x + (c.tx - c.x) * c.t;
    const y = c.y + (c.ty - c.y) * c.t - Math.sin(c.t * Math.PI) * 22;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a87e1f';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  drawPlayer(world) {
    const ctx = this.ctx;
    const p = world.player;
    if (world.invulnerable > 0 && Math.floor(world.time * 8) % 2 === 0) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    // A hooded thief: a cloak triangle with a pale face.
    ctx.fillStyle = p.sneaking ? COLORS.playerSneak : COLORS.player;
    ctx.beginPath();
    ctx.moveTo(PLAYER.radius + 3, 0);
    ctx.lineTo(-PLAYER.radius, PLAYER.radius - 2);
    ctx.lineTo(-PLAYER.radius + 3, 0);
    ctx.lineTo(-PLAYER.radius, -PLAYER.radius + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#20263a';
    ctx.beginPath();
    ctx.arc(2, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // While sneaking, a faint ring shows how small your noise is.
    if (p.sneaking && p.moving) {
      ctx.strokeStyle = 'rgba(159, 180, 221, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /** The night itself: darkness everywhere except the lit floor and the cones. */
  drawDarkness(world) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4, 6, 14, 0.28)';
    ctx.fillRect(0, 0, FIELD_WIDTH, FIELD_HEIGHT);
    // Lamplight pools around the artifacts and the exit.
    for (const a of world.level.artifacts) {
      if (a.taken) continue;
      const grad = ctx.createRadialGradient(a.x, a.y, 4, a.x, a.y, 70);
      grad.addColorStop(0, 'rgba(255, 220, 130, 0.20)');
      grad.addColorStop(1, 'rgba(255, 220, 130, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(a.x - 70, a.y - 70, 140, 140);
    }
  }

  drawHud(world) {
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.hud;
    ctx.fillRect(0, 0, this.canvas.width, HUD_HEIGHT);
    ctx.font = '12px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`${world.levelName}  ·  Level ${world.levelIndex + 1}/3`, 10, HUD_HEIGHT / 2 + 1);
    ctx.fillStyle = COLORS.artifact;
    ctx.fillText(`◆ ${world.level.artifacts.length - world.artifactsLeft}/${world.level.artifacts.length}`, 250, HUD_HEIGHT / 2 + 1);
    ctx.fillStyle = COLORS.text;
    ctx.fillText(`Score ${world.score}`, 330, HUD_HEIGHT / 2 + 1);
    ctx.fillStyle = world.lives > 1 ? COLORS.text : COLORS.guardAlert;
    ctx.fillText(`♥`.repeat(world.lives) + `♡`.repeat(Math.max(0, 3 - world.lives)), 430, HUD_HEIGHT / 2 + 1);
    ctx.fillStyle = COLORS.dimText;
    ctx.textAlign = 'right';
    ctx.fillText('WASD move · Shift sneak · Space run · Click toss a coin', this.canvas.width - 10, HUD_HEIGHT / 2 + 1);
    // Alarm banner and the toast message ride over the playfield's top edge.
    if (world.alarm > 0) {
      ctx.fillStyle = 'rgba(255, 70, 70, 0.9)';
      ctx.fillRect(0, HUD_HEIGHT, this.canvas.width, 18);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('!! ALARM — break line of sight and hide !!', this.canvas.width / 2, HUD_HEIGHT + 9);
    } else if (world.messageTimer > 0 && world.message) {
      ctx.fillStyle = 'rgba(13, 19, 34, 0.85)';
      ctx.fillRect(0, HUD_HEIGHT, this.canvas.width, 18);
      ctx.fillStyle = COLORS.text;
      ctx.textAlign = 'center';
      ctx.font = '12px sans-serif';
      ctx.fillText(world.message, this.canvas.width / 2, HUD_HEIGHT + 9);
    }
  }

  drawPanel(title, lines, hint) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(4, 6, 14, 0.72)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const w = 560;
    const h = 130 + lines.length * 24;
    const x = (this.canvas.width - w) / 2;
    const y = (this.canvas.height - h) / 2;
    ctx.fillStyle = '#141b2c';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = COLORS.caseGlass;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(title, this.canvas.width / 2, y + 48);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = COLORS.dimText;
    lines.forEach((line, i) => {
      ctx.fillText(line, this.canvas.width / 2, y + 88 + i * 24);
    });
    ctx.fillStyle = COLORS.artifact;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(hint, this.canvas.width / 2, y + h - 26);
  }

  drawTitle(world) {
    this.drawPanel('SHADOW GALLERY', [
      'A museum after closing. Three wings, nine relics, and guards who watch.',
      world.briefing,
      'Stay out of the yellow cones. Crouch in the dark. Toss a coin to lure a guard away.',
      'Steal every relic, then slip out through the green EXIT.',
    ], 'Press ENTER or click to begin');
  }

  drawCaught(world) {
    this.drawPanel('CAUGHT!', [
      `A guard grabbed you in ${world.levelName}.`,
      `Lives left: ${world.lives}   ·   Score: ${world.score}`,
      'The guards go back to their patrols. You go back to the door.',
    ], 'Press ENTER to try again — quieter this time');
  }

  drawClear(world) {
    this.drawPanel(`${world.levelName.toUpperCase()} — CLEAR`, [
      `Every relic is yours. Score: ${world.score}`,
      `Times spotted so far: ${world.timesSpotted}   ·   Coins tossed: ${world.coinsUsed}`,
      LEVELS_NEXT[world.levelIndex] || 'One wing left.',
    ], 'Press ENTER for the next wing');
  }

  drawOver(world) {
    this.drawPanel('THE NIGHT ENDS', [
      'Three strikes, and the museum keeps its relics.',
      `Final score: ${world.score}   ·   Relics stolen: ${world.level.artifacts.length - world.artifactsLeft} this wing`,
      'The guards never even saw you coming. Next time, they will not see you at all.',
    ], 'Press ENTER to start a new night');
  }

  drawWin(world) {
    this.drawPanel('GHOST OF THE GALLERY', [
      'All three wings cleared. Every relic, lifted without a trace — or almost.',
      `Final score: ${world.score}   ·   Times spotted: ${world.timesSpotted}   ·   Coins tossed: ${world.coinsUsed}`,
      'The morning papers will call it the perfect heist.',
    ], 'Press ENTER to play again');
  }
}

// The name of the wing that follows each clear screen.
export const LEVELS_NEXT = ['Next: The East Wing', 'Next: The Vault', ''];
