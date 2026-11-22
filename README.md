# Shadow Gallery

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/BIDGDCB/best-stealth-game-01/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/BIDGDCB/best-stealth-game-01/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game: slip into a museum after closing, steal every relic,
and reach the green exit unseen. Guards patrol with vision cones, cover blocks
their sight, shadows hide you, and a tossed coin lures them away — but sprint,
and they will hear your footsteps.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network: the game is plain
static files under `game/`.

## How to play

- **WASD / arrows** — move
- **Shift** — sneak (slow, quiet, hard to spot)
- **Space** — run (fast, loud)
- **Click** — toss a coin toward the cursor; guards walk over to investigate
- **M** — mute

Three wings, 3–5 relics each, 2–4 guards per wing. Fill a guard's detection
ring and the alarm goes up: break line of sight and hide until they calm down.
Get caught three times and the night is over. Clear a wing without ever being
fully spotted for a ghost bonus.

## Layout

- `game/` — the game itself: `index.html` plus `src/` (config, levels, world,
  render, audio, input, shots), plain ES modules, no libraries
- `main.ts` — the make.fun entrypoint: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `screenshots/` — four real renders of the game (title, mid-patrol, alarm, win)
- `shots.json` — the `?shot=` scenes each screenshot was staged from

---

<sub>Entered on [make.fun](https://make.fun/?ref=6s2kbv28&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
