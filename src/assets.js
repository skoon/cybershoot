// Asset manifest: the only file that knows paths, frame sizes and hitboxes.
// Pure data (no imports) so node tests can check it.
// All sheets face right (code uses flipX for left). Frame sizes/hitboxes were measured from the PNGs.
export const SHEETS = {
  player:    { path: 'assets/sprites/player.png',    frameWidth: 71, frameHeight: 67 },
  soldier:   { path: 'assets/sprites/player.png',    frameWidth: 71, frameHeight: 67 }, // stand-in: tinted player
  drone:     { path: 'assets/sprites/drone.png',     frameWidth: 55, frameHeight: 52 },
  turret:    { path: 'assets/sprites/turret.png',    frameWidth: 25, frameHeight: 23 },
  boss:      { path: 'assets/sprites/boss.png',      frameWidth: 34, frameHeight: 35 },
  explosion: { path: 'assets/sprites/explosion.png', frameWidth: 55, frameHeight: 52 },
};

export const IMAGES = {
  'bg-far': 'assets/bg/far.png',
  'bg-mid': 'assets/bg/mid.png',
  'bg-near': 'assets/bg/near.png',
  crate: { w: 20, h: 40, color: 0x6b4f2a }, // tall enough that muzzle-height shots (y-2 from sprite centre) hit it
  'pickup-spread': { w: 10, h: 10, color: 0x00ff9c },
  'pickup-laser': { w: 10, h: 10, color: 0xff2bd6 },
  'pickup-energy':  'assets/sprites/energypack.png',
  'hud-energy': 'assets/sprites/energypack.png',
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
  'music-level': 'assets/music/level.ogg',
  'music-boss': 'assets/music/level.ogg', // stand-in: the pack ships one track
};

// boss.png frames: 0-3 idle, 4-7 walk (Mechameleon, flipped idle row to face right)
// player.png frames: 0-3 idle, 4-11 run, 12-15 jump (somersault), 16 crouch (used for dash)
export const ANIMS = [
  { key: 'player-idle', sheet: 'player', frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
  { key: 'player-run', sheet: 'player', frames: [4, 5, 6, 7, 8, 9, 10, 11], frameRate: 12, repeat: -1 },
  { key: 'player-jump', sheet: 'player', frames: [12, 13, 14, 15], frameRate: 10, repeat: -1 },
  { key: 'player-dash', sheet: 'player', frames: [16], frameRate: 8, repeat: -1 },
  { key: 'soldier-idle', sheet: 'soldier', frames: [0, 1, 2, 3], frameRate: 6, repeat: -1 },
  { key: 'soldier-walk', sheet: 'soldier', frames: [4, 5, 6, 7, 8, 9, 10, 11], frameRate: 10, repeat: -1 },
  { key: 'drone-fly', sheet: 'drone', frames: [0, 1], frameRate: 6, repeat: -1 }, // drone.png frames 2-3 turn away from the right-facing pose
  { key: 'turret-idle', sheet: 'turret', frames: [0, 1, 2, 3, 4, 5], frameRate: 6, repeat: -1 },
  { key: 'boss-idle', sheet: 'boss', frames: [0, 1, 2, 3], frameRate: 4, repeat: -1 },
  { key: 'boss-walk', sheet: 'boss', frames: [4, 5, 6, 7], frameRate: 8, repeat: -1 },
  { key: 'explosion', sheet: 'explosion', frames: [0, 1, 2, 3, 4, 5], frameRate: 16, repeat: 0 },
];

// body = hitbox in unscaled frame pixels; ox/oy from the frame's top-left.
export const ENTITIES = {
  player: { body: { w: 16, h: 46, ox: 30, oy: 21 } },
  soldier: { body: { w: 16, h: 46, ox: 30, oy: 21 }, tint: 0xff5a7a },
  drone: { body: { w: 24, h: 28, ox: 14, oy: 14 } },
  turret: { body: { w: 21, h: 19, ox: 2, oy: 4 } },
  boss: { body: { w: 16, h: 28, ox: 9, oy: 7 }, scale: 3 },
};

export const TILESET = {
  name: 'cyber', key: 'tiles', path: 'assets/tiles/tileset.png', tileWidth: 16,
  columns: 24, tilecount: 384, imagewidth: 384, imageheight: 256,
  solidTop: 271, solidFill: 28,
};

// Stage order. Generate a map with `npm run level -- tools/levels/<key>.mjs`, or edit it in Tiled.
export const LEVELS = [
  { key: 'level1', path: 'assets/maps/level1.json', name: 'ROOFTOPS' },
  { key: 'level2', path: 'assets/maps/level2.json', name: 'EXTRACTION' },
];

export const BACKGROUNDS = [
  { key: 'bg-far', scrollFactor: 0.05 },
  { key: 'bg-mid', scrollFactor: 0.2 },
  { key: 'bg-near', scrollFactor: 0.5 },
];

export const CREDIT_LINE = 'Art: Ansimuz (CC0)  ·  Boss: Spring Spring (CC0)  ·  Music: Pascal Belisle (credit required)  ·  SFX: Juhani Junkala (CC0)';
