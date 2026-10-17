import Phaser from 'phaser';
import { ENTITIES } from './assets.js';
import { fireBullet } from './weapons.js';

const WAKE_MARGIN = 32; // enemies start acting once this close to the right edge of the camera

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(ctx, x, y, kind, { hp, score }) {
    super(ctx.scene, x, y, kind);
    ctx.scene.add.existing(this);
    this.ctx = ctx;
    this.kind = kind;
    this.hp = hp;
    this.score = score;
    this.drop = null;
    this.dead = false;
    this.awake = false;
    this.usesGround = false;
    if (ENTITIES[kind]?.scale) this.setScale(ENTITIES[kind].scale);
    this.restoreTint();
  }

  // Call after group.add(): Arcade groups reset body settings when a child is added.
  setupBody() {
    const b = ENTITIES[this.kind].body;
    this.body.setSize(b.w, b.h).setOffset(b.ox, b.oy);
  }

  isAwake() {
    if (!this.awake) this.awake = this.x < this.scene.cameras.main.worldView.right + WAKE_MARGIN;
    return this.awake;
  }

  restoreTint() {
    const t = ENTITIES[this.kind]?.tint;
    if (t) this.setTint(t); else this.clearTint();
  }

  hit(n) {
    if (this.dead) return;
    this.hp -= n;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(60, () => { if (this.active) this.restoreTint(); });
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.ctx.onKilled(this);
    this.destroy();
  }

  facePlayer() {
    this.facing = this.ctx.player.x < this.x ? -1 : 1;
    this.setFlipX(this.facing < 0);
  }
}

export class Soldier extends Enemy {
  constructor(ctx, x, y) {
    super(ctx, x, y, 'soldier', { hp: 2, score: 100 });
    this.facing = -1;
    this.nextShotAt = 0;
    this.usesGround = true;
  }

  update(time) {
    if (this.dead || !this.isAwake()) return;
    const p = this.ctx.player;
    if (Math.abs(p.x - this.x) < 200 && Math.abs(p.y - this.y) < 40) {
      this.body.setVelocityX(0);
      this.facePlayer();
      this.play('soldier-idle', true);
      if (time >= this.nextShotAt) {
        this.nextShotAt = time + 1200;
        fireBullet(this.ctx.enemyBullets, 'enemy-bullet', this.x + this.facing * 10, this.y - 2, this.facing > 0 ? 0 : Math.PI, 180);
      }
      return;
    }
    // Patrol: turn at walls and ledges.
    const ahead = this.ctx.ground.getTileAtWorldXY(this.x + this.facing * 10, this.body.bottom + 4);
    if (this.body.blocked.left) this.facing = 1;
    else if (this.body.blocked.right) this.facing = -1;
    else if (this.body.blocked.down && !ahead?.collides) this.facing *= -1;
    this.body.setVelocityX(this.facing * 40);
    this.setFlipX(this.facing < 0);
    this.play('soldier-walk', true);
  }
}

export class Drone extends Enemy {
  constructor(ctx, x, y) {
    super(ctx, x, y, 'drone', { hp: 1, score: 150 });
    this.baseY = y;
    this.nextShotAt = 0;
    this.play('drone-fly');
  }

  setupBody() {
    super.setupBody();
    this.body.setAllowGravity(false);
  }

  update(time) {
    if (this.dead || !this.isAwake()) return;
    const dx = this.ctx.player.x - this.x;
    this.body.setVelocityX(Math.abs(dx) > 8 ? Math.sign(dx) * 50 : 0);
    this.y = this.baseY + Math.sin(time / 300) * 16;
    this.setFlipX(dx < 0);
    if (Math.abs(dx) < 60 && time >= this.nextShotAt) {
      this.nextShotAt = time + 1400;
      fireBullet(this.ctx.enemyBullets, 'enemy-bullet', this.x, this.y + 8, Math.PI / 2, 150);
    }
  }
}

export class Turret extends Enemy {
  constructor(ctx, x, y, facing = 'left') {
    super(ctx, x, y, 'turret', { hp: 4, score: 200 });
    this.setFlipX(facing === 'left');
    this.nextBurstAt = 0;
    this.play('turret-idle');
  }

  setupBody() {
    super.setupBody();
    this.body.setAllowGravity(false).setImmovable(true);
  }

  update(time) {
    if (this.dead || !this.isAwake() || time < this.nextBurstAt) return;
    const p = this.ctx.player;
    if (Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y) > 260) return;
    this.nextBurstAt = time + 2000;
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 150, () => {
        if (!this.active || this.dead) return;
        fireBullet(this.ctx.enemyBullets, 'enemy-bullet', this.x, this.y, Phaser.Math.Angle.Between(this.x, this.y, p.x, p.y), 170);
      });
    }
  }
}

export class Crate extends Enemy {
  constructor(ctx, x, y) {
    super(ctx, x, y, 'crate', { hp: 1, score: 10 });
  }

  setupBody() {
    this.body.setAllowGravity(false).setImmovable(true); // hitbox = texture size
  }

  update() {}
}
