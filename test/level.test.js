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
