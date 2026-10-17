# Cybershoot — Design

## Intent

A browser-playable cyberpunk run-and-gun platformer (Contra / Metal Slug feel), built as a fun hobby project. Shared as a link or itch.io HTML upload.

**Done for v1** = one complete loop: title → one stage (~2–4 min) → mech boss → End screen (victory or game over) with score and high score.

## Gameplay

### Setting
Title card with a short intro blurb (e.g. *"Neo-Kowloon, 2089. You stole the wrong data from the wrong corp."*). One left-to-right stage through rooftops and alleys, ending in a boss arena.

### Player
- Run; jump with variable height (releasing jump early cuts upward velocity).
- **Dash/slide**: ~0.2 s burst with i-frames, ~0.6 s cooldown. On the ground it is a slide (lowered hitbox, ducks under shots); in the air it is a horizontal dash.
- **Aim**: forward by default; while Up is held, fire straight up. No other directions.
- **Energy packs** (health): start with 3, max 4. Each hit removes 1 pack, followed by ~1 s i-frames with flicker. Play continues from where you are.
- **Energy pack pickups** restore 1 pack. They are placed in the level and can drop from crates. If you're already at 4, the pickup is not collected and stays where it is.
- **Game over**: at 0 packs, go to the End screen (game over). There are no checkpoints. Retry restarts the level from the beginning with 3 packs, the blaster, and score 0.
- Falling into a pit is game over immediately.
- All tuning values (run speed, jump velocity, gravity, dash duration/cooldown, starting/max energy, i-frame time) are named constants at the top of `player.js`.

### Weapons
| Weapon | Behavior | Source |
|---|---|---|
| Blaster | Single straight shot, infinite | Default |
| Spread | 3-way fan | Pickup |
| Laser | Fast, pierces enemies | Pickup |

Pickups drop from crates and some enemies. A weapon pickup is held **until game over or until another weapon pickup is grabbed**. No ammo counter.

### Enemies
| Enemy | Behavior | HP |
|---|---|---|
| Corp soldier | Patrols; stops in range and fires straight shots | 2 |
| Drone | Sine-wave flight, drops shots downward | 1 |
| Turret | Wall/ceiling mounted, aims at player, burst fire | 4 |

### Boss — Mech walker
Single-screen arena with camera bounds locked.
- **Phase 1**: walks/stomps toward the player; ground shockwave (jump over it); charge (dash through it).
- **Phase 2** (HP < 50%): adds an arcing missile barrage from above, so the player needs both aim-up and dash.
- Death → victory screen.

### Score
Points per kill by enemy type, large bonus for the boss. High score is persisted in localStorage and updated on both victory and game over. The End screen shows score and best.

### Audio
CC0 SFX: shot, hit, explosion, pickup, dash. One looping synthwave track, plus a boss track if a suitable one is available, otherwise the same track. **M** toggles mute.

### Controls
| Action | Keyboard | Gamepad |
|---|---|---|
| Move | Arrows / WASD | Left stick / d-pad |
| Jump | Z / Space | A |
| Shoot | X / J | X |
| Dash | C / K | B / RB |
| Aim up | Hold Up / W | Hold Up |
| Mute | M | — |
| Start / confirm | Enter / Space | Start / A |

## Architecture

**Stack:** Phaser 3 and Vite, plain JavaScript. These two are the only runtime/dev dependencies. `npm run dev` runs the dev server; `npm run build` produces a static `dist/`.

```
index.html
src/
  main.js        Phaser config (arcade physics), scene list
  input.js       keyboard + gamepad → one action state {left,right,up,jump,shoot,dash}
  player.js      movement, dash/slide, i-frames, aiming, current weapon
  weapons.js     weapon defs as data; pooled bullet groups (Phaser group maxSize)
  enemies.js     Soldier, Drone, Turret
  boss.js        MechWalker, 2-phase state machine
  logic.js       pure functions: spread angles, boss phase selection, high-score load/save
  scenes/
    Preload.js   load all assets, progress bar
    Title.js     intro blurb, press start
    Level.js     tilemap, spawns, camera, colliders, pickups, HUD, score, music
    End.js       victory or game over, score/high score, retry
public/assets/   sprites, tiles, backgrounds, sfx, music, maps/level1.json
CREDITS.md       every asset with its source URL and license
test/logic.test.js
```

### Level data (Tiled)
The level is authored in the Tiled editor and exported as JSON to `public/assets/maps/level1.json`.
- Tile layer `ground`: collision; tiles carry the property `collides: true`.
- Object layer `objects`, using the object `type` to name the entity: `player_start`, `soldier`, `drone`, `turret` (property `facing`), `energy`, `crate` (property `drop`: `spread`|`laser`|`energy`), and `boss_arena` (a rectangle zone).
- Parallax background layers are image layers, or are added in code with scroll factors.

The first map is built by me as a working starting point; the user can then edit it in Tiled.

### Runtime flow
1. `Preload` loads assets, then goes to `Title`, which goes to `Level`.
2. `Level` builds the tilemap, then iterates the `objects` layer to spawn entities.
3. Each frame: `input.js` produces the action state, and the player, enemies, and boss update from it.
4. Arcade colliders: bodies vs `ground`; player bullets vs enemies/boss; enemy bullets/contact vs player. Damage goes through `hit(n)` on each entity.
5. Overlapping a pickup applies it: a weapon replaces the current one; energy adds +1 if below max. Reaching 0 energy, or falling below the map, goes to `End` (game over).
6. Entering `boss_arena` locks the camera bounds to the zone, switches music, and spawns the boss.
7. Boss death → `End` (victory). `End` saves the high score in both cases, and Retry restarts `Level` from scratch.

### HUD
In `Level` using `setScrollFactor(0)`: energy-pack pips (4 slots, filled = remaining), current weapon, score, boss HP bar while the boss fight is active.

### Error handling
- localStorage access is wrapped in try/catch; on failure the high score is held in memory only.
- Asset load errors are logged in `Preload` (`loaderror`).
- Gamepad disconnect: input falls back to keyboard (Phaser handles pad presence).

### Deliberately excluded (YAGNI)
- A separate HUD scene, an ECS/component framework, an audio manager wrapper, a save system beyond the high score.
- 8-way aiming, wall-jump/double jump, touch controls, multiple levels.

## Art sourcing
Free CC0 (or equally permissive) pixel-art packs, e.g. Ansimuz's *Warped City*. The first implementation step is selecting packs and verifying each license; every asset gets an entry in `CREDITS.md`.

**Known risk:** a mech boss sprite may not exist in the main pack. The fallbacks, in order: a different CC0 pack for the boss; a scaled and tinted existing enemy; a boss assembled from multiple sprites.

## Testing
- `node --test test/logic.test.js` for the pure functions in `logic.js`: spread angles, boss phase threshold, energy pickup (+1, capped at 4, not collected at max), high-score load/save with a stubbed storage that throws.
- Smoke check via Playwright: page loads, canvas renders, no console errors, screenshot of Title and Level.
- Game feel is verified by playtesting, not by unit tests.
