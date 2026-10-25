# Cybershoot Level Creation Guide

> **Status:** this guide describes multi-stage levels, which require the level-progression plan in
> `docs/superpowers/plans/2026-10-24-level-progression.md`. Until that plan is implemented, the game
> has only `level1`: it loads one map, and beating the boss ends the run. Sections marked
> **(needs progression)** describe features that don't exist before that plan is done.

## 1. How a level is made

A level is a Tiled JSON map in `public/assets/maps/<key>.json`. You can make one in either of two ways:

| Way | When to use | How |
|---|---|---|
| **ASCII segments** (recommended) | Blocking out layout, enemies, pacing | Write `tools/levels/<key>.mjs`, then run `npm run level -- tools/levels/<key>.mjs` **(needs progression)** |
| **Tiled editor** | Decoration, extra tile art, small fixes | Open the JSON in Tiled, edit, and save as JSON |

The generator **overwrites** the JSON. Once you decorate a map in Tiled, stop regenerating it, or keep
your Tiled edits somewhere safe first.

Stage order and names live in `LEVELS` in `src/assets.js` **(needs progression)**:

```js
export const LEVELS = [
  { key: 'level1', path: 'assets/maps/level1.json', name: 'ROOFTOPS' },
  { key: 'level2', path: 'assets/maps/level2.json', name: 'EXTRACTION' },
];
```

The player carries score, energy and weapon from one stage to the next. A game over sends the player
back to stage 1 with a score of 0.

## 2. Hard rules (the tests and the generator enforce these)

- **Height:** 17 rows (272 px). Tiles are 16×16.
- **Exactly one `player_start`**, left of the stage's ending.
- **Exactly one ending, in the last segment:** either
  - `boss_arena`: a segment marked `arena: true`, exactly **30 columns** (480 px, one screen) wide. The mech boss spawns there and the camera locks; or
  - `exit`: a segment marked `exit: true`. Walking into it clears the stage **(needs progression)**.
- **Only known object types:** `player_start`, `soldier`, `drone`, `turret`, `crate`, `energy`,
  `boss_arena`, and `exit` **(needs progression)**.
- **Only known drop values:** `spread`, `laser`, `energy`.
- **Tiled:** embed the tileset (it must not be an external `.tsx`) and keep it named `cyber`. Keep the
  layers named `ground` (tiles) and `objects` (objects).
- **The map's bottom edge is open.** Any column with no ground in rows 14–16 is a pit, and falling in
  means game over.

## 3. ASCII segment format

A level file exports `SEGMENTS`, a left-to-right list of chunks:

```js
// tools/levels/level3.mjs
const G = n => '#'.repeat(n);
export const SEGMENTS = [
  { w: 30, rows: ['...P.......C.........S........', G(30), G(30), G(30)] },
  // ...
  { w: 30, arena: true, rows: ['......###............###......', '', '', G(30), G(30), G(30)] },
];
```

- `w`: the segment's width in columns.
- `rows`: these are **bottom-aligned**. The last string is row 16 (the map bottom). Rows you leave out
  above are empty. Short strings are padded with `.` on the right, and `''` is an empty row.
- Standard floor: the bottom 3 rows (rows 14–16) are `#`. Objects that stand on that floor go in row 13.

### Legend

| Char | Becomes | Notes |
|---|---|---|
| `.` | empty | |
| `#` | ground tile | The tile type (surface or fill) is chosen automatically |
| `P` | `player_start` | One per level |
| `S` | soldier | |
| `Q` | soldier that drops an energy pack | |
| `D` | drone | Put it in the air |
| `T` | turret (facing left) | Mount it on the left face of a wall, or on top of a pillar |
| `E` | energy pickup | Floats in place; put it above a floor or platform |
| `C` / `L` / `c` | crate that drops spread / laser / energy | Must stand on the floor |

**Where objects sit:** each object is a point at the **bottom-centre of its cell**. Ground units (P, S,
Q, crates) stand with their feet on the tile below that cell. Floating units (D, T, E) are centred in
their cell.

## 4. Movement budget (design to these numbers)

These values come from the constants in `src/player.js`: run speed 140, jump velocity −330, gravity 900,
dash 320 for 200 ms.

| Move | Limit | In tiles | Safe design value |
|---|---|---|---|
| Jump height | ~60 px | 3.75 | **Step up at most 3 tiles** (2 is comfortable) |
| Running-jump distance on the flat | ~103 px | 6.4 | **Gaps of at most 4 tiles** (3 is comfortable) |
| Jump up 3 tiles and across | ~45 px across | ~3 | Jump-up gaps of at most 2 tiles |
| Air dash | +64 px | +4 | Use it for optional shortcuts only, never on the required path |
| Falling | unlimited | — | Drops are always safe unless they land in a pit |

- A platform floating 4 or more tiles above the floor is **unreachable** from the floor.
- A crate is 20×40 px (2.5 tiles tall), so the player has to jump over it or shoot it. Never put one under
  a ceiling lower than 4 tiles, or in a 1-tile corridor.
- The player is about 46 px (3 tiles) tall, so keep at least 3 empty rows above any floor the player
  has to walk under.

## 5. Enemy reference

| Enemy | HP | Score | Behaviour | Placement tips |
|---|---|---|---|---|
| Soldier | 2 | 100 | Patrols at 40 px/s, turning at walls and ledges. When the player is within 200 px horizontally and 40 px vertically, it stops and fires a straight shot every 1.2 s | On the floor or on wide platforms. Its shots fly at chest height, so the player can slide under them |
| Drone | 1 | 150 | Bobs ±16 px and follows the player's x at 50 px/s. Drops a shot when within 60 px horizontally | Rows 5–8. The player can only hit it with **aim-up**. Two or three drones close together is hard |
| Turret | 4 | 200 | Stationary. Fires a 3-round burst aimed at the player every 2 s, within 260 px | Against the left face of a wall, or on a pillar. Each turret should sit at the end of a "go here" path |
| Crate | 1 | 10 | Blocks the way; drops its `drop` when destroyed | Place it before a section that is easier with that weapon (for example, laser before turrets) |
| Mech boss | 40 | 5000 | Walks, stomps (jump the shockwave), and charges (dash through). Below 50% HP it also fires missiles (shoot them up or dodge) | Only in `boss_arena`. Add 1–2 platforms in the arena as missile cover |

Enemies wake up when they come within 32 px of the right edge of the screen, so nothing happens offscreen.

## 6. Pacing and difficulty

- **Teach, then test.** Introduce each new threat on its own, on flat ground, before you combine it
  with a jump or a pit.
- **Rhythm:** alternate fight → traverse → breather. Each 30-column segment should hold one idea.
- **Energy economy:** the player starts with 3 and can hold at most 4. Give 1 energy pickup every
  ~60 columns, plus one just before an ending.
- **Weapons:** put a spread crate in the first segment of a stage. Put laser before turret- or boss-heavy
  sections.
- **Pits plus enemies is the hardest combination.** Never put a soldier or turret where its shots hit
  the player mid-jump over a pit until the final third of a stage.
- **Stage length:** 180–260 columns (about 2–3 minutes). Stage 1 is 230 columns.
- **Ramp:** each new stage should add about one new combination, not just more enemies.

## 7. Workflow checklist

1. Add the entry to `LEVELS` in `src/assets.js`. Its key must match the file name.
2. Write `tools/levels/<key>.mjs`.
3. Run `npm run level -- tools/levels/<key>.mjs`. It prints the size and object count. Fix anything it
   throws (a row that's too long, an unknown character, a missing or misplaced ending).
4. Run `npm test`. `test/level.test.js` checks every map in `LEVELS`.
5. Playtest with `npm run dev`. Open `http://localhost:5173/?debug` to see hitboxes. To jump straight to
   a stage, open the browser console and run `game.scene.start('Level', { level: 1 })` (stages start at
   index 0).
6. Optionally, decorate the map in Tiled. After that, don't regenerate it.

## 8. Common mistakes

| Symptom | Cause |
|---|---|
| A soldier or crate is floating or buried | It's in the wrong row. Ground units go in the row directly above a `#` |
| A turret falls or fires into a wall | Put it to the left of a wall face or on top of a pillar, and it always faces left |
| A pickup can't be reached | It's 4 or more tiles above any standable surface |
| "Unknown object type" in the console | A typo in the Tiled object `type` (it's case-sensitive) |
| `addTilesetImage` returns null or a cryptic crash | The tileset was renamed or saved as an external `.tsx` |
| The boss arena is wrong or the camera jumps oddly | The arena segment isn't exactly 30 columns |
