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
