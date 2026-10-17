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
