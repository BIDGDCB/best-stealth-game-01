// The three wings of the museum. Each map is 30 columns by 18 rows of tiles:
//   # wall        . floor       ~ shadow (dark: you are hard to spot there)
//   C crate       D display case   S statue   (all three are cover: they block
//                                              movement and a guard's line of sight)
//   P player start   E exit   A artifact to steal   G guard post
// A guard's patrol is a list of tile waypoints it walks in order, then back again.
import { TILE } from './config.js';

function tileCentre(col, row) {
  return { x: (col + 0.5) * TILE, y: (row + 0.5) * TILE };
}

export const LEVELS = [
  {
    name: 'The Foyer',
    briefing: 'Three relics, two guards. Learn their patrols, stay out of the light.',
    map: [
      '##############################',
      '#............##..............#',
      '#............##......A.......#',
      '#..P.........##......DDD.....#',
      '#............##..............#',
      '#..CC....................C...#',
      '#..CC....~~~~.............C..#',
      '#.......~~~~...######........#',
      '#.......~~~~...#....#....A...#',
      '#..............#....#........#',
      '#..~~~~........#....#...G....#',
      '#..~~~~........######........#',
      '#............................#',
      '#....DDD.........CC....E.....#',
      '#....DDD.........CC..........#',
      '#............................#',
      '#..A.........................#',
      '##############################',
    ],
    guards: [
      { post: [24, 10], patrol: [[24, 10], [24, 4], [22, 4], [22, 10]] },
      { post: [8, 13], patrol: [[8, 13], [8, 6], [13, 6], [13, 13]] },
    ],
  },
  {
    name: 'The East Wing',
    briefing: 'Four relics, three guards, and a long hall with nowhere to hide.',
    map: [
      '##############################',
      '#..A..........##.............#',
      '#.............##......DDD....#',
      '#..P..........##......DDD....#',
      '#.............##..........A..#',
      '#....CC.......##....~~~~.....#',
      '#....CC.......##....~~~~..A..#',
      '#............................#',
      '#..~~~~~....######....CC.....#',
      '#..~~~~~....#....#....CC.....#',
      '#...........#....#...........#',
      '#...........#....#....G......#',
      '#..DDDD.....######...........#',
      '#..DDDD......................#',
      '#...........CC.......~~~~....#',
      '#...........CC.......~~~~.E..#',
      '#....A.......................#',
      '##############################',
    ],
    guards: [
      { post: [24, 11], patrol: [[24, 11], [24, 5], [18, 5], [18, 11]] },
      { post: [6, 8], patrol: [[6, 8], [6, 10], [11, 10], [11, 8]] },
      { post: [26, 8], patrol: [[26, 8], [26, 14], [24, 14], [24, 8]] },
    ],
  },
  {
    name: 'The Vault',
    briefing: 'Five relics under four guards. Patience pays; sprinting gets you caught.',
    map: [
      '##############################',
      '#..A......####......A........#',
      '#.........####...............#',
      '#..P......####....DDDD.......#',
      '#.........####....DDDD.......#',
      '#....CC......................#',
      '#....CC....~~~~.......CC.....#',
      '#.........~~~~.......CC..A...#',
      '#....######....#######.......#',
      '#....#....#....#.....#...G...#',
      '#....#....#....#.....#.......#',
      '#....######....#######.......#',
      '#............................#',
      '#..~~~~.....CC......~~~~.....#',
      '#..~~~~.....CC......~~~~..E..#',
      '#............................#',
      '#.....A..........A...........#',
      '##############################',
    ],
    guards: [
      { post: [25, 9], patrol: [[25, 9], [25, 6], [24, 6], [24, 9]] },
      { post: [3, 13], patrol: [[3, 13], [3, 16], [8, 16], [8, 13]] },
      { post: [23, 15], patrol: [[23, 15], [23, 12], [27, 12], [27, 15]] },
      { post: [5, 15], patrol: [[5, 15], [5, 12], [10, 12], [10, 15]] },
    ],
  },
];

/** Parse a level into grids and entity lists the world can run. */
export function parseLevel(def, seed) {
  const walls = [];
  const cover = [];
  const shadows = [];
  const artifacts = [];
  let playerStart = null;
  let exit = null;
  for (let row = 0; row < def.map.length; row += 1) {
    const line = def.map[row];
    for (let col = 0; col < line.length; col += 1) {
      const ch = line[col];
      const centre = tileCentre(col, row);
      if (ch === '#') walls.push({ col, row });
      else if (ch === 'C' || ch === 'D' || ch === 'S') cover.push({ col, row, kind: ch });
      else if (ch === '~') shadows.push({ col, row });
      else if (ch === 'A') artifacts.push({ x: centre.x, y: centre.y, taken: false });
      else if (ch === 'P') playerStart = { x: centre.x, y: centre.y };
      else if (ch === 'E') exit = { x: centre.x, y: centre.y };
    }
  }
  const guards = def.guards.map((g) => ({
    x: tileCentre(g.post[0], g.post[1]).x,
    y: tileCentre(g.post[0], g.post[1]).y,
    patrol: g.patrol.map(([c, r]) => tileCentre(c, r)),
    waypoint: 0,
    forward: true,
    angle: -Math.PI / 2,
    state: 'patrol',
    detection: 0,
    lastSeen: null,
    searchTimer: 0,
    calmTimer: 0,
    speed: 62,
  }));
  return {
    name: def.name,
    briefing: def.briefing,
    seed,
    walls,
    cover,
    shadows,
    artifacts,
    playerStart,
    exit,
    guards,
  };
}
