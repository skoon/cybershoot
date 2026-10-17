import Phaser from 'phaser';
import { START_ENERGY, aimAngle, spreadAngles } from './logic.js';
import { ENTITIES } from './assets.js';
import { WEAPONS, fireBullet } from './weapons.js';

// Tuning knobs: playtest and adjust.
export const RUN_SPEED = 140;
export const JUMP_VELOCITY = -330; // ~60px peak with gravity 900
export const JUMP_CUT = 0.45;      // upward speed multiplier when jump is released early
export const DASH_SPEED = 320;
export const DASH_MS = 200;
export const DASH_COOLDOWN_MS = 600;
export const IFRAME_MS = 1000;
const MUZZLE = { x: 12, y: -2, upX: 2, upY: -16 }; // offsets from sprite centre: tune to the art

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, bullets) {
    super(scene, x, y, 'player');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.bullets = bullets;
    this.hitbox = ENTITIES.player.body;
    this.body.setSize(this.hitbox.w, this.hitbox.h).setOffset(this.hitbox.ox, this.hitbox.oy);
    this.setCollideWorldBounds(true).setDepth(10);
    this.energy = START_ENERGY;
    this.weapon = 'blaster';
    this.facing = 1;
    this.inDash = false;
    this.dashUntil = 0;
    this.dashReadyAt = 0;
    this.invulnUntil = 0;
    this.lastShotAt = -Infinity;
    this.jumpCut = false;
  }

  update(c) {
    const now = this.scene.time.now;
    const body = this.body;
    const onFloor = body.blocked.down;

    if (this.inDash && now >= this.dashUntil) this.endDash();
    if (this.inDash) {
      body.setVelocityX(this.facing * DASH_SPEED);
    } else {
      const dir = (c.right ? 1 : 0) - (c.left ? 1 : 0);
      body.setVelocityX(dir * RUN_SPEED);
      if (dir) this.facing = dir;
      if (c.jumpPressed && onFloor) { body.setVelocityY(JUMP_VELOCITY); this.jumpCut = false; }
      if (!c.jump && body.velocity.y < 0 && !this.jumpCut) { body.setVelocityY(body.velocity.y * JUMP_CUT); this.jumpCut = true; }
      if (c.dashPressed && now >= this.dashReadyAt) this.startDash(onFloor);
    }
    this.shootIfReady(c, now);

    this.setFlipX(this.facing < 0);
    this.setAlpha(now < this.invulnUntil && Math.floor(now / 60) % 2 ? 0.3 : 1);
    const anim = this.inDash ? 'player-dash' : !onFloor ? 'player-jump' : body.velocity.x ? 'player-run' : 'player-idle';
    this.play(anim, true);
  }

  startDash(onFloor) {
    const now = this.scene.time.now;
    const b = this.hitbox;
    this.inDash = true;
    this.dashUntil = now + DASH_MS;
    this.dashReadyAt = now + DASH_MS + DASH_COOLDOWN_MS;
    if (onFloor) {
      this.body.setSize(b.w, b.h / 2).setOffset(b.ox, b.oy + b.h / 2); // slide: duck under shots
    } else {
      this.body.setAllowGravity(false);
      this.body.setVelocityY(0);
    }
    this.scene.sound.play('sfx-dash', { volume: 0.5 });
  }

  endDash() {
    const b = this.hitbox;
    this.inDash = false;
    this.body.setSize(b.w, b.h).setOffset(b.ox, b.oy);
    this.body.setAllowGravity(true);
  }

  shootIfReady(c, now) {
    const w = WEAPONS[this.weapon];
    if (!c.shoot || now < this.lastShotAt + w.cooldown) return;
    this.lastShotAt = now;
    const x = this.x + this.facing * (c.up ? MUZZLE.upX : MUZZLE.x);
    const y = this.y + (c.up ? MUZZLE.upY : MUZZLE.y);
    for (const a of spreadAngles(aimAngle(this.facing, c.up), w.count, w.stepDeg)) {
      fireBullet(this.bullets, w.texture, x, y, a, w.speed, { damage: w.damage, pierce: w.pierce });
    }
    this.scene.sound.play('sfx-shot', { volume: 0.3 });
  }

  // Each hit costs one energy pack. Dash and post-hit i-frames ignore hits.
  hit() {
    const now = this.scene.time.now;
    if (this.inDash || now < this.invulnUntil || this.energy <= 0) return false;
    this.energy -= 1;
    this.invulnUntil = now + IFRAME_MS;
    return true;
  }
}
