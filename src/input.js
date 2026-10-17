import { withEdges } from './logic.js';

export const KEY_NAMES = 'LEFT,RIGHT,UP,W,A,D,Z,SPACE,X,J,C,K,M,ENTER';
const PAD = { A: 0, B: 1, X: 2, RB: 5, START: 9, UP: 12, LEFT: 14, RIGHT: 15 }; // standard mapping
const DEADZONE = 0.4;

// Keyboard + optional gamepad → one held-state object. Safe with pad null/undefined
// or non-standard pads (missing sticks, fewer buttons).
export function readRaw(k, pad) {
  const btn = i => !!pad?.buttons?.[i]?.pressed;
  const sx = pad?.leftStick?.x ?? 0;
  const sy = pad?.leftStick?.y ?? 0;
  return {
    left: k.LEFT.isDown || k.A.isDown || btn(PAD.LEFT) || sx < -DEADZONE,
    right: k.RIGHT.isDown || k.D.isDown || btn(PAD.RIGHT) || sx > DEADZONE,
    up: k.UP.isDown || k.W.isDown || btn(PAD.UP) || sy < -DEADZONE,
    jump: k.Z.isDown || k.SPACE.isDown || btn(PAD.A),
    shoot: k.X.isDown || k.J.isDown || btn(PAD.X),
    dash: k.C.isDown || k.K.isDown || btn(PAD.B) || btn(PAD.RB),
    start: k.ENTER.isDown || k.SPACE.isDown || btn(PAD.START) || btn(PAD.A),
    mute: k.M.isDown,
  };
}

export function createInput(scene) {
  const keys = scene.input.keyboard.addKeys(KEY_NAMES);
  let prev = null;
  return {
    read() {
      // Phaser keeps a disconnected pad's last state (and connected=true); trust the browser's list instead.
      const p = scene.input.gamepad?.pad1;
      const pad = p && globalThis.navigator?.getGamepads?.()[p.index] ? p : null;
      const raw = readRaw(keys, pad);
      const out = withEdges(raw, prev);
      prev = raw;
      return out;
    },
  };
}
