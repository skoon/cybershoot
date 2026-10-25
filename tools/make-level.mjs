// Generates a Tiled JSON map from an ASCII level file.
// usage: npm run level -- tools/levels/<key>.mjs   (the key must be in LEVELS in src/assets.js)
// Re-running OVERWRITES the map, including any Tiled edits.
//
// Legend: '.' empty  '#' ground  P player_start  S soldier  Q soldier (drops energy)
//         D drone  T turret (facing left)  E energy pickup
//         C crate→spread  L crate→laser  c crate→energy
// Rows are bottom-aligned (last row = map bottom); short rows are padded with '.'.
// The LAST segment must be the ending: `arena: true` (exactly GAME_W wide) or `exit: true`.
import { writeFileSync, mkdirSync } from 'node:fs';
import { relative, dirname, basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TILESET, LEVELS } from '../src/assets.js';
import { GAME_W } from '../src/logic.js';

const file = process.argv[2];
if (!file) throw new Error('usage: npm run level -- tools/levels/<key>.mjs');
const key = basename(file, '.mjs');
const level = LEVELS.find(l => l.key === key);
if (!level) throw new Error(`"${key}" is not in LEVELS (src/assets.js); add it there first`);
const { SEGMENTS } = await import(pathToFileURL(resolve(file)).href);

const H = 17;
const T = TILESET.tileWidth;
const KINDS = {
  P: ['player_start'], S: ['soldier'], Q: ['soldier', { drop: 'energy' }], D: ['drone'],
  T: ['turret', { facing: 'left' }], E: ['energy'],
  C: ['crate', { drop: 'spread' }], L: ['crate', { drop: 'laser' }], c: ['crate', { drop: 'energy' }],
};

const last = SEGMENTS.at(-1);
if (!last.arena && !last.exit) throw new Error('the last segment must have arena: true or exit: true');
if (last.arena && last.exit) throw new Error('the last segment cannot be both arena and exit');
if (SEGMENTS.slice(0, -1).some(s => s.arena || s.exit)) throw new Error('only the last segment may be an arena or exit');

const grid = Array.from({ length: H }, () => []);
let ending = null;
for (const seg of SEGMENTS) {
  const x0 = grid[0].length;
  const top = H - seg.rows.length;
  if (top < 0) throw new Error(`segment at column ${x0} has more than ${H} rows`);
  for (let r = 0; r < H; r++) {
    const line = r < top ? '' : seg.rows[r - top];
    if (line.length > seg.w) throw new Error(`row ${r} of segment at column ${x0} is longer than ${seg.w}`);
    grid[r].push(...line.padEnd(seg.w, '.'));
  }
  if (seg === last) ending = { type: seg.arena ? 'boss_arena' : 'exit', x: x0 * T, width: seg.w * T };
}
if (ending.type === 'boss_arena' && ending.width !== GAME_W) throw new Error(`boss arena must be exactly ${GAME_W}px wide`);

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
objects.push({ id: nextId++, name: '', type: ending.type, x: ending.x, y: 0, width: ending.width, height: H * T, rotation: 0, visible: true, properties: [] });

const out = 'public/' + level.path;
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
