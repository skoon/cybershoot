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
