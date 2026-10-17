import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../logic.js';
import { SHEETS, IMAGES, AUDIO, ANIMS, TILESET, MAP } from '../assets.js';

export default class Preload extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    const bar = this.add.rectangle(GAME_W / 2 - 100, GAME_H / 2, 0, 6, 0x00f0ff).setOrigin(0, 0.5);
    this.load.on('progress', p => { bar.width = 200 * p; });
    this.load.on('loaderror', file => console.error(`Failed to load ${file.key} from ${file.src}`));
    for (const [key, s] of Object.entries(SHEETS)) this.load.spritesheet(key, s.path, { frameWidth: s.frameWidth, frameHeight: s.frameHeight });
    for (const [key, v] of Object.entries(IMAGES)) if (typeof v === 'string') this.load.image(key, v);
    for (const [key, path] of Object.entries(AUDIO)) this.load.audio(key, path);
    this.load.image(TILESET.key, TILESET.path);
    this.load.tilemapTiledJSON(MAP.key, MAP.path);
  }

  create() {
    for (const [key, v] of Object.entries(IMAGES)) {
      if (typeof v === 'string') continue;
      this.make.graphics({}, false).fillStyle(v.color).fillRect(0, 0, v.w, v.h).generateTexture(key, v.w, v.h).destroy();
    }
    for (const a of ANIMS) {
      this.anims.create({ key: a.key, frames: this.anims.generateFrameNumbers(a.sheet, { frames: a.frames }), frameRate: a.frameRate, repeat: a.repeat });
    }
    this.scene.start('Title');
  }
}
