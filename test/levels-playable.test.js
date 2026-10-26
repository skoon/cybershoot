import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { LEVELS } from '../src/assets.js';
import { checkLevel } from '../tools/check-level.mjs';

const G = n => '#'.repeat(n);
const level = (...middle) => [{ w: 10, rows: ['..P', G(10), G(10), G(10)] }, ...middle, { w: 12, exit: true, rows: ['', G(12), G(12), G(12)] }];
const issues = segs => checkLevel(segs).join('\n');

test('checker: flat level and a 4-wide gap are playable', () => {
  assert.deepEqual(checkLevel(level()), []);
  assert.deepEqual(checkLevel(level({ w: 10, rows: ['', '....######', '....######', '....######'] })), []);
});

test('checker: an 8-wide gap blocks the ending', () => {
  assert.match(issues(level({ w: 10, rows: ['', '........##', '........##', '........##'] })), /unreachable/);
});

test('checker: a 4-tile wall blocks, a 3-tile step does not', () => {
  assert.match(issues(level({ w: 10, rows: ['.....#####', '.....#####', '.....#####', '.....#####', G(10), G(10), G(10)] })), /unreachable/);
  assert.deepEqual(checkLevel(level({ w: 10, rows: ['.....#####', '.....#####', '.....#####', G(10), G(10), G(10)] })), []);
});

test('checker: misplaced objects are reported', () => {
  const p = issues(level({ w: 10, rows: ['....E', '', '', '', '', '...C.T....', '', G(10), G(10), G(10)] }));
  assert.match(p, /energy E .* out of reach/);
  assert.match(p, /crate C .* not standing/);
  assert.match(p, /turret T .* wall/);
});

for (const { key } of LEVELS) {
  const url = new URL(`../tools/levels/${key}.mjs`, import.meta.url);
  if (!existsSync(url)) continue; // map made only in Tiled
  test(`${key}: playable under the movement budget`, async () => {
    const { SEGMENTS } = await import(url.href);
    assert.deepEqual(checkLevel(SEGMENTS), []);
  });
}
