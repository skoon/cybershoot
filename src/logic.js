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
