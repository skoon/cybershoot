import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../logic.js';
import { createInput } from '../input.js';

// Temporary stub to exercise Title → Level → End flow. Replaced in Task 5.
export default class Level extends Phaser.Scene {
  constructor() { super('Level'); }
  create() {
    this.add.text(GAME_W / 2, GAME_H / 2, 'LEVEL STUB — ENTER to win', { fontFamily: 'monospace', fontSize: '12px', color: '#fff' }).setOrigin(0.5);
    this.controls = createInput(this);
  }
  update() {
    if (this.controls.read().startPressed) this.scene.start('End', { victory: true, score: 1234 });
  }
}
