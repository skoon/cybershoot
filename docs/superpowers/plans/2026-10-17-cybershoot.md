# Cybershoot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser-playable cyberpunk run-and-gun platformer: title → one Tiled level → mech boss → victory / game-over screen with a persisted high score.

**Architecture:** Phaser 3 scenes (Preload → Title → Level → End) on arcade physics. Pure, Phaser-free logic (math, boss attack choice, energy, high score, input edges) lives in `src/logic.js` and `src/input.js` so `node --test` can cover it. All asset knowledge (paths, frame sizes, hitboxes, anims) is isolated in the data module `src/assets.js`. Entities (player, enemies, boss) are `Phaser.Physics.Arcade.Sprite` subclasses that receive a shared `ctx` object from `Level` instead of using scene events.

**Tech Stack:** Phaser 3.90.0, Vite 8, plain ES modules, Node 25 `node --test`, Python 3 + PIL (asset prep only, not committed), Tiled JSON maps.

**Spec:** `docs/superpowers/specs/2026-10-17-cybershoot-design.md`

## Global Constraints

- Runtime/dev dependencies: exactly `phaser@3.90.0` and `vite@8`. No others. Tests use `node:test` + `node:assert/strict` only.
- Plain JavaScript ES modules (`"type": "module"`), no TypeScript.
- Logical resolution 480×270, `pixelArt: true`, `Scale.FIT`. Tiles are 16×16. Gravity y = 900.
- Energy packs: start 3, max 4, each hit −1, 0 = game over. No checkpoints. Pickup at max energy is not collected and stays.
- Weapons: blaster (default, infinite), spread (3-way), laser (pierce). Held until game over or another weapon pickup.
- Aim: forward, or straight up while Up is held. No other directions.
- Controls: Move Arrows/WASD/stick/d-pad · Jump Z/Space/A · Shoot X/J/X · Dash C/K/B/RB · Aim up Up/W/d-pad-up · Mute M · Start Enter/Space/Start/A.
- High score key `cybershoot.highscore` in localStorage, wrapped in try/catch, memory fallback.
- Art must be CC0 or attribution-only (CC-BY); every asset listed in `CREDITS.md`.
- `vite.config.js` sets `base: './'` so `dist/` works from an itch.io subfolder.
- Every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Retry after game over or victory** → the new run starts with 3 energy, blaster, score 0, exactly one music track playing, and physics running (not paused from the death freeze). Pinned by the Playwright retry check in Task 5, Step 6, and the victory check in Task 8, Step 5.
2. **A key held across a scene change** (mashing Space/A while dying) → must not instantly skip the End or Title screen. Pinned by `withEdges` tests in Task 1 and the 600 ms End lockout in Task 4.
3. **Gamepad absent, disconnected mid-game, or non-standard** (missing `leftStick`, fewer than 16 buttons) → no exception; keyboard keeps working. Pinned by `readRaw` tests in Task 4.
4. **A level re-saved from Tiled** (objects using `class` instead of `type`, external `.tsx` tileset, typo'd object type or drop value) → loads, or fails a test with a readable message; never a cryptic Phaser crash. Pinned by `test/level.test.js` in Task 3 and the `type || class` + unknown-type warning in Task 5.
5. **Falling into a pit** → game over within about a second, not an endless fall below the map. Pinned by the Playwright pit check in Task 5, Step 6.

## Model Delegation (user preference: use cheaper models where possible)

| Task | Implementer model | Why |
|---|---|---|
| 1 Scaffold + logic | haiku | Code fully specified |
| 2 Assets | sonnet | Web research, license judgement, image inspection |
| 3 Level generator | haiku | Code fully specified |
| 4 Input + scenes | haiku | Code fully specified |
| 5 Player + Level core | sonnet | Integration, Playwright verification |
| 6 Weapons + pickups | haiku | Code fully specified, small edits |
| 7 Enemies + crates | sonnet | Integration across files |
| 8 Boss + victory | sonnet | State machine, integration |

Per-task reviewers: sonnet. The final whole-branch review: opus.

---

### Task 1: Project scaffold + pure logic

**Files:**
- Create: `package.json`, `vite.config.js`, `.gitignore`, `index.html`, `src/main.js`, `src/logic.js`
- Test: `test/logic.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (`src/logic.js`, no Phaser import):
  - `GAME_W = 480`, `GAME_H = 270`, `START_ENERGY = 3`, `MAX_ENERGY = 4`
  - `OBJECT_TYPES: string[]` = `['player_start','soldier','drone','turret','crate','energy','boss_arena']`
  - `DROP_KINDS: string[]` = `['spread','laser','energy']`
  - `spreadAngles(baseAngle: number, count: number, stepDeg: number): number[]` (radians)
  - `aimAngle(facing: 1|-1, up: boolean): number` (radians)
  - `bossPhase(hp: number, maxHp: number): 1|2`
  - `nextBossAttack(phase: 1|2, last: string|null, rand: number): 'stomp'|'charge'|'missiles'`
  - `applyEnergyPickup(energy: number): { energy: number, collected: boolean }`
  - `withEdges(raw: object, prev: object|null): object`: copies `raw` and adds `jumpPressed`, `dashPressed`, `startPressed`, `mutePressed`
  - `safeStorage(): Storage|null`, `loadHighScore(storage): number`, `saveHighScore(storage, score: number): number` (returns best)

- [ ] **Step 1: Create the project files**

`package.json`:
```json
{
  "name": "cybershoot",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "node --test",
    "level": "node tools/make-level.mjs"
  }
}
```

`vite.config.js`:
```js
// Relative base so dist/ works from an itch.io subfolder.
export default { base: './' };
```

`.gitignore`:
```
node_modules/
dist/
```

`index.html`:
```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cybershoot</title>
  <style>html, body { margin: 0; height: 100%; background: #05010d; overflow: hidden; } #game { width: 100%; height: 100%; }</style>
</head>
<body>
  <div id="game"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

Run: `npm install phaser@3.90.0 && npm install -D vite@8`
Expected: `package.json` gains `dependencies.phaser` and `devDependencies.vite`; `package-lock.json` is created.

- [ ] **Step 2: Write the failing tests**

`test/logic.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  spreadAngles, aimAngle, bossPhase, nextBossAttack, applyEnergyPickup,
  withEdges, loadHighScore, saveHighScore, MAX_ENERGY,
} from '../src/logic.js';

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} != ${b}`);

test('spreadAngles: single shot is the base angle', () => {
  assert.deepEqual(spreadAngles(0.5, 1, 15), [0.5]);
});

test('spreadAngles: 3-way fan is symmetric around the base', () => {
  const [a, b, c] = spreadAngles(0, 3, 15);
  close(a, -15 * Math.PI / 180);
  close(b, 0);
  close(c, 15 * Math.PI / 180);
});

test('aimAngle: forward follows facing, up is straight up either way', () => {
  close(aimAngle(1, false), 0);
  close(aimAngle(-1, false), Math.PI);
  close(aimAngle(1, true), -Math.PI / 2);
  close(aimAngle(-1, true), -Math.PI / 2);
});

test('bossPhase: phase 2 only strictly below half HP', () => {
  assert.equal(bossPhase(40, 40), 1);
  assert.equal(bossPhase(20, 40), 1);
  assert.equal(bossPhase(19, 40), 2);
});

test('nextBossAttack: phase 1 alternates stomp/charge and never fires missiles', () => {
  assert.equal(nextBossAttack(1, 'stomp', 0), 'charge');
  assert.equal(nextBossAttack(1, 'charge', 0.99), 'stomp');
  for (let r = 0; r < 1; r += 0.05) assert.notEqual(nextBossAttack(1, null, r), 'missiles');
});

test('nextBossAttack: phase 2 can fire missiles, never repeats, tolerates rand=1', () => {
  const seen = new Set();
  for (let r = 0; r < 1; r += 0.05) {
    const atk = nextBossAttack(2, 'stomp', r);
    assert.notEqual(atk, 'stomp');
    seen.add(atk);
  }
  assert.ok(seen.has('missiles'));
  assert.ok(['stomp', 'charge', 'missiles'].includes(nextBossAttack(2, null, 1)));
});

test('applyEnergyPickup: +1 below max, not collected at max', () => {
  assert.deepEqual(applyEnergyPickup(1), { energy: 2, collected: true });
  assert.deepEqual(applyEnergyPickup(MAX_ENERGY - 1), { energy: MAX_ENERGY, collected: true });
  assert.deepEqual(applyEnergyPickup(MAX_ENERGY), { energy: MAX_ENERGY, collected: false });
});

test('withEdges: a key already held on the first read is not a fresh press', () => {
  const held = { jump: true, dash: true, start: true, mute: true };
  const first = withEdges(held, null);
  assert.equal(first.jumpPressed, false);
  assert.equal(first.startPressed, false);
  assert.equal(withEdges(held, held).startPressed, false);
  const released = { jump: false, dash: false, start: false, mute: false };
  assert.equal(withEdges(held, released).startPressed, true);
  assert.equal(withEdges(held, released).jump, true);
});

// High-score tests share module memory, so order matters: garbage first (memory still 0).
test('loadHighScore: garbage or missing values read as 0', () => {
  assert.equal(loadHighScore({ getItem: () => 'abc' }), 0);
  assert.equal(loadHighScore({ getItem: () => null }), 0);
  assert.equal(loadHighScore(null), 0);
});

test('saveHighScore: keeps the max and writes it', () => {
  const data = {};
  const storage = { getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
  assert.equal(saveHighScore(storage, 50), 50);
  assert.equal(saveHighScore(storage, 30), 50);
  assert.equal(data['cybershoot.highscore'], '50');
});

test('saveHighScore: throwing storage falls back to memory', () => {
  const broken = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(saveHighScore(broken, 900), 900);
  assert.equal(loadHighScore(broken), 900);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL. `Cannot find module '.../src/logic.js'`

- [ ] **Step 4: Implement `src/logic.js`**

```js
// Pure game logic: no Phaser import, so node --test can load it.
export const GAME_W = 480;
export const GAME_H = 270;
export const START_ENERGY = 3;
export const MAX_ENERGY = 4;
export const OBJECT_TYPES = ['player_start', 'soldier', 'drone', 'turret', 'crate', 'energy', 'boss_arena'];
export const DROP_KINDS = ['spread', 'laser', 'energy'];

const HIGH_SCORE_KEY = 'cybershoot.highscore';
const EDGE_KEYS = ['jump', 'dash', 'start', 'mute'];

// `count` angles (radians), `stepDeg` apart, centred on `baseAngle`.
export function spreadAngles(baseAngle, count, stepDeg) {
  const step = stepDeg * Math.PI / 180;
  const start = baseAngle - step * (count - 1) / 2;
  return Array.from({ length: count }, (_, i) => start + step * i);
}

export function aimAngle(facing, up) {
  if (up) return -Math.PI / 2;
  return facing < 0 ? Math.PI : 0;
}

export function bossPhase(hp, maxHp) {
  return hp < maxHp * 0.5 ? 2 : 1;
}

export function nextBossAttack(phase, last, rand) {
  const options = (phase === 2 ? ['stomp', 'charge', 'missiles'] : ['stomp', 'charge']).filter(o => o !== last);
  return options[Math.min(options.length - 1, Math.floor(rand * options.length))];
}

export function applyEnergyPickup(energy) {
  if (energy >= MAX_ENERGY) return { energy, collected: false };
  return { energy: energy + 1, collected: true };
}

// Adds `<key>Pressed` (true only on the frame a key goes down). With no previous
// frame, nothing counts as pressed, so a key held across a scene change is ignored.
export function withEdges(raw, prev) {
  const base = prev ?? raw;
  const out = { ...raw };
  for (const k of EDGE_KEYS) out[k + 'Pressed'] = !!raw[k] && !base[k];
  return out;
}

let memoryBest = 0;

export function safeStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

export function loadHighScore(storage) {
  let stored = 0;
  try { stored = Number.parseInt(storage?.getItem(HIGH_SCORE_KEY), 10); } catch { stored = 0; }
  return Math.max(memoryBest, Number.isFinite(stored) && stored > 0 ? stored : 0);
}

export function saveHighScore(storage, score) {
  const best = Math.max(loadHighScore(storage), score);
  memoryBest = best;
  try { storage?.setItem(HIGH_SCORE_KEY, String(best)); } catch { /* private mode: memory only */ }
  return best;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS, 11 tests, 0 failures.

- [ ] **Step 6: Add a placeholder `src/main.js` and verify the build**

```js
import Phaser from 'phaser';
import { GAME_W, GAME_H } from './logic.js';

class Hello extends Phaser.Scene {
  create() {
    this.add.text(GAME_W / 2, GAME_H / 2, 'CYBERSHOOT', { fontFamily: 'monospace', fontSize: '24px', color: '#ff2bd6' }).setOrigin(0.5);
  }
}

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,
  backgroundColor: '#05010d',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Hello],
});
```

Run: `npm run build`
Expected: `dist/index.html` and `dist/assets/*.js` are written, with no errors (a chunk-size warning about Phaser is fine).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.js .gitignore index.html src/main.js src/logic.js test/logic.test.js
git commit -m "feat: scaffold Vite + Phaser project and pure game logic

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Source the art and audio, and write the asset manifest

**Files:**
- Create: `public/assets/sprites/*.png`, `public/assets/tiles/tileset.png`, `public/assets/bg/*.png`, `public/assets/sfx/*`, `public/assets/music/*`
- Create: `src/assets.js`, `CREDITS.md`
- Test: `test/assets.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (`src/assets.js`, pure data, no imports). **Every key below must exist; later tasks use these exact names.**
  - `SHEETS: { [key]: { path, frameWidth, frameHeight } }` with keys `player`, `soldier`, `drone`, `turret`, `boss`, `explosion`. Every sheet is a horizontal-or-grid strip of equal frames, and **every sheet faces right** (code uses `flipX` for left).
  - `IMAGES: { [key]: string | { w, h, color } }`. A string is a path; an object makes Preload generate a solid-color rectangle texture. Keys: `bg-far`, `bg-mid`, `bg-near`, `crate`, `pickup-spread`, `pickup-laser`, `pickup-energy`, `hud-energy`, `bullet`, `laser`, `enemy-bullet`, `shockwave`, `missile`.
  - `AUDIO: { [key]: path }` with keys `sfx-shot`, `sfx-hit`, `sfx-explosion`, `sfx-pickup`, `sfx-dash`, `music-level`, `music-boss` (mp3/wav/ogg; prefer mp3 or wav for Safari).
  - `ANIMS: { key, sheet, frames: number[], frameRate, repeat }[]` with keys `player-idle`, `player-run`, `player-jump`, `player-dash`, `soldier-idle`, `soldier-walk`, `drone-fly`, `turret-idle`, `boss-idle`, `boss-walk`, `explosion` (`repeat: 0`; all others `-1`). Aliasing frames is allowed: e.g. `player-dash` may reuse run frames.
  - `ENTITIES: { [key]: { body: { w, h, ox, oy }, tint?, scale? } }` with keys `player`, `soldier`, `drone`, `turret`, `boss`. `body` is the hitbox in **unscaled frame pixels** (`ox/oy` = offset from the frame's top-left). Constraints: player `body.h` is even; `boss.body.w * (boss.scale ?? 1) <= 48`, so the player's 64 px dash can pass through the charge.
  - `TILESET: { name: 'cyber', key: 'tiles', path, tileWidth: 16, columns, tilecount, imagewidth, imageheight, solidTop, solidFill }`, where `solidTop`/`solidFill` are 0-based tile ids for a ground surface tile and a ground fill tile.
  - `MAP: { key: 'level1', path: 'assets/maps/level1.json' }`
  - `BACKGROUNDS: { key, scrollFactor }[]`: `bg-far` 0.05, `bg-mid` 0.2, `bg-near` 0.5.
  - `CREDIT_LINE: string`: one short line shown on the Title screen, crediting any CC-BY authors.

- [ ] **Step 1: Download candidate packs into an isolated scratch folder (not the repo)**

Primary pack: Ansimuz *Warped City*, CC0 art (its bundled music is CC-BY Pascal Belisle).
```bash
mkdir -p "$TMPDIR/cyber-dl/warped" && cd "$TMPDIR/cyber-dl/warped" && curl -L -o warped.zip https://opengameart.org/sites/default/files/warped_city_files.zip && unzip -q warped.zip && find . -type f | head -100
```
(Use the session scratchpad directory if `$TMPDIR` is unset.) SFX: Juhani Junkala's *512 Sound Effects (8-bit style)*, CC0, at https://opengameart.org/content/512-sound-effects-8-bit-style; download it into its own `$TMPDIR/cyber-dl/sfx` folder. If you need more art (a soldier, a turret, or a mech boss Warped City lacks), search OpenGameArt or itch.io for CC0 cyberpunk packs. Before using any pack, **read its license on the source page**. Accept only CC0 or CC-BY.

- [ ] **Step 2: Choose a sprite for every required sheet key**

Inspect the candidates by viewing the PNGs (the Read tool displays images). Pick in this order:
1. A matching sprite from the packs.
2. A stand-in: reuse another sheet's image under the required key with `tint` and/or `scale` in `ENTITIES`. For example, `soldier` = player sheet with `tint: 0xff5a7a`; `boss` = a drone or vehicle sheet with `scale: 2`. Record every stand-in in `CREDITS.md` under "Stand-ins".

For pickups, bullets, the HUD pip, shockwave, and missile, use pack props if suitable; otherwise use generated rectangles. Suggested sizes and colors: `bullet` {w:6,h:2,color:0x00f0ff}, `laser` {w:14,h:2,color:0xff2bd6}, `enemy-bullet` {w:4,h:4,color:0xff4040}, `shockwave` {w:12,h:10,color:0xffb000}, `missile` {w:6,h:6,color:0xff8000}, `pickup-spread` {w:10,h:10,color:0x00ff9c}, `pickup-laser` {w:10,h:10,color:0xff2bd6}, `pickup-energy` {w:8,h:12,color:0x00f0ff}, `hud-energy` {w:8,h:10,color:0x00f0ff}, `crate` {w:16,h:16,color:0x6b4f2a}.

- [ ] **Step 3: Pack individual frames into strips (only if the pack ships one PNG per frame)**

Write this throwaway script **outside the repo** (in the scratch folder; don't commit it) and run it once per animation set, ordering frames idle → run → jump → … in one strip per entity:
```python
# usage: python3 -I pack.py out.png [--flip] frame1.png frame2.png ...
import sys
from PIL import Image, ImageOps
args = sys.argv[1:]
out, flip = args[0], '--flip' in args
frames = [Image.open(p).convert('RGBA') for p in args[1:] if p != '--flip']
w = max(f.width for f in frames); h = max(f.height for f in frames)
sheet = Image.new('RGBA', (w * len(frames), h))
for i, f in enumerate(frames):
    if flip: f = ImageOps.mirror(f)
    sheet.paste(f, (i * w + (w - f.width) // 2, h - f.height))
sheet.save(out)
print(out, 'frame', w, 'x', h, 'count', len(frames))
```
Use `--flip` for any art that faces left. Copy the chosen/packed files into `public/assets/sprites/`, `public/assets/tiles/tileset.png`, `public/assets/bg/`, `public/assets/sfx/`, `public/assets/music/`. Keep only the files you reference. Short lowercase names like `player.png` and `shot.wav` are best.

- [ ] **Step 4: Write the failing manifest test**

`test/assets.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as A from '../src/assets.js';

const pub = p => new URL('../public/' + p, import.meta.url);
const pngSize = p => { const b = readFileSync(pub(p)); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

const REQUIRED = {
  SHEETS: ['player', 'soldier', 'drone', 'turret', 'boss', 'explosion'],
  IMAGES: ['bg-far', 'bg-mid', 'bg-near', 'crate', 'pickup-spread', 'pickup-laser', 'pickup-energy', 'hud-energy', 'bullet', 'laser', 'enemy-bullet', 'shockwave', 'missile'],
  AUDIO: ['sfx-shot', 'sfx-hit', 'sfx-explosion', 'sfx-pickup', 'sfx-dash', 'music-level', 'music-boss'],
  ENTITIES: ['player', 'soldier', 'drone', 'turret', 'boss'],
};
const REQUIRED_ANIMS = ['player-idle', 'player-run', 'player-jump', 'player-dash', 'soldier-idle', 'soldier-walk', 'drone-fly', 'turret-idle', 'boss-idle', 'boss-walk', 'explosion'];

test('every required key exists', () => {
  for (const [table, keys] of Object.entries(REQUIRED))
    for (const k of keys) assert.ok(A[table][k], `${table}.${k} missing`);
  const anims = A.ANIMS.map(a => a.key);
  for (const k of REQUIRED_ANIMS) assert.ok(anims.includes(k), `anim ${k} missing`);
  assert.ok(A.CREDIT_LINE, 'CREDIT_LINE missing');
});

test('every referenced file exists under public/', () => {
  const paths = [
    ...Object.values(A.SHEETS).map(s => s.path),
    ...Object.values(A.IMAGES).filter(v => typeof v === 'string'),
    ...Object.values(A.AUDIO),
    A.TILESET.path,
  ];
  for (const p of paths) assert.ok(existsSync(pub(p)), `missing public/${p}`);
});

test('anim frames fit inside their sheet', () => {
  for (const a of A.ANIMS) {
    const s = A.SHEETS[a.sheet];
    assert.ok(s, `anim ${a.key} uses unknown sheet ${a.sheet}`);
    const { w, h } = pngSize(s.path);
    const count = Math.floor(w / s.frameWidth) * Math.floor(h / s.frameHeight);
    for (const f of a.frames) assert.ok(f >= 0 && f < count, `anim ${a.key} frame ${f} >= ${count} frames in ${s.path}`);
  }
});

test('tileset metadata matches the image', () => {
  const { w, h } = pngSize(A.TILESET.path);
  assert.equal(A.TILESET.imagewidth, w);
  assert.equal(A.TILESET.imageheight, h);
  assert.equal(A.TILESET.columns, Math.floor(w / A.TILESET.tileWidth));
  assert.equal(A.TILESET.tilecount, A.TILESET.columns * Math.floor(h / A.TILESET.tileWidth));
  assert.ok(A.TILESET.solidTop < A.TILESET.tilecount && A.TILESET.solidFill < A.TILESET.tilecount);
});

test('hitboxes fit the frame; boss is narrow enough to dash through', () => {
  for (const [k, e] of Object.entries(A.ENTITIES)) {
    const s = A.SHEETS[k];
    assert.ok(e.body.ox + e.body.w <= s.frameWidth && e.body.oy + e.body.h <= s.frameHeight, `${k} body outside frame`);
  }
  assert.equal(A.ENTITIES.player.body.h % 2, 0, 'player body.h must be even (slide halves it)');
  assert.ok(A.ENTITIES.boss.body.w * (A.ENTITIES.boss.scale ?? 1) <= 48, 'boss hitbox wider than 48px');
});
```

Run: `npm test`
Expected: FAIL. `Cannot find module '.../src/assets.js'`

- [ ] **Step 5: Write `src/assets.js` from what you measured**

Use this exact shape. Every number and path must come from the files you placed in Step 3; the values shown are examples only.
```js
// Asset manifest: the only file that knows paths, frame sizes and hitboxes.
// Pure data (no imports) so node tests can check it.
export const SHEETS = {
  player:    { path: 'assets/sprites/player.png',    frameWidth: 71, frameHeight: 67 },
  soldier:   { path: 'assets/sprites/player.png',    frameWidth: 71, frameHeight: 67 }, // stand-in: tinted player
  drone:     { path: 'assets/sprites/drone.png',     frameWidth: 52, frameHeight: 41 },
  turret:    { path: 'assets/sprites/turret.png',    frameWidth: 26, frameHeight: 26 },
  boss:      { path: 'assets/sprites/boss.png',      frameWidth: 90, frameHeight: 80 },
  explosion: { path: 'assets/sprites/explosion.png', frameWidth: 32, frameHeight: 32 },
};

export const IMAGES = {
  'bg-far': 'assets/bg/far.png',
  'bg-mid': 'assets/bg/mid.png',
  'bg-near': 'assets/bg/near.png',
  crate: { w: 16, h: 16, color: 0x6b4f2a },
  'pickup-spread': { w: 10, h: 10, color: 0x00ff9c },
  'pickup-laser': { w: 10, h: 10, color: 0xff2bd6 },
  'pickup-energy': { w: 8, h: 12, color: 0x00f0ff },
  'hud-energy': { w: 8, h: 10, color: 0x00f0ff },
  bullet: { w: 6, h: 2, color: 0x00f0ff },
  laser: { w: 14, h: 2, color: 0xff2bd6 },
  'enemy-bullet': { w: 4, h: 4, color: 0xff4040 },
  shockwave: { w: 12, h: 10, color: 0xffb000 },
  missile: { w: 6, h: 6, color: 0xff8000 },
};

export const AUDIO = {
  'sfx-shot': 'assets/sfx/shot.wav',
  'sfx-hit': 'assets/sfx/hit.wav',
  'sfx-explosion': 'assets/sfx/explosion.wav',
  'sfx-pickup': 'assets/sfx/pickup.wav',
  'sfx-dash': 'assets/sfx/dash.wav',
  'music-level': 'assets/music/level.mp3',
  'music-boss': 'assets/music/boss.mp3',
};

export const ANIMS = [
  { key: 'player-idle', sheet: 'player', frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
  { key: 'player-run', sheet: 'player', frames: [4, 5, 6, 7, 8, 9, 10, 11], frameRate: 12, repeat: -1 },
  { key: 'player-jump', sheet: 'player', frames: [12, 13], frameRate: 8, repeat: -1 },
  { key: 'player-dash', sheet: 'player', frames: [6, 7], frameRate: 16, repeat: -1 },
  { key: 'soldier-idle', sheet: 'soldier', frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
  { key: 'soldier-walk', sheet: 'soldier', frames: [4, 5, 6, 7, 8, 9, 10, 11], frameRate: 10, repeat: -1 },
  { key: 'drone-fly', sheet: 'drone', frames: [0, 1, 2, 3], frameRate: 10, repeat: -1 },
  { key: 'turret-idle', sheet: 'turret', frames: [0, 1], frameRate: 4, repeat: -1 },
  { key: 'boss-idle', sheet: 'boss', frames: [0, 1], frameRate: 4, repeat: -1 },
  { key: 'boss-walk', sheet: 'boss', frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 },
  { key: 'explosion', sheet: 'explosion', frames: [0, 1, 2, 3, 4, 5], frameRate: 16, repeat: 0 },
];

// body = hitbox in unscaled frame pixels; ox/oy from the frame's top-left.
export const ENTITIES = {
  player: { body: { w: 16, h: 32, ox: 28, oy: 30 } },
  soldier: { body: { w: 16, h: 32, ox: 28, oy: 30 }, tint: 0xff5a7a },
  drone: { body: { w: 24, h: 16, ox: 14, oy: 12 } },
  turret: { body: { w: 18, h: 18, ox: 4, oy: 4 } },
  boss: { body: { w: 22, h: 40, ox: 34, oy: 30 }, scale: 2 },
};

export const TILESET = {
  name: 'cyber', key: 'tiles', path: 'assets/tiles/tileset.png', tileWidth: 16,
  columns: 24, tilecount: 384, imagewidth: 384, imageheight: 256,
  solidTop: 1, solidFill: 25,
};

export const MAP = { key: 'level1', path: 'assets/maps/level1.json' };

export const BACKGROUNDS = [
  { key: 'bg-far', scrollFactor: 0.05 },
  { key: 'bg-mid', scrollFactor: 0.2 },
  { key: 'bg-near', scrollFactor: 0.5 },
];

export const CREDIT_LINE = 'Art: Ansimuz (CC0)  ·  Music: Pascal Belisle (CC-BY)  ·  SFX: Juhani Junkala (CC0)';
```

- [ ] **Step 6: Write `CREDITS.md`**

```markdown
# Credits

| Asset | Author | Source | License | Used for |
|---|---|---|---|---|
| Warped City | Ansimuz | https://opengameart.org/content/warped-city | CC0 | player, tiles, backgrounds, … |
| Warped City music | Pascal Belisle | (bundled with Warped City) | CC-BY — credit required | music-level, music-boss |
| 512 Sound Effects (8-bit style) | Juhani Junkala | https://opengameart.org/content/512-sound-effects-8-bit-style | CC0 | sfx-* |

## Stand-ins
- (one line per required key that reuses other art, e.g. "soldier = player sheet tinted 0xff5a7a")
```
Fill in one real row per pack you actually used, and one line per stand-in. Delete any example rows you didn't use. If there are no stand-ins, write "None."

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS for all `logic` and `assets` tests.

- [ ] **Step 8: Commit**

```bash
git add public/assets src/assets.js CREDITS.md test/assets.test.js
git commit -m "feat: add CC0 art/audio packs and asset manifest

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Level generator + level1.json

**Files:**
- Create: `tools/make-level.mjs`, `public/assets/maps/level1.json` (generated)
- Test: `test/level.test.js`

**Interfaces:**
- Consumes: `TILESET`, `MAP` from `src/assets.js`; `GAME_W`, `OBJECT_TYPES`, `DROP_KINDS` from `src/logic.js`.
- Produces: `public/assets/maps/level1.json`, a Tiled 1.10 JSON map, 230×17 tiles, with:
  - tile layer `ground`; embedded tileset named `TILESET.name`; tiles `solidTop`/`solidFill` have the property `collides: true`
  - object layer `objects`, containing **point objects at the bottom-centre of their tile cell**, with `type` ∈ `OBJECT_TYPES`; `turret` has the property `facing: 'left'`; `crate` and some `soldier`s have the property `drop` ∈ `DROP_KINDS`
  - one rectangle object `boss_arena`, 480 px wide, covering the last 30 columns, full map height.

- [ ] **Step 1: Write the failing map test**

`test/level.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TILESET, MAP } from '../src/assets.js';
import { GAME_W, OBJECT_TYPES, DROP_KINDS } from '../src/logic.js';

const map = JSON.parse(readFileSync(new URL('../public/' + MAP.path, import.meta.url), 'utf8'));
const objects = map.layers.find(l => l.name === 'objects' && l.type === 'objectgroup')?.objects ?? [];
const typeOf = o => o.type || o.class; // Tiled 1.9 saved "class", 1.10+ saves "type"

test('map has a ground tile layer and an objects layer', () => {
  assert.ok(map.layers.find(l => l.name === 'ground' && l.type === 'tilelayer'), 'no "ground" tile layer');
  assert.ok(objects.length > 0, 'no "objects" object layer');
});

test('tileset is embedded and named the way Level expects', () => {
  assert.equal(map.tilesets.length, 1);
  const ts = map.tilesets[0];
  assert.equal(ts.source, undefined, 'tileset is external (.tsx); in Tiled use "Embed Tileset" before exporting');
  assert.equal(ts.name, TILESET.name, `tileset must be named "${TILESET.name}"`);
  assert.equal(map.tilewidth, TILESET.tileWidth);
});

test('some ground tiles collide', () => {
  const ts = map.tilesets[0];
  const colliding = new Set((ts.tiles ?? []).filter(t => t.properties?.some(p => p.name === 'collides' && p.value === true)).map(t => t.id + ts.firstgid));
  const ground = map.layers.find(l => l.name === 'ground');
  assert.ok(ground.data.some(gid => colliding.has(gid)), 'no tile in "ground" has collides=true');
});

test('every object type and drop is one Level understands', () => {
  for (const o of objects) {
    assert.ok(OBJECT_TYPES.includes(typeOf(o)), `unknown object type "${typeOf(o)}" at ${o.x},${o.y}`);
    const drop = o.properties?.find(p => p.name === 'drop')?.value;
    if (drop !== undefined) assert.ok(DROP_KINDS.includes(drop), `unknown drop "${drop}" at ${o.x},${o.y}`);
  }
});

test('exactly one player_start, left of exactly one screen-wide boss_arena', () => {
  const starts = objects.filter(o => typeOf(o) === 'player_start');
  const arenas = objects.filter(o => typeOf(o) === 'boss_arena');
  assert.equal(starts.length, 1);
  assert.equal(arenas.length, 1);
  assert.equal(arenas[0].width, GAME_W);
  assert.ok(starts[0].x < arenas[0].x);
  assert.ok(arenas[0].x + arenas[0].width <= map.width * map.tilewidth);
});
```

Run: `npm test`
Expected: FAIL with `ENOENT ... level1.json`

- [ ] **Step 2: Write `tools/make-level.mjs`**

```js
// One-shot generator for the starting level, written as ASCII segments.
// After the first run, edit public/assets/maps/level1.json in Tiled instead;
// re-running this script OVERWRITES Tiled edits.
//
// Legend: '.' empty  '#' ground  P player_start  S soldier  Q soldier (drops energy)
//         D drone  T turret (facing left)  E energy pickup
//         C crate→spread  L crate→laser  c crate→energy
// Rows are bottom-aligned (last row = map bottom); short rows are padded with '.'.
import { writeFileSync, mkdirSync } from 'node:fs';
import { relative, dirname } from 'node:path';
import { TILESET, MAP } from '../src/assets.js';
import { GAME_W } from '../src/logic.js';

const H = 17;
const T = TILESET.tileWidth;
const G30 = '#'.repeat(30);
const SEGMENTS = [
  { w: 30, rows: ['...P................C.....S...', G30, G30, G30] },
  { w: 30, rows: ['........D..........D..........', '', '', '', '..................S...........', '..............########........', '..............########........', '###...########################', '###...########################', '###...########################'] },
  { w: 30, rows: ['....................##########', '.............E.....T##########', '............####....##########', '............####....##########', G30, G30, G30] },
  { w: 30, rows: ['........D.........D...........', '', '', '', '####..........................', '####..##......................', '####..........................', '####....................S.....', '####......####################', '####......####################', '####......####################'] },
  { w: 30, rows: ['...............T..............', '..............###.............', '..............###.............', '.....L...S....###.......Q.....', G30, G30, G30] },
  { w: 30, rows: ['..........D...........D.......', '', '', '', '', '............####..............', '............####........S.....', '......####..####..############', '...c..####..####..############', G30, G30, G30] },
  { w: 20, rows: ['..........E.........', '#'.repeat(20), '#'.repeat(20), '#'.repeat(20)] },
  { w: 30, arena: true, rows: ['......###............###......', '', '', G30, G30, G30] },
];
const KINDS = {
  P: ['player_start'], S: ['soldier'], Q: ['soldier', { drop: 'energy' }], D: ['drone'],
  T: ['turret', { facing: 'left' }], E: ['energy'],
  C: ['crate', { drop: 'spread' }], L: ['crate', { drop: 'laser' }], c: ['crate', { drop: 'energy' }],
};

const grid = Array.from({ length: H }, () => []);
let arena = null;
for (const seg of SEGMENTS) {
  const x0 = grid[0].length;
  const top = H - seg.rows.length;
  if (top < 0) throw new Error(`segment at column ${x0} has more than ${H} rows`);
  for (let r = 0; r < H; r++) {
    const line = r < top ? '' : seg.rows[r - top];
    if (line.length > seg.w) throw new Error(`row ${r} of segment at column ${x0} is longer than ${seg.w}`);
    grid[r].push(...line.padEnd(seg.w, '.'));
  }
  if (seg.arena) arena = { x: x0 * T, width: seg.w * T };
}
if (!arena || arena.width !== GAME_W) throw new Error(`boss arena must be exactly ${GAME_W}px wide`);

const W = grid[0].length;
const data = [];
const objects = [];
let nextId = 1;
const props = obj => Object.entries(obj ?? {}).map(([name, value]) => ({ name, type: 'string', value }));
for (let r = 0; r < H; r++) {
  for (let c = 0; c < W; c++) {
    const ch = grid[r][c];
    if (ch === '#') {
      data.push(1 + (r > 0 && grid[r - 1][c] === '#' ? TILESET.solidFill : TILESET.solidTop));
      continue;
    }
    data.push(0);
    if (ch === '.') continue;
    const kind = KINDS[ch];
    if (!kind) throw new Error(`unknown character '${ch}' at row ${r}, column ${c}`);
    objects.push({ id: nextId++, name: '', type: kind[0], x: c * T + T / 2, y: (r + 1) * T, width: 0, height: 0, rotation: 0, visible: true, point: true, properties: props(kind[1]) });
  }
}
objects.push({ id: nextId++, name: '', type: 'boss_arena', x: arena.x, y: 0, width: arena.width, height: H * T, rotation: 0, visible: true, properties: [] });

const out = 'public/' + MAP.path;
const collides = [...new Set([TILESET.solidTop, TILESET.solidFill])].map(id => ({ id, properties: [{ name: 'collides', type: 'bool', value: true }] }));
const map = {
  type: 'map', version: '1.10', tiledversion: '1.11.0', orientation: 'orthogonal', renderorder: 'right-down',
  infinite: false, compressionlevel: -1, width: W, height: H, tilewidth: T, tileheight: T,
  nextlayerid: 3, nextobjectid: nextId,
  layers: [
    { id: 1, name: 'ground', type: 'tilelayer', x: 0, y: 0, width: W, height: H, opacity: 1, visible: true, data },
    { id: 2, name: 'objects', type: 'objectgroup', draworder: 'topdown', x: 0, y: 0, opacity: 1, visible: true, objects },
  ],
  tilesets: [{
    firstgid: 1, name: TILESET.name, image: relative(dirname(out), 'public/' + TILESET.path),
    imagewidth: TILESET.imagewidth, imageheight: TILESET.imageheight, tilewidth: T, tileheight: T,
    columns: TILESET.columns, tilecount: TILESET.tilecount, margin: 0, spacing: 0, tiles: collides,
  }],
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(map));
console.log(`wrote ${out}: ${W}x${H} tiles, ${objects.length} objects`);
```

- [ ] **Step 3: Generate the map**

Run: `npm run level`
Expected: `wrote public/assets/maps/level1.json: 230x17 tiles, 21 objects`

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS for all `logic`, `assets`, and `level` tests.

- [ ] **Step 5: Commit**

```bash
git add tools/make-level.mjs public/assets/maps/level1.json test/level.test.js
git commit -m "feat: generate starting level as Tiled JSON

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Input + Preload / Title / End scenes

**Files:**
- Create: `src/input.js`, `src/scenes/Preload.js`, `src/scenes/Title.js`, `src/scenes/End.js`, `src/scenes/Level.js` (temporary stub; Task 5 replaces it)
- Modify: `src/main.js` (full replacement)
- Test: `test/input.test.js`

**Interfaces:**
- Consumes: `withEdges`, `GAME_W`, `GAME_H`, `safeStorage`, `loadHighScore`, `saveHighScore` from `logic.js`; `SHEETS`, `IMAGES`, `AUDIO`, `ANIMS`, `TILESET`, `MAP`, `CREDIT_LINE` from `assets.js`.
- Produces:
  - `src/input.js` (no Phaser import): `KEY_NAMES: string`; `readRaw(keys, pad): {left,right,up,jump,shoot,dash,start,mute}`; `createInput(scene): { read(): raw & {jumpPressed,dashPressed,startPressed,mutePressed} }`. Call `read()` exactly once per frame.
  - Scenes registered under the keys `'Preload'`, `'Title'`, `'Level'`, `'End'`. `End` is started with `{ victory: boolean, score: number }`.
  - `window.game`, the Phaser.Game instance (used by Playwright checks).
  - All textures (including generated rectangles) and all anims exist once Preload finishes.

- [ ] **Step 1: Write the failing input test**

`test/input.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRaw, KEY_NAMES } from '../src/input.js';

const keys = (...down) => Object.fromEntries(KEY_NAMES.split(',').map(n => [n, { isDown: down.includes(n) }]));

test('keyboard works with no gamepad', () => {
  const r = readRaw(keys('A', 'Z', 'UP'), undefined);
  assert.equal(r.left, true);
  assert.equal(r.right, false);
  assert.equal(r.jump, true);
  assert.equal(r.up, true);
  assert.equal(r.start, false);
});

test('non-standard pad (no sticks, few buttons) does not throw', () => {
  assert.doesNotThrow(() => readRaw(keys(), { buttons: [{ pressed: true }] }));
  assert.equal(readRaw(keys(), { buttons: [{ pressed: true }] }).jump, true); // button 0 = A
  assert.equal(readRaw(keys(), { buttons: [] }).dash, false);
});

test('stick past the deadzone moves; inside it does not', () => {
  assert.equal(readRaw(keys(), { buttons: [], leftStick: { x: -0.9, y: 0 } }).left, true);
  assert.equal(readRaw(keys(), { buttons: [], leftStick: { x: 0.2, y: 0 } }).right, false);
  assert.equal(readRaw(keys(), { buttons: [], leftStick: { x: 0, y: -0.8 } }).up, true);
});

test('Space is both jump and start (separate scenes use each)', () => {
  const r = readRaw(keys('SPACE'), null);
  assert.equal(r.jump, true);
  assert.equal(r.start, true);
});
```

Run: `npm test`
Expected: FAIL. `Cannot find module '.../src/input.js'`

- [ ] **Step 2: Implement `src/input.js`**

```js
import { withEdges } from './logic.js';

export const KEY_NAMES = 'LEFT,RIGHT,UP,W,A,D,Z,SPACE,X,J,C,K,M,ENTER';
const PAD = { A: 0, B: 1, X: 2, RB: 5, START: 9, UP: 12, LEFT: 14, RIGHT: 15 }; // standard mapping
const DEADZONE = 0.4;

// Keyboard + optional gamepad → one held-state object. Safe with pad null/undefined
// or non-standard pads (missing sticks, fewer buttons).
export function readRaw(k, pad) {
  const btn = i => !!pad?.buttons?.[i]?.pressed;
  const sx = pad?.leftStick?.x ?? 0;
  const sy = pad?.leftStick?.y ?? 0;
  return {
    left: k.LEFT.isDown || k.A.isDown || btn(PAD.LEFT) || sx < -DEADZONE,
    right: k.RIGHT.isDown || k.D.isDown || btn(PAD.RIGHT) || sx > DEADZONE,
    up: k.UP.isDown || k.W.isDown || btn(PAD.UP) || sy < -DEADZONE,
    jump: k.Z.isDown || k.SPACE.isDown || btn(PAD.A),
    shoot: k.X.isDown || k.J.isDown || btn(PAD.X),
    dash: k.C.isDown || k.K.isDown || btn(PAD.B) || btn(PAD.RB),
    start: k.ENTER.isDown || k.SPACE.isDown || btn(PAD.START) || btn(PAD.A),
    mute: k.M.isDown,
  };
}

export function createInput(scene) {
  const keys = scene.input.keyboard.addKeys(KEY_NAMES);
  let prev = null;
  return {
    read() {
      const raw = readRaw(keys, scene.input.gamepad?.pad1);
      const out = withEdges(raw, prev);
      prev = raw;
      return out;
    },
  };
}
```

Run: `npm test`
Expected: PASS for all tests.

- [ ] **Step 3: Write `src/scenes/Preload.js`**

```js
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../logic.js';
import { SHEETS, IMAGES, AUDIO, ANIMS, TILESET, MAP } from '../assets.js';

export default class Preload extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const bar = this.add.rectangle(GAME_W / 2 - 100, GAME_H / 2, 0, 6, 0x00f0ff).setOrigin(0, 0.5);
    this.load.on('progress', p => { bar.width = 200 * p; });
    this.load.on('loaderror', file => console.error(`Failed to load ${file.key} from ${file.src}`));
    for (const [key, s] of Object.entries(SHEETS)) this.load.spritesheet(key, s.path, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
    for (const [key, v] of Object.entries(IMAGES)) if (typeof v === 'string') this.load.image(key, v);
    for (const [key, path] of Object.entries(AUDIO)) this.load.audio(key, path);
    this.load.image(TILESET.key, TILESET.path);
    this.load.tilemapTiledJSON(MAP.key, MAP.path);
  }

  create() {
    for (const [key, v] of Object.entries(IMAGES)) {
      if (typeof v === 'string') continue;
      this.make.graphics({}, false).fillStyle(v.color).fillRect(0, 0, v.w, v.h).generateTexture(key, v.w, v.h).destroy();
    }
    for (const a of ANIMS) {
      this.anims.create({ key: a.key, frames: this.anims.generateFrameNumbers(a.sheet, { frames: a.frames }), frameRate: a.frameRate, repeat: a.repeat });
    }
    this.scene.start('Title');
  }
}
```

- [ ] **Step 4: Write `src/scenes/Title.js`**

```js
import Phaser from 'phaser';
import { GAME_W, GAME_H, safeStorage, loadHighScore } from '../logic.js';
import { CREDIT_LINE } from '../assets.js';
import { createInput } from '../input.js';

const BLURB = 'NEO-KOWLOON, 2089.\nYou stole the wrong data from the wrong corp.\nNow every drone in the city wants it back.\nReach the extraction point. Don\'t flatline.';
const FONT = { fontFamily: 'monospace', color: '#c8f7ff' };

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.sound.removeAll();
    const cx = GAME_W / 2;
    this.add.image(0, 0, 'bg-far').setOrigin(0).setDisplaySize(GAME_W, GAME_H).setAlpha(0.6);
    this.add.text(cx, 44, 'CYBERSHOOT', { ...FONT, fontSize: '32px', color: '#ff2bd6', stroke: '#00f0ff', strokeThickness: 2 }).setOrigin(0.5);
    this.add.text(cx, 112, BLURB, { ...FONT, fontSize: '10px', align: 'center', lineSpacing: 4 }).setOrigin(0.5);
    const prompt = this.add.text(cx, 178, 'PRESS ENTER / START', { ...FONT, fontSize: '12px', color: '#00f0ff' }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    this.add.text(cx, 204, 'Z jump   X shoot   C dash   hold UP aim up   M mute', { ...FONT, fontSize: '8px' }).setOrigin(0.5);
    this.add.text(cx, 222, `BEST ${loadHighScore(safeStorage())}`, { ...FONT, fontSize: '10px' }).setOrigin(0.5);
    this.add.text(cx, GAME_H - 10, CREDIT_LINE, { ...FONT, fontSize: '7px', color: '#7a8a99' }).setOrigin(0.5);
    this.controls = createInput(this);
  }

  update() {
    if (this.controls.read().startPressed) this.scene.start('Level');
  }
}
```

- [ ] **Step 5: Write `src/scenes/End.js`**

```js
import Phaser from 'phaser';
import { GAME_W, GAME_H, safeStorage, saveHighScore } from '../logic.js';
import { createInput } from '../input.js';

const FONT = { fontFamily: 'monospace', color: '#c8f7ff' };
const LOCKOUT_MS = 600; // ignore input briefly so mashing jump/start while dying doesn't skip this screen

export default class End extends Phaser.Scene {
  constructor() { super('End'); }

  init(data) {
    this.victory = !!data.victory;
    this.finalScore = data.score ?? 0;
  }

  create() {
    this.sound.removeAll();
    const best = saveHighScore(safeStorage(), this.finalScore);
    const cx = GAME_W / 2;
    this.add.text(cx, 70, this.victory ? 'MISSION COMPLETE' : 'FLATLINED', { ...FONT, fontSize: '28px', color: this.victory ? '#00f0ff' : '#ff2b4e' }).setOrigin(0.5);
    this.add.text(cx, 120, `SCORE ${this.finalScore}`, { ...FONT, fontSize: '14px' }).setOrigin(0.5);
    this.add.text(cx, 140, `BEST ${best}`, { ...FONT, fontSize: '14px' }).setOrigin(0.5);
    if (this.finalScore > 0 && this.finalScore >= best) this.add.text(cx, 160, 'NEW HIGH SCORE', { ...FONT, fontSize: '10px', color: '#ff2bd6' }).setOrigin(0.5);
    this.add.text(cx, GAME_H - 50, 'PRESS ENTER / START TO RETRY', { ...FONT, fontSize: '12px', color: '#00f0ff' }).setOrigin(0.5);
    this.controls = createInput(this);
    this.readyAt = this.time.now + LOCKOUT_MS;
  }

  update(time) {
    const c = this.controls.read(); // read every frame so edge detection stays current during the lockout
    if (time >= this.readyAt && c.startPressed) this.scene.start('Level');
  }
}
```

- [ ] **Step 6: Write the temporary `src/scenes/Level.js` stub (Task 5 replaces it)**

```js
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../logic.js';
import { createInput } from '../input.js';

// Temporary stub to exercise Title → Level → End flow. Replaced in Task 5.
export default class Level extends Phaser.Scene {
  constructor() { super('Level'); }
  create() {
    this.add.text(GAME_W / 2, GAME_H / 2, 'LEVEL STUB — ENTER to win', { fontFamily: 'monospace', fontSize: '12px', color: '#fff' }).setOrigin(0.5);
    this.controls = createInput(this);
  }
  update() {
    if (this.controls.read().startPressed) this.scene.start('End', { victory: true, score: 1234 });
  }
}
```

- [ ] **Step 7: Replace `src/main.js`**

```js
import Phaser from 'phaser';
import { GAME_W, GAME_H } from './logic.js';
import Preload from './scenes/Preload.js';
import Title from './scenes/Title.js';
import Level from './scenes/Level.js';
import End from './scenes/End.js';

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,
  backgroundColor: '#05010d',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 900 }, debug: new URLSearchParams(location.search).has('debug') } },
  input: { gamepad: true },
  scene: [Preload, Title, Level, End],
});
```

- [ ] **Step 8: Verify the scene flow in a browser**

Run in the background: `npm run dev -- --port 5173 --strictPort`
With the Playwright MCP tools:
1. `browser_navigate` to `http://localhost:5173/`. Wait about 2 s.
2. `browser_evaluate`: `() => game.scene.getScenes(true).map(s => s.scene.key)`. Expected: `["Title"]`.
3. `browser_run_code_unsafe`: `async (page) => { await page.keyboard.press('Enter', { delay: 100 }); }`, then evaluate the same expression. Expected: `["Level"]`.
4. Press Enter again (same way) and evaluate. Expected: `["End"]`. Take a screenshot; it shows "MISSION COMPLETE", "SCORE 1234", and "BEST 1234".
5. `browser_console_messages`. Expected: no errors (in particular no `Failed to load`).

Stop the dev server.

- [ ] **Step 9: Commit**

```bash
git add src/input.js src/scenes src/main.js test/input.test.js
git commit -m "feat: input layer, preload/title/end scenes

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Player + Level core (map, parallax, camera, HUD, pits, music, mute)

**Files:**
- Create: `src/player.js`, `src/weapons.js` (only `createBulletGroup` for now; Task 6 adds the rest)
- Modify: `src/scenes/Level.js` (full replacement of the stub)

**Interfaces:**
- Consumes: `createInput` (`input.js`); `GAME_W`, `GAME_H`, `MAX_ENERGY`, `START_ENERGY` (`logic.js`); `TILESET`, `MAP`, `BACKGROUNDS`, `ENTITIES` (`assets.js`).
- Produces:
  - `src/player.js`: `export default class Player extends Phaser.Physics.Arcade.Sprite` with `constructor(scene, x, y, bullets)`, `update(controls)`, `hit(): boolean` (true if damage applied), and the fields `energy: number`, `weapon: 'blaster'|'spread'|'laser'`, `facing: 1|-1`, `invulnUntil: number`. Exported tuning constants: `RUN_SPEED`, `JUMP_VELOCITY`, `JUMP_CUT`, `DASH_SPEED`, `DASH_MS`, `DASH_COOLDOWN_MS`, `IFRAME_MS`.
  - `src/weapons.js`: `createBulletGroup(scene, maxSize): Phaser.Physics.Arcade.Group`
  - `Level` (scene key `'Level'`) fields: `map`, `ground`, `player`, `playerBullets`, `enemyBullets`, `score`, `ended`, `arena: Phaser.Geom.Rectangle|null`, `ctx: { scene, player, ground, enemyBullets, arena, onKilled }`. Methods: `hurtPlayer(): boolean`, `endRun(victory: boolean, delayMs = 0)`, `explode(x, y)`, `floorY(x): number`. Module helper `placeOnGround(sprite, bottomY)`.

- [ ] **Step 1: Write `src/weapons.js` (group factory only)**

```js
// Bullet pools. Members are recycled with enableBody/disableBody.
export function createBulletGroup(scene, maxSize) {
  return scene.physics.add.group({ allowGravity: false, maxSize });
}
```

- [ ] **Step 2: Write `src/player.js`**

```js
import Phaser from 'phaser';
import { START_ENERGY } from './logic.js';
import { ENTITIES } from './assets.js';

// Tuning knobs: playtest and adjust.
export const RUN_SPEED = 140;
export const JUMP_VELOCITY = -330; // ~60px peak with gravity 900
export const JUMP_CUT = 0.45;      // upward speed multiplier when jump is released early
export const DASH_SPEED = 320;
export const DASH_MS = 200;
export const DASH_COOLDOWN_MS = 600;
export const IFRAME_MS = 1000;

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, bullets) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.bullets = bullets;
    this.hitbox = ENTITIES.player.body;
    this.body.setSize(this.hitbox.w, this.hitbox.h).setOffset(this.hitbox.ox, this.hitbox.oy);
    this.setCollideWorldBounds(true).setDepth(10);
    this.energy = START_ENERGY;
    this.weapon = 'blaster';
    this.facing = 1;
    this.inDash = false;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.invulnUntil = 0;
    this.lastShotAt = -Infinity;
    this.jumpCut = false;
  }

  update(c) {
    const now = this.scene.time.now;
    const body = this.body;
    const onFloor = body.blocked.down;

    if (this.inDash && now >= this.dashUntil) this.endDash();
    if (this.inDash) {
      body.setVelocityX(this.facing * DASH_SPEED);
    } else {
      const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
      body.setVelocityX(dir * RUN_SPEED);
      if (dir) this.facing = dir;
      if (c.jumpPressed && onFloor) { body.setVelocityY(JUMP_VELOCITY); this.jumpCut = false; }
      if (!c.jump && body.velocity.y < 0 && !this.jumpCut) { body.setVelocityY(body.velocity.y * JUMP_CUT); this.jumpCut = true; }
      if (c.dashPressed && now >= this.dashReadyAt) this.startDash(onFloor);
    }
    this.shootIfReady?.(c, now); // added in Task 6

    this.setFlipX(this.facing < 0);
    this.setAlpha(now < this.invulnUntil && Math.floor(now / 60) % 2 ? 0.3 : 1);
    const anim = this.inDash ? 'player-dash' : !onFloor ? 'player-jump' : body.velocity.x ? 'player-run' : 'player-idle';
    this.play(anim, true);
  }

  startDash(onFloor) {
    const now = this.scene.time.now;
    const b = this.hitbox;
    this.inDash = true;
    this.dashUntil = now + DASH_MS;
    this.dashReadyAt = now + DASH_MS + DASH_COOLDOWN_MS;
    if (onFloor) {
      this.body.setSize(b.w, b.h / 2).setOffset(b.ox, b.oy + b.h / 2); // slide: duck under shots
    } else {
      this.body.setAllowGravity(false);
      this.body.setVelocityY(0);
    }
    this.scene.sound.play('sfx-dash', { volume: 0.5 });
  }

  endDash() {
    const b = this.hitbox;
    this.inDash = false;
    this.body.setSize(b.w, b.h).setOffset(b.ox, b.oy);
    this.body.setAllowGravity(true);
  }

  // Each hit costs one energy pack. Dash and post-hit i-frames ignore hits.
  hit() {
    const now = this.scene.time.now;
    if (this.inDash || now < this.invulnUntil || this.energy <= 0) return false;
    this.energy -= 1;
    this.invulnUntil = now + IFRAME_MS;
    return true;
  }
}
```

- [ ] **Step 3: Replace `src/scenes/Level.js`**

```js
import Phaser from 'phaser';
import { GAME_W, GAME_H, MAX_ENERGY } from '../logic.js';
import { TILESET, MAP, BACKGROUNDS } from '../assets.js';
import { createInput } from '../input.js';
import Player from '../player.js';
import { createBulletGroup } from '../weapons.js';

const HUD_FONT = { fontFamily: 'monospace', fontSize: '10px', color: '#c8f7ff' };

// Move a physics sprite so the bottom of its hitbox sits at bottomY.
// Uses sourceHeight (unscaled) so it is correct before Arcade rescales the body.
export function placeOnGround(s, bottomY) {
  s.y = bottomY - s.scaleY * (s.body.offset.y - s.displayOriginY + s.body.sourceHeight);
  s.body.reset(s.x, s.y);
}

export default class Level extends Phaser.Scene {
  constructor() { super('Level'); }

  create() {
    this.sound.removeAll();
    this.physics.resume(); // in case a previous run ended with physics paused
    this.ended = false;
    this.score = 0;
    this.arena = null;
    this.boss = null;
    this.controls = createInput(this);

    this.map = this.make.tilemap({ key: MAP.key });
    this.parallax = BACKGROUNDS.map(({ key, scrollFactor }) => {
      const bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, key).setOrigin(0).setScrollFactor(0);
      bg.setTileScale(GAME_H / this.textures.get(key).getSourceImage().height);
      return { bg, scrollFactor };
    });
    const tileset = this.map.addTilesetImage(TILESET.name, TILESET.key);
    this.ground = this.map.createLayer('ground', tileset);
    this.ground.setCollisionByProperty({ collides: true });

    const { widthInPixels: mw, heightInPixels: mh } = this.map;
    this.physics.world.setBounds(0, 0, mw, mh);
    this.physics.world.setBoundsCollision(true, true, true, false); // open bottom: pits kill
    this.cameras.main.setBounds(0, 0, mw, mh);

    this.playerBullets = createBulletGroup(this, 40);
    this.enemyBullets = createBulletGroup(this, 60);
    // (Task 7 adds enemy/crate groups here; Task 6 adds pickups.)

    this.spawnObjects();
    this.physics.add.collider(this.player, this.ground);
    // (Tasks 6–8 add colliders/overlaps here.)

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.createHud();
    this.music = this.sound.add('music-level', { loop: true, volume: 0.4 });
    this.music.play();
  }

  spawnObjects() {
    const objects = this.map.getObjectLayer('objects')?.objects ?? [];
    const typeOf = o => o.type || o.class; // Tiled 1.9 saved "class"
    const start = objects.find(o => typeOf(o) === 'player_start');
    if (!start) throw new Error('level1.json has no player_start object');
    this.player = new Player(this, start.x, start.y, this.playerBullets);
    placeOnGround(this.player, start.y);
    this.ctx = { scene: this, player: this.player, ground: this.ground, enemyBullets: this.enemyBullets, arena: null, onKilled: e => this.onKilled(e) };

    for (const o of objects) {
      const type = typeOf(o);
      const props = Object.fromEntries((o.properties ?? []).map(p => [p.name, p.value]));
      const mid = o.y - TILESET.tileWidth / 2; // generator puts points at a cell's bottom-centre
      switch (type) {
        case 'player_start': break;
        case 'boss_arena': this.arena = this.ctx.arena = new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height); break;
        // (Tasks 6–7 add cases here.)
        default: console.warn(`Unknown object type "${type}" at ${o.x},${o.y}; skipped`);
      }
    }
  }

  createHud() {
    this.hudEnergy = Array.from({ length: MAX_ENERGY }, (_, i) => this.add.image(8 + i * 12, 8, 'hud-energy').setOrigin(0).setScrollFactor(0).setDepth(100));
    this.hudText = this.add.text(GAME_W - 8, 6, '', HUD_FONT).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.bossBar = this.add.graphics().setScrollFactor(0).setDepth(100);
  }

  updateHud() {
    this.hudEnergy.forEach((img, i) => img.setAlpha(i < this.player.energy ? 1 : 0.2));
    this.hudText.setText(`${this.player.weapon.toUpperCase()}  ${String(this.score).padStart(6, '0')}`);
    this.bossBar.clear();
    if (this.boss && !this.boss.dead) {
      this.bossBar.fillStyle(0x330011).fillRect(140, GAME_H - 14, 200, 6);
      this.bossBar.fillStyle(0xff2b4e).fillRect(140, GAME_H - 14, 200 * Math.max(0, this.boss.hp) / this.boss.maxHp, 6);
    }
  }

  update(time) {
    if (this.ended) return;
    const c = this.controls.read();
    if (c.mutePressed) this.sound.mute = !this.sound.mute;
    this.player.update(c);
    // (Task 6 adds bullet expiry; Task 8 adds the boss trigger/update here.)
    for (const { bg, scrollFactor } of this.parallax) bg.tilePositionX = this.cameras.main.scrollX * scrollFactor;
    if (this.player.y > this.map.heightInPixels + 32) this.endRun(false, 300);
    this.updateHud();
  }

  hurtPlayer() {
    if (this.ended || !this.player.hit()) return false;
    this.sound.play('sfx-hit');
    this.cameras.main.shake(100, 0.006);
    if (this.player.energy <= 0) this.endRun(false, 900);
    return true;
  }

  onKilled(e) {
    // Filled in by Task 7 (score, explosion, drops) and Task 8 (boss).
  }

  explode(x, y) {
    const fx = this.add.sprite(x, y, 'explosion').setDepth(20);
    fx.play('explosion');
    fx.once('animationcomplete', () => fx.destroy());
    this.sound.play('sfx-explosion', { volume: 0.5 });
  }

  // First collidable tile's top edge in column x (used for the boss floor).
  floorY(x) {
    for (let y = 0; y < this.map.heightInPixels; y += TILESET.tileWidth) {
      const t = this.ground.getTileAtWorldXY(x, y);
      if (t?.collides) return t.pixelY;
    }
    return this.map.heightInPixels;
  }

  endRun(victory, delayMs = 0) {
    if (this.ended) return;
    this.ended = true;
    if (victory) {
      this.player.invulnUntil = Infinity;
      this.player.body.setVelocityX(0);
    } else {
      this.physics.pause();
      this.player.setVisible(false);
      this.explode(this.player.x, this.player.y);
    }
    this.time.delayedCall(delayMs, () => this.scene.start('End', { victory, score: this.score }));
  }
}
```

- [ ] **Step 4: Run the unit tests and the build**

Run: `npm test && npm run build`
Expected: all tests PASS; the build succeeds.

- [ ] **Step 5: Playtest movement**

Run in the background: `npm run dev -- --port 5173 --strictPort`. `browser_navigate` to `http://localhost:5173/?debug`, then press Enter (with `browser_run_code_unsafe`, `page.keyboard.press('Enter', { delay: 100 })`). Take a screenshot. Expected: the tiled level is visible behind 3 parallax layers; the player stands on the ground (its debug hitbox bottom touches the tile tops, not floating or sunk); the HUD shows 3 bright pips and 1 dim one, plus `BLASTER  000000`.

Hold right for 1.5 s (`page.keyboard.down('ArrowRight'); await page.waitForTimeout(1500); page.keyboard.up('ArrowRight')`), then take a screenshot. Expected: the camera scrolled, and the player is still on the ground. Console warnings `Unknown object type "soldier"…` are **expected** until Task 7. There must be no errors.

If the player floats or sinks, fix `ENTITIES.player.body` in `src/assets.js` (the frame's transparent padding), not the code.

- [ ] **Step 6: Verify Review Focus 1 and 5 (pit death, then retry)**

With the dev server still running:
1. Press Enter on Title. Evaluate: `() => { const L = game.scene.getScene('Level'); L.player.setPosition(536, 120); L.player.body.reset(536, 120); }` (x 536 = the first pit). Wait 2 s. Evaluate `() => game.scene.getScenes(true).map(s => s.scene.key)`. Expected: `["End"]`, and a screenshot shows FLATLINED.
2. Wait 1 s, then press Enter. Evaluate:
   `() => { const L = game.scene.getScene('Level'); return { energy: L.player.energy, weapon: L.player.weapon, score: L.score, paused: L.physics.world.isPaused, playing: L.sound.getAllPlaying().length }; }`
   Expected: `{ energy: 3, weapon: 'blaster', score: 0, paused: false, playing: 1 }`.
3. Evaluate `() => { const L = game.scene.getScene('Level'); for (let i = 0; i < 3; i++) { L.player.invulnUntil = 0; L.hurtPlayer(); } }`. Wait 2 s. Expected: End is active (energy 0 means game over).

Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add src/player.js src/weapons.js src/scenes/Level.js
git commit -m "feat: player movement/dash, level map, camera, HUD, pits

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Weapons, shooting, and pickups

**Files:**
- Modify: `src/weapons.js`, `src/player.js`, `src/scenes/Level.js`

**Interfaces:**
- Consumes: `spreadAngles`, `aimAngle`, `applyEnergyPickup` (`logic.js`); `Level` from Task 5.
- Produces:
  - `src/weapons.js`: `WEAPONS: { blaster, spread, laser }`, each `{ texture, cooldown, speed, count, stepDeg, damage, pierce }`; `fireBullet(group, texture, x, y, angle, speed, opts?) → sprite|null`, where `opts = { damage=1, pierce=false, lifespan=1200, gravity=false, ignoreGround=false }`; `killBullet(b)`; `expireBullets(group, time, view: Phaser.Geom.Rectangle)`. Bullet fields: `damage`, `pierce`, `ignoreGround`, `hits: Set`, `dieAt`.
  - `Player.shootIfReady(controls, now)`.
  - `Level`: `pickups` group; `spawnPickup(kind: 'spread'|'laser'|'energy', x, y)`; `collect(item)`; `bulletHits(bullet, target)`, which calls `target.hit(bullet.damage)`. Targets must implement `hit(n)`.

- [ ] **Step 1: Complete `src/weapons.js`**

Replace the whole file:
```js
// Bullet pools. Members are recycled with enableBody/disableBody.
export const WEAPONS = {
  blaster: { texture: 'bullet', cooldown: 180, speed: 420, count: 1, stepDeg: 0, damage: 1, pierce: false },
  spread: { texture: 'bullet', cooldown: 260, speed: 380, count: 3, stepDeg: 15, damage: 1, pierce: false },
  laser: { texture: 'laser', cooldown: 140, speed: 700, count: 1, stepDeg: 0, damage: 1, pierce: true },
};

export function createBulletGroup(scene, maxSize) {
  return scene.physics.add.group({ allowGravity: false, maxSize });
}

// Returns null when the pool is exhausted: the shot is just skipped.
export function fireBullet(group, texture, x, y, angle, speed, { damage = 1, pierce = false, lifespan = 1200, gravity = false, ignoreGround = false } = {}) {
  const b = group.get(x, y, texture);
  if (!b) return null;
  b.setTexture(texture);
  b.enableBody(true, x, y, true, true);
  b.setRotation(angle);
  b.body.setSize(); // match this texture's size
  if (Math.abs(Math.sin(angle)) > 0.7) b.body.setSize(b.height, b.width); // AABB doesn't rotate
  b.body.setAllowGravity(gravity);
  b.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  b.damage = damage;
  b.pierce = pierce;
  b.ignoreGround = ignoreGround;
  b.hits = new Set();
  b.dieAt = group.scene.time.now + lifespan;
  return b;
}

export function killBullet(b) {
  b.disableBody(true, true);
}

// Kill bullets past their lifespan or well outside the camera view.
export function expireBullets(group, time, view) {
  for (const b of group.getChildren()) {
    if (!b.active) continue;
    if (time >= b.dieAt || b.x < view.x - 16 || b.x > view.right + 16 || b.y < view.y - 64 || b.y > view.bottom + 16) killBullet(b);
  }
}
```

- [ ] **Step 2: Add shooting to `src/player.js`**

Change the imports at the top to:
```js
import Phaser from 'phaser';
import { START_ENERGY, aimAngle, spreadAngles } from './logic.js';
import { ENTITIES } from './assets.js';
import { WEAPONS, fireBullet } from './weapons.js';
```
After the `IFRAME_MS` line, add:
```js
const MUZZLE = { x: 12, y: -2, upX: 2, upY: -16 }; // offsets from sprite centre: tune to the art
```
In `update(c)`, replace `this.shootIfReady?.(c, now); // added in Task 6` with `this.shootIfReady(c, now);`. Then add this method after `endDash()`:
```js
  shootIfReady(c, now) {
    const w = WEAPONS[this.weapon];
    if (!c.shoot || now < this.lastShotAt + w.cooldown) return;
    this.lastShotAt = now;
    const x = this.x + this.facing * (c.up ? MUZZLE.upX : MUZZLE.x);
    const y = this.y + (c.up ? MUZZLE.upY : MUZZLE.y);
    for (const a of spreadAngles(aimAngle(this.facing, c.up), w.count, w.stepDeg)) {
      fireBullet(this.bullets, w.texture, x, y, a, w.speed, { damage: w.damage, pierce: w.pierce });
    }
    this.scene.sound.play('sfx-shot', { volume: 0.3 });
  }
```

- [ ] **Step 3: Wire bullets and pickups into `src/scenes/Level.js`**

Imports: change `import { GAME_W, GAME_H, MAX_ENERGY } from '../logic.js';` to `import { GAME_W, GAME_H, MAX_ENERGY, applyEnergyPickup } from '../logic.js';` and `import { createBulletGroup } from '../weapons.js';` to `import { createBulletGroup, killBullet, expireBullets } from '../weapons.js';`.

In `create()`, replace `// (Task 7 adds enemy/crate groups here; Task 6 adds pickups.)` with:
```js
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    // (Task 7 adds enemy/crate groups here.)
```
Replace `// (Tasks 6–8 add colliders/overlaps here.)` with:
```js
    this.physics.add.collider(this.playerBullets, this.ground, b => killBullet(b));
    this.physics.add.collider(this.enemyBullets, this.ground, b => killBullet(b), b => !b.ignoreGround);
    this.physics.add.overlap(this.player, this.enemyBullets, (p, b) => { if (b.active && this.hurtPlayer()) killBullet(b); });
    this.physics.add.overlap(this.player, this.pickups, (p, item) => this.collect(item));
    // (Tasks 7–8 add colliders/overlaps here.)
```
In `spawnObjects()`, replace `// (Tasks 6–7 add cases here.)` with:
```js
        case 'energy': this.spawnPickup('energy', o.x, mid); break;
        // (Task 7 adds enemy and crate cases here.)
```
In `update()`, replace `// (Task 6 adds bullet expiry; Task 8 adds the boss trigger/update here.)` with:
```js
    expireBullets(this.playerBullets, time, this.cameras.main.worldView);
    expireBullets(this.enemyBullets, time, this.cameras.main.worldView);
    // (Task 8 adds the boss trigger/update here.)
```
Add these methods after `hurtPlayer()`:
```js
  spawnPickup(kind, x, y) {
    const item = this.pickups.create(x, y, 'pickup-' + kind);
    item.kind = kind;
    this.tweens.add({ targets: item, y: y - 4, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return item;
  }

  collect(item) {
    if (item.kind === 'energy') {
      const r = applyEnergyPickup(this.player.energy);
      if (!r.collected) return; // at max: leave it for later
      this.player.energy = r.energy;
    } else {
      this.player.weapon = item.kind;
    }
    this.sound.play('sfx-pickup');
    item.destroy();
  }

  // Pierce bullets keep flying but damage each target only once.
  bulletHits(b, target) {
    if (!b.active || b.hits.has(target)) return;
    b.hits.add(target);
    if (!b.pierce) killBullet(b);
    target.hit(b.damage);
  }
```

- [ ] **Step 4: Run the tests and the build**

Run: `npm test && npm run build`
Expected: PASS; the build succeeds.

- [ ] **Step 5: Verify shooting and pickups in the browser**

Start the dev server, open `?debug`, and press Enter. Then:
1. Hold X for 3 s (`page.keyboard.down('KeyX')` … `up`). Take a screenshot while it's held: bullets fly right, are recycled, and the console has no errors.
2. Evaluate: `() => { const L = game.scene.getScene('Level'); L.spawnPickup('spread', L.player.x + 24, L.player.y); }`. Walk right 0.5 s. Evaluate `() => game.scene.getScene('Level').player.weapon`. Expected: `"spread"`. Hold X and take a screenshot: a 3-way fan.
3. Hold Up + X and take a screenshot: shots go straight up.
4. Evaluate: `() => { const L = game.scene.getScene('Level'); L.player.energy = 4; const p = L.spawnPickup('energy', L.player.x, L.player.y); L.collect(p); return [L.player.energy, p.active]; }`. Expected: `[4, true]` (not collected at max).

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/weapons.js src/player.js src/scenes/Level.js
git commit -m "feat: weapons, shooting (forward/up), weapon and energy pickups

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Enemies, crates, score

**Files:**
- Create: `src/enemies.js`
- Modify: `src/scenes/Level.js`

**Interfaces:**
- Consumes: `ctx` from Level (`{ scene, player, ground, enemyBullets, arena, onKilled }`); `fireBullet` (`weapons.js`); `ENTITIES` (`assets.js`); `placeOnGround`, `bulletHits` (Level).
- Produces (`src/enemies.js`):
  - `export class Enemy extends Phaser.Physics.Arcade.Sprite`: `constructor(ctx, x, y, kind, { hp, score })`; fields `ctx, kind, hp, score, drop, dead, awake, usesGround`; `setupBody()` (call **after** adding to a physics group, because group defaults overwrite body settings); `hit(n)`; `die()`; `isAwake()`; `restoreTint()`.
  - `export class Soldier`, `Drone`, `Turret` (`constructor(ctx, x, y, facing)`), `Crate`, each extending `Enemy`.
  - `Level`: `enemies` and `crates` groups; `addEnemy(group, entity, groundY|null, props)`; `onKilled(e)` adds `e.score`, explodes, and spawns `e.drop`.

- [ ] **Step 1: Write `src/enemies.js`**

```js
import Phaser from 'phaser';
import { ENTITIES } from './assets.js';
import { fireBullet } from './weapons.js';

const WAKE_MARGIN = 32; // enemies start acting once this close to the right edge of the camera

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(ctx, x, y, kind, { hp, score }) {
    super(ctx.scene, x, y, kind);
    ctx.scene.add.existing(this);
    this.ctx = ctx;
    this.kind = kind;
    this.hp = hp;
    this.score = score;
    this.drop = null;
    this.dead = false;
    this.awake = false;
    this.usesGround = false;
    if (ENTITIES[kind]?.scale) this.setScale(ENTITIES[kind].scale);
    this.restoreTint();
  }

  // Call after group.add(): Arcade groups reset body settings when a child is added.
  setupBody() {
    const b = ENTITIES[this.kind].body;
    this.body.setSize(b.w, b.h).setOffset(b.ox, b.oy);
  }

  isAwake() {
    if (!this.awake) this.awake = this.x < this.scene.cameras.main.worldView.right + WAKE_MARGIN;
    return this.awake;
  }

  restoreTint() {
    const t = ENTITIES[this.kind]?.tint;
    if (t) this.setTint(t); else this.clearTint();
  }

  hit(n) {
    if (this.dead) return;
    this.hp -= n;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => { if (this.active) this.restoreTint(); });
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.ctx.onKilled(this);
    this.destroy();
  }

  facePlayer() {
    this.facing = this.ctx.player.x < this.x ? -1 : 1;
    this.setFlipX(this.facing < 0);
  }
}

export class Soldier extends Enemy {
  constructor(ctx, x, y) {
    super(ctx, x, y, 'soldier', { hp: 2, score: 100 });
    this.facing = -1;
    this.nextShotAt = 0;
    this.usesGround = true;
  }

  update(time) {
    if (this.dead || !this.isAwake()) return;
    const p = this.ctx.player;
    if (Math.abs(p.x - this.x) < 200 && Math.abs(p.y - this.y) < 40) {
      this.body.setVelocityX(0);
      this.facePlayer();
      this.play('soldier-idle', true);
      if (time >= this.nextShotAt) {
        this.nextShotAt = time + 1200;
        fireBullet(this.ctx.enemyBullets, 'enemy-bullet', this.x + this.facing * 10, this.y - 2, this.facing > 0 ? 0 : Math.PI, 180);
      }
      return;
    }
    // Patrol: turn at walls and ledges.
    const ahead = this.ctx.ground.getTileAtWorldXY(this.x + this.facing * 10, this.body.bottom + 4);
    if (this.body.blocked.left) this.facing = 1;
    else if (this.body.blocked.right) this.facing = -1;
    else if (this.body.blocked.down && !ahead?.collides) this.facing *= -1;
    this.body.setVelocityX(this.facing * 40);
    this.setFlipX(this.facing < 0);
    this.play('soldier-walk', true);
  }
}

export class Drone extends Enemy {
  constructor(ctx, x, y) {
    super(ctx, x, y, 'drone', { hp: 1, score: 150 });
    this.baseY = y;
    this.nextShotAt = 0;
    this.play('drone-fly');
  }

  setupBody() {
    super.setupBody();
    this.body.setAllowGravity(false);
  }

  update(time) {
    if (this.dead || !this.isAwake()) return;
    const dx = this.ctx.player.x - this.x;
    this.body.setVelocityX(Math.abs(dx) > 8 ? Math.sign(dx) * 50 : 0);
    this.y = this.baseY + Math.sin(time / 300) * 16;
    this.setFlipX(dx < 0);
    if (Math.abs(dx) < 60 && time >= this.nextShotAt) {
      this.nextShotAt = time + 1400;
      fireBullet(this.ctx.enemyBullets, 'enemy-bullet', this.x, this.y + 8, Math.PI / 2, 150);
    }
  }
}

export class Turret extends Enemy {
  constructor(ctx, x, y, facing = 'left') {
    super(ctx, x, y, 'turret', { hp: 4, score: 200 });
    this.setFlipX(facing === 'left');
    this.nextBurstAt = 0;
    this.play('turret-idle');
  }

  setupBody() {
    super.setupBody();
    this.body.setAllowGravity(false).setImmovable(true);
  }

  update(time) {
    if (this.dead || !this.isAwake() || time < this.nextBurstAt) return;
    const p = this.ctx.player;
    if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) > 260) return;
    this.nextBurstAt = time + 2000;
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        if (!this.active || this.dead) return;
        fireBullet(this.ctx.enemyBullets, 'enemy-bullet', this.x, this.y, Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y), 170);
      });
    }
  }
}

export class Crate extends Enemy {
  constructor(ctx, x, y) {
    super(ctx, x, y, 'crate', { hp: 1, score: 10 });
  }

  setupBody() {
    this.body.setAllowGravity(false).setImmovable(true); // hitbox = texture size
  }

  update() {}
}
```

- [ ] **Step 2: Wire enemies into `src/scenes/Level.js`**

Add the import: `import { Soldier, Drone, Turret, Crate } from '../enemies.js';`

In `create()`, replace `// (Task 7 adds enemy/crate groups here.)` with:
```js
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.crates = this.physics.add.group({ runChildUpdate: true });
```
Replace `// (Tasks 7–8 add colliders/overlaps here.)` with:
```js
    this.physics.add.collider(this.enemies, this.ground, null, e => e.usesGround);
    this.physics.add.collider(this.player, this.crates);
    this.physics.add.overlap(this.playerBullets, this.enemies, (b, e) => this.bulletHits(b, e));
    this.physics.add.overlap(this.playerBullets, this.crates, (b, c) => this.bulletHits(b, c));
    this.physics.add.overlap(this.player, this.enemies, () => this.hurtPlayer());
    // (Task 8 adds boss overlaps in startBoss().)
```
In `spawnObjects()`, replace `// (Task 7 adds enemy and crate cases here.)` with:
```js
        case 'soldier': this.addEnemy(this.enemies, new Soldier(this.ctx, o.x, o.y), o.y, props); break;
        case 'drone': this.addEnemy(this.enemies, new Drone(this.ctx, o.x, mid), null, props); break;
        case 'turret': this.addEnemy(this.enemies, new Turret(this.ctx, o.x, mid, props.facing), null, props); break;
        case 'crate': this.addEnemy(this.crates, new Crate(this.ctx, o.x, o.y), o.y, props); break;
```
Add this method after `spawnObjects()`:
```js
  addEnemy(group, e, groundY, props) {
    group.add(e);
    e.setupBody(); // after add(): group defaults overwrite body settings
    if (props.drop) e.drop = props.drop;
    if (groundY !== null) placeOnGround(e, groundY);
    return e;
  }
```
Replace the body of `onKilled(e)` with:
```js
  onKilled(e) {
    this.score += e.score;
    this.explode(e.x, e.y);
    if (e.drop) this.spawnPickup(e.drop, e.x, e.y - 8);
    // (Task 8 adds boss handling here.)
  }
```

- [ ] **Step 3: Run the tests and the build**

Run: `npm test && npm run build`
Expected: PASS; the build succeeds.

- [ ] **Step 4: Playtest the enemies**

Start the dev server, open `?debug`, and press Enter. Then:
1. Console: there are **no** `Unknown object type` warnings now.
2. Take a screenshot at the start: the crate sits on the ground and the soldier stands on the ground (not floating or sunk; fix `ENTITIES.soldier.body` if so).
3. Walk right while holding X until past the crate. Evaluate `() => game.scene.getScene('Level').player.weapon`. Expected: `"spread"` after you walk over the drop. The score is > 0.
4. Teleport to the drones (`L.player.setPosition(800, 150); L.player.body.reset(800, 150)`). Wait 3 s and take a screenshot: drones hover and drop shots; the HUD energy decreases on hits.
5. Teleport next to the turret (x 1240, y 150), then wait 3 s. The turret fires 3-shot bursts aimed at the player.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/enemies.js src/scenes/Level.js
git commit -m "feat: soldiers, drones, turrets, crates with drops, scoring

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Mech walker boss, arena lock, victory

**Files:**
- Create: `src/boss.js`
- Modify: `src/scenes/Level.js`

**Interfaces:**
- Consumes: `Enemy` (`enemies.js`); `bossPhase`, `nextBossAttack` (`logic.js`); `fireBullet` (`weapons.js`); `ctx.arena` (`Phaser.Geom.Rectangle`); Level's `placeOnGround`, `floorY`, `bulletHits`, `hurtPlayer`, `endRun`, `explode`, `music`.
- Produces: `src/boss.js`, `export default class MechWalker extends Enemy` with `constructor(ctx, x, y)`, `update(time)`, and the fields `hp`, `maxHp`, `dead`, `state`. In `Level`: `startBoss()`, and `onKilled` handles `e === this.boss` → `endRun(true, 1600)`.

- [ ] **Step 1: Write `src/boss.js`**

```js
import { Enemy } from './enemies.js';
import { bossPhase, nextBossAttack } from './logic.js';
import { fireBullet } from './weapons.js';

const MAX_HP = 40;
const INTRO_MS = 1000;
const WALK_MS = 1600;
const WALK_SPEED = 50;
const CHARGE_SPEED = 260;
const TELEGRAPH_MS = 450;
const RECOVER_MS = 700;
const SHOCKWAVE_SPEED = 200;
const MISSILE_VY = -320;
const MISSILE_FLIGHT_S = 0.9; // rough time to land, used to aim the arcs

// States: intro → walk → telegraph-<attack> → stomp | charge | missiles → recover → walk …
export default class MechWalker extends Enemy {
  constructor(ctx, x, y) {
    super(ctx, x, y, 'boss', { hp: MAX_HP, score: 5000 });
    this.maxHp = MAX_HP;
    this.facing = -1;
    this.lastAttack = null;
    this.enter('intro', INTRO_MS);
  }

  setupBody() {
    super.setupBody();
    this.body.setAllowGravity(false).setImmovable(true);
  }

  enter(state, ms) {
    this.state = state;
    this.stateUntil = this.scene.time.now + ms;
    this.body?.setVelocityX(0);
    if (state.startsWith('telegraph')) this.setTint(0xff4040); // flash red before an attack
    else this.restoreTint();
    this.play(state === 'walk' || state === 'charge' ? 'boss-walk' : 'boss-idle', true);
  }

  update(time) {
    if (this.dead) return;
    const a = this.ctx.arena;
    if (this.state === 'charge') {
      this.body.setVelocityX(this.facing * CHARGE_SPEED);
      if ((this.facing < 0 && this.body.left <= a.left + 4) || (this.facing > 0 && this.body.right >= a.right - 4)) this.enter('recover', RECOVER_MS);
      return;
    }
    this.facePlayer();
    if (time < this.stateUntil) {
      if (this.state === 'walk') this.body.setVelocityX(this.facing * WALK_SPEED);
      return;
    }
    switch (this.state) {
      case 'intro':
      case 'recover':
        this.enter('walk', WALK_MS);
        break;
      case 'walk':
        this.lastAttack = nextBossAttack(bossPhase(this.hp, this.maxHp), this.lastAttack, Math.random());
        this.enter('telegraph-' + this.lastAttack, TELEGRAPH_MS);
        break;
      case 'telegraph-stomp':
        this.stomp();
        this.enter('recover', RECOVER_MS);
        break;
      case 'telegraph-charge':
        this.enter('charge', Infinity);
        break;
      case 'telegraph-missiles':
        this.missiles();
        this.enter('recover', RECOVER_MS);
        break;
    }
  }

  // Two ground shockwaves, left and right: jump over them.
  stomp() {
    const y = this.body.bottom - 6;
    for (const angle of [Math.PI, 0]) fireBullet(this.ctx.enemyBullets, 'shockwave', this.x, y, angle, SHOCKWAVE_SPEED, { ignoreGround: true, lifespan: 3000 });
    this.scene.cameras.main.shake(150, 0.01);
    this.scene.sound.play('sfx-explosion', { volume: 0.5 });
  }

  // Phase 2: four arcing missiles, one aimed at the player.
  missiles() {
    const a = this.ctx.arena;
    const x = this.x;
    const y = this.body.top;
    const targets = [this.ctx.player.x, ...Array.from({ length: 3 }, () => a.x + 32 + Math.random() * (a.width - 64))];
    targets.forEach((tx, i) => this.scene.time.delayedCall(i * 120, () => {
      if (!this.active || this.dead) return;
      const vx = (tx - x) / MISSILE_FLIGHT_S;
      fireBullet(this.ctx.enemyBullets, 'missile', x, y, Math.atan2(MISSILE_VY, vx), Math.hypot(vx, MISSILE_VY), { gravity: true, lifespan: 4000 });
    }));
  }

  hit(n) {
    if (this.state !== 'intro') super.hit(n);
  }

  // Level owns the death sequence (explosions, then destroy).
  die() {
    this.dead = true;
    this.body.setVelocity(0);
    this.ctx.onKilled(this);
  }
}
```

- [ ] **Step 2: Wire the boss into `src/scenes/Level.js`**

Add the import: `import MechWalker from '../boss.js';`

In `update()`, replace `// (Task 8 adds the boss trigger/update here.)` with:
```js
    if (this.arena && !this.boss && this.player.x > this.arena.x + 48) this.startBoss();
    this.boss?.update(time);
```
Add this method after `addEnemy()`:
```js
  startBoss() {
    const a = this.arena;
    const mh = this.map.heightInPixels;
    this.physics.world.setBounds(a.x, 0, a.width, mh); // player collides with world bounds: can't leave
    this.cameras.main.setBounds(a.x, 0, a.width, mh);
    this.boss = new MechWalker(this.ctx, a.right - 64, 0);
    this.physics.add.existing(this.boss);
    this.boss.setupBody();
    placeOnGround(this.boss, this.floorY(a.centerX));
    this.physics.add.overlap(this.boss, this.playerBullets, (boss, b) => this.bulletHits(b, boss));
    this.physics.add.overlap(this.player, this.boss, () => { if (!this.boss.dead) this.hurtPlayer(); });
    this.music.stop();
    this.music = this.sound.add('music-boss', { loop: true, volume: 0.4 });
    this.music.play();
  }
```
In `onKilled(e)`, replace `// (Task 8 adds boss handling here.)` with:
```js
    if (e === this.boss) {
      for (let i = 1; i <= 4; i++) this.time.delayedCall(i * 200, () => this.explode(e.x + Phaser.Math.Between(-24, 24), e.y + Phaser.Math.Between(-24, 24)));
      this.time.delayedCall(900, () => e.destroy());
      this.endRun(true, 1600);
    }
```

- [ ] **Step 3: Run the tests and the build**

Run: `npm test && npm run build`
Expected: PASS; the build succeeds.

- [ ] **Step 4: Playtest the boss**

Start the dev server, open `?debug`, and press Enter. Evaluate `() => { const L = game.scene.getScene('Level'); L.player.setPosition(L.arena.x - 40, 150); L.player.body.reset(L.arena.x - 40, 150); }`, then walk right 1 s. Expected:
1. The camera locks to the arena; walking left stops at the arena edge; the boss music plays (`L.sound.getAllPlaying().map(s => s.key)` → `["music-boss"]`).
2. The boss stands on the floor (not floating or sunk) and flashes red before each attack. Over 10 s you see a stomp (two shockwaves along the floor) and a charge. Screenshot during a shockwave.
3. Evaluate `() => { const b = game.scene.getScene('Level').boss; b.hp = 15; }`, then watch 10 s. Arcing missiles appear (phase 2), and the boss HP bar shows about 37%.
4. During a charge, press C (dash) into the boss: the player passes through without losing energy.

- [ ] **Step 5: Verify victory → retry (Review Focus 1)**

Evaluate `() => { const L = game.scene.getScene('Level'); L.boss.hit(999); }`. Wait 2.5 s. Expected: End shows MISSION COMPLETE with score ≥ 5000 and BEST updated. Wait 1 s and press Enter, then evaluate:
`() => { const L = game.scene.getScene('Level'); return { energy: L.player.energy, weapon: L.player.weapon, score: L.score, boss: L.boss, paused: L.physics.world.isPaused, playing: L.sound.getAllPlaying().map(s => s.key) }; }`
Expected: `{ energy: 3, weapon: 'blaster', score: 0, boss: null, paused: false, playing: ['music-level'] }`. Check `browser_console_messages`: no errors.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add src/boss.js src/scenes/Level.js
git commit -m "feat: mech walker boss with arena lock and victory

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## After All Tasks

- Whole-branch review (opus) against the spec and this plan.
- A full manual playthrough by the user (game feel: tune constants at the top of `src/player.js`, `src/boss.js`, and `src/weapons.js`).
- `npm run build` → upload `dist/` as an itch.io HTML game (zip the folder contents).
