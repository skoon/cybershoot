import Phaser from 'phaser';
import { GAME_W, GAME_H, MAX_ENERGY } from '../logic.js';
import { TILESET, MAP, BACKGROUNDS } from '../assets.js';
import { createInput } from '../input.js';
import Player from '../player.js';
import { createBulletGroup } from '../weapons.js';

const HUD_FONT = { fontFamily: 'monospace', fontSize: '10px', color: '#c8f7ff' };

// Move a physics sprite so the bottom of its hitbox sits at bottomY.
// Uses sourceHeight (unscaled) so it is correct before Arcade rescales the body.
export function placeOnGround(s, bottomY) {
  s.y = bottomY - s.scaleY * (s.body.offset.y - s.displayOriginY + s.body.sourceHeight);
  s.body.reset(s.x, s.y);
}

export default class Level extends Phaser.Scene {
  constructor() { super('Level'); }

  create() {
    this.sound.removeAll();
    this.physics.resume(); // in case a previous run ended with physics paused
    this.ended = false;
    this.score = 0;
    this.arena = null;
    this.boss = null;
    this.controls = createInput(this);

    this.map = this.make.tilemap({ key: MAP.key });
    this.parallax = BACKGROUNDS.map(({ key, scrollFactor }) => {
      const bg = this.add.tileSprite(0, 0, GAME_W, GAME_H, key).setOrigin(0).setScrollFactor(0);
      bg.setTileScale(GAME_H / this.textures.get(key).getSourceImage().height);
      return { bg, scrollFactor };
    });
    const tileset = this.map.addTilesetImage(TILESET.name, TILESET.key);
    this.ground = this.map.createLayer('ground', tileset);
    this.ground.setCollisionByProperty({ collides: true });

    const { widthInPixels: mw, heightInPixels: mh } = this.map;
    this.physics.world.setBounds(0, 0, mw, mh);
    this.physics.world.setBoundsCollision(true, true, true, false); // open bottom: pits kill
    this.cameras.main.setBounds(0, 0, mw, mh);

    this.playerBullets = createBulletGroup(this, 40);
    this.enemyBullets = createBulletGroup(this, 60);
    // (Task 7 adds enemy/crate groups here; Task 6 adds pickups.)

    this.spawnObjects();
    this.physics.add.collider(this.player, this.ground);
    // (Tasks 6–8 add colliders/overlaps here.)

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.createHud();
    this.music = this.sound.add('music-level', { loop: true, volume: 0.4 });
    this.music.play();
  }

  spawnObjects() {
    const objects = this.map.getObjectLayer('objects')?.objects ?? [];
    const typeOf = o => o.type || o.class; // Tiled 1.9 saved "class"
    const start = objects.find(o => typeOf(o) === 'player_start');
    if (!start) throw new Error('level1.json has no player_start object');
    this.player = new Player(this, start.x, start.y, this.playerBullets);
    placeOnGround(this.player, start.y);
    this.ctx = { scene: this, player: this.player, ground: this.ground, enemyBullets: this.enemyBullets, arena: null, onKilled: e => this.onKilled(e) };

    for (const o of objects) {
      const type = typeOf(o);
      const props = Object.fromEntries((o.properties ?? []).map(p => [p.name, p.value]));
      const mid = o.y - TILESET.tileWidth / 2; // generator puts points at a cell's bottom-centre
      switch (type) {
        case 'player_start': break;
        case 'boss_arena': this.arena = this.ctx.arena = new Phaser.Geom.Rectangle(o.x, o.y, o.width, o.height); break;
        // (Tasks 6–7 add cases here.)
        default: console.warn(`Unknown object type "${type}" at ${o.x},${o.y}; skipped`);
      }
    }
  }

  createHud() {
    this.hudEnergy = Array.from({ length: MAX_ENERGY }, (_, i) => this.add.image(8 + i * 12, 8, 'hud-energy').setOrigin(0).setScrollFactor(0).setDepth(100));
    this.hudText = this.add.text(GAME_W - 8, 6, '', HUD_FONT).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.bossBar = this.add.graphics().setScrollFactor(0).setDepth(100);
  }

  updateHud() {
    this.hudEnergy.forEach((img, i) => img.setAlpha(i < this.player.energy ? 1 : 0.2));
    this.hudText.setText(`${this.player.weapon.toUpperCase()}  ${String(this.score).padStart(6, '0')}`);
    this.bossBar.clear();
    if (this.boss && !this.boss.dead) {
      this.bossBar.fillStyle(0x330011).fillRect(140, GAME_H - 14, 200, 6);
      this.bossBar.fillStyle(0xff2b4e).fillRect(140, GAME_H - 14, 200 * Math.max(0, this.boss.hp) / this.boss.maxHp, 6);
    }
  }

  update(time) {
    if (this.ended) return;
    const c = this.controls.read();
    if (c.mutePressed) this.sound.mute = !this.sound.mute;
    this.player.update(c);
    // (Task 6 adds bullet expiry; Task 8 adds the boss trigger/update here.)
    for (const { bg, scrollFactor } of this.parallax) bg.tilePositionX = this.cameras.main.scrollX * scrollFactor;
    if (this.player.y > this.map.heightInPixels + 32) this.endRun(false, 300);
    this.updateHud();
  }

  hurtPlayer() {
    if (this.ended || !this.player.hit()) return false;
    this.sound.play('sfx-hit');
    this.cameras.main.shake(100, 0.006);
    if (this.player.energy <= 0) this.endRun(false, 900);
    return true;
  }

  onKilled(e) {
    // Filled in by Task 7 (score, explosion, drops) and Task 8 (boss).
  }

  explode(x, y) {
    const fx = this.add.sprite(x, y, 'explosion').setDepth(20);
    fx.play('explosion');
    fx.once('animationcomplete', () => fx.destroy());
    this.sound.play('sfx-explosion', { volume: 0.5 });
  }

  // First collidable tile's top edge in column x (used for the boss floor).
  floorY(x) {
    for (let y = 0; y < this.map.heightInPixels; y += TILESET.tileWidth) {
      const t = this.ground.getTileAtWorldXY(x, y);
      if (t?.collides) return t.pixelY;
    }
    return this.map.heightInPixels;
  }

  endRun(victory, delayMs = 0) {
    if (this.ended) return;
    this.ended = true;
    if (victory) {
      this.player.invulnUntil = Infinity;
      this.player.body.setVelocityX(0);
    } else {
      this.physics.pause();
      this.player.setVisible(false);
      this.explode(this.player.x, this.player.y);
    }
    this.time.delayedCall(delayMs, () => this.scene.start('End', { victory, score: this.score }));
  }
}
