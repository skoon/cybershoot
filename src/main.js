import Phaser from 'phaser';
import { GAME_W, GAME_H } from './logic.js';

class Hello extends Phaser.Scene {
  create() {
    this.add.text(GAME_W / 2, GAME_H / 2, 'CYBERSHOOT', { fontFamily: 'monospace', fontSize: '24px', color: '#ff2bd6' }).setOrigin(0.5);
  }
}

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,
  backgroundColor: '#05010d',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Hello],
});
