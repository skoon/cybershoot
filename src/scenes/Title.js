import Phaser from 'phaser';
import { GAME_W, GAME_H, safeStorage, loadHighScore } from '../logic.js';
import { CREDIT_LINE } from '../assets.js';
import { createInput } from '../input.js';

const BLURB = 'NEO-KOWLOON, 2089.\nYou stole the wrong data from the wrong corp.\nNow every drone in the city wants it back.\nReach the extraction point. Don\'t flatline.';
const FONT = { fontFamily: 'monospace', color: '#c8f7ff' };

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.sound.removeAll();
    const cx = GAME_W / 2;
    this.add.image(0, 0, 'bg-far').setOrigin(0).setDisplaySize(GAME_W, GAME_H).setAlpha(0.6);
    this.add.text(cx, 44, 'CYBERSHOOT', { ...FONT, fontSize: '32px', color: '#ff2bd6', stroke: '#00f0ff', strokeThickness: 2 }).setOrigin(0.5);
    this.add.text(cx, 112, BLURB, { ...FONT, fontSize: '10px', align: 'center', lineSpacing: 4 }).setOrigin(0.5);
    const prompt = this.add.text(cx, 178, 'PRESS ENTER / START', { ...FONT, fontSize: '12px', color: '#00f0ff' }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
    this.add.text(cx, 204, 'Z jump   X shoot   C dash   hold UP aim up   M mute', { ...FONT, fontSize: '8px' }).setOrigin(0.5);
    this.add.text(cx, 222, `BEST ${loadHighScore(safeStorage())}`, { ...FONT, fontSize: '10px' }).setOrigin(0.5);
    this.add.text(cx, GAME_H - 4, CREDIT_LINE, { ...FONT, fontSize: '7px', color: '#7a8a99', align: 'center', wordWrap: { width: GAME_W - 16 } }).setOrigin(0.5, 1);
    this.controls = createInput(this);
  }

  update() {
    if (this.controls.read().startPressed) this.scene.start('Level');
  }
}
