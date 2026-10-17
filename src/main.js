import Phaser from 'phaser';
import { GAME_W, GAME_H } from './logic.js';
import Preload from './scenes/Preload.js';
import Title from './scenes/Title.js';
import Level from './scenes/Level.js';
import End from './scenes/End.js';

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  pixelArt: true,
  backgroundColor: '#05010d',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: { default: 'arcade', arcade: { gravity: { y: 900 }, debug: new URLSearchParams(location.search).has('debug') } },
  input: { gamepad: true },
  scene: [Preload, Title, Level, End],
});
