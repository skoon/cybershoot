import Phaser from 'phaser';
import { GAME_W, GAME_H, MAX_ENERGY, applyEnergyPickup } from '../logic.js';
import { TILESET, MAP, BACKGROUNDS } from '../assets.js';
import { createInput } from '../input.js';
import Player from '../player.js';
import { Soldier, Drone, Turret, Crate } from '../enemies.js';
import { createBulletGroup, killBullet, expireBullets } from '../weapons.js';

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
    this.pickups = this.physics.add.group({ allowGravity: false, immovable: true });
    this.enemies = this.physics.add.group({ runChildUpdate: true });
    this.crates = this.physics.add.group({ runChildUpdate: true });

    this.spawnObjects();
    this.physics.add.collider(this.player, this.ground);
    this.physics.add.collider(this.playerBullets, this.ground, b => killBullet(b));
    this.physics.add.collider(this.enemyBullets, this.ground, b => killBullet(b), b => !b.ignoreGround);
    this.physics.add.overlap(this.player, this.enemyBullets, (p, b) => { if (b.active && this.hurtPlayer()) killBullet(b); });
    this.physics.add.overlap(this.player, this.pickups, (p, item) => this.collect(item));
    this.physics.add.collider(this.enemies, this.ground, null, e => e.usesGround);
    this.physics.add.collider(this.player, this.crates);
    this.physics.add.overlap(this.playerBullets, this.enemies, (b, e) => this.bulletHits(b, e));
    this.physics.add.overlap(this.playerBullets, this.crates, (b, c) => this.bulletHits(b, c));
    this.physics.add.overlap(this.player, this.enemies, () => this.hurtPlayer());
    // (Task 8 adds boss overlaps in startBoss().)

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
        case 'energy': this.spawnPickup('energy', o.x, mid); break;
        case 'soldier': this.addEnemy(this.enemies, new Soldier(this.ctx, o.x, o.y), o.y, props); break;
        case 'drone': this.addEnemy(this.enemies, new Drone(this.ctx, o.x, mid), null, props); break;
        case 'turret': this.addEnemy(this.enemies, new Turret(this.ctx, o.x, mid, props.facing), null, props); break;
        case 'crate': this.addEnemy(this.crates, new Crate(this.ctx, o.x, o.y), o.y, props); break;
        default: console.warn(`Unknown object type "${type}" at ${o.x},${o.y}; skipped`);
      }
    }
  }

  addEnemy(group, e, groundY, props) {
    group.add(e);
    e.setupBody(); // after add(): group defaults overwrite body settings
    if (props.drop) e.drop = props.drop;
    if (groundY !== null) placeOnGround(e, groundY);
    return e;
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
    expireBullets(this.playerBullets, time, this.cameras.main.worldView);
    expireBullets(this.enemyBullets, time, this.cameras.main.worldView);
    // (Task 8 adds the boss trigger/update here.)
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

  spawnPickup(kind, x, y) {
    const item = this.pickups.create(x, y, 'pickup-' + kind);
    item.kind = kind;
    this.tweens.add({ targets: item, y: y - 4, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return item;
  }

  collect(item) {
    if (item.kind === 'energy') {
      const r = applyEnergyPickup(this.player.energy);
      if (!r.collected) return; // at max: leave it for later
      this.player.energy = r.energy;
    } else {
      this.player.weapon = item.kind;
    }
    this.sound.play('sfx-pickup');
    item.destroy();
  }

  // Pierce bullets keep flying but damage each target only once.
  bulletHits(b, target) {
    if (!b.active || b.hits.has(target)) return;
    b.hits.add(target);
    if (!b.pierce) killBullet(b);
    target.hit(b.damage);
  }

  onKilled(e) {
    this.score += e.score;
    this.explode(e.x, e.y);
    if (e.drop) this.spawnPickup(e.drop, e.x, e.y - 8);
    // (Task 8 adds boss handling here.)
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
