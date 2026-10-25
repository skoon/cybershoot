import Phaser from 'phaser';
import { GAME_W, GAME_H, safeStorage, saveHighScore } from '../logic.js';
import { createInput } from '../input.js';

const FONT = { fontFamily: 'monospace', color: '#c8f7ff' };
const LOCKOUT_MS = 600; // ignore input briefly so mashing jump/start while dying doesn't skip this screen

export default class End extends Phaser.Scene {
  constructor() { super('End'); }

  init(data) {
    this.victory = !!data.victory;
    this.finalScore = data.score ?? 0;
  }

  create() {
    this.sound.removeAll();
    const best = saveHighScore(safeStorage(), this.finalScore);
    const cx = GAME_W / 2;
    this.add.text(cx, 70, this.victory ? 'MISSION COMPLETE' : 'FLATLINED', { ...FONT, fontSize: '28px', color: this.victory ? '#00f0ff' : '#ff2b4e' }).setOrigin(0.5);
    this.add.text(cx, 120, `SCORE ${this.finalScore}`, { ...FONT, fontSize: '14px' }).setOrigin(0.5);
    this.add.text(cx, 140, `BEST ${best}`, { ...FONT, fontSize: '14px' }).setOrigin(0.5);
    if (this.finalScore > 0 && this.finalScore >= best) this.add.text(cx, 160, 'NEW HIGH SCORE', { ...FONT, fontSize: '10px', color: '#ff2bd6' }).setOrigin(0.5);
    this.add.text(cx, GAME_H - 50, 'PRESS ENTER / START TO RETRY', { ...FONT, fontSize: '12px', color: '#00f0ff' }).setOrigin(0.5);
    this.controls = createInput(this);
    this.readyAt = this.game.loop.time + LOCKOUT_MS; // same clock as update(time); scene.time.now is stale in create()
  }

  update(time) {
    const c = this.controls.read(); // read every frame so edge detection stays current during the lockout
    // {} (not no argument): Phaser keeps the previous data when start() gets none, which would resume the last stage.
    if (time >= this.readyAt && c.startPressed) this.scene.start('Level', {});
  }
}
