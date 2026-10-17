import { Enemy } from './enemies.js';
import { bossPhase, nextBossAttack } from './logic.js';
import { fireBullet } from './weapons.js';

const MAX_HP = 40;
const INTRO_MS = 1000;
const WALK_MS = 1600;
const WALK_SPEED = 50;
const CHARGE_SPEED = 260;
const TELEGRAPH_MS = 450;
const RECOVER_MS = 700;
const SHOCKWAVE_SPEED = 200;
const MISSILE_VY = -320;
const MISSILE_FLIGHT_S = 0.9; // rough time to land, used to aim the arcs

// States: intro → walk → telegraph-<attack> → stomp | charge | missiles → recover → walk …
export default class MechWalker extends Enemy {
  constructor(ctx, x, y) {
    super(ctx, x, y, 'boss', { hp: MAX_HP, score: 5000 });
    this.maxHp = MAX_HP;
    this.facing = -1;
    this.lastAttack = null;
    this.enter('intro', INTRO_MS);
  }

  setupBody() {
    super.setupBody();
    this.body.setAllowGravity(false).setImmovable(true);
  }

  // Red while telegraphing an attack; also survives the white hit-flash restore.
  // (String(): Phaser's GameObject.state is the number 0 until enter() runs.)
  restoreTint() {
    if (String(this.state).startsWith('telegraph')) this.setTint(0xff4040);
    else super.restoreTint();
  }

  enter(state, ms) {
    this.state = state;
    this.stateUntil = this.scene.time.now + ms;
    this.body?.setVelocityX(0);
    this.restoreTint();
    this.play(state === 'walk' || state === 'charge' ? 'boss-walk' : 'boss-idle', true);
  }

  update(time) {
    if (this.dead) return;
    const a = this.ctx.arena;
    if (this.state === 'charge') {
      this.body.setVelocityX(this.facing * CHARGE_SPEED);
      if ((this.facing < 0 && this.body.left <= a.left + 4) || (this.facing > 0 && this.body.right >= a.right - 4)) this.enter('recover', RECOVER_MS);
      return;
    }
    this.facePlayer();
    if (time < this.stateUntil) {
      if (this.state === 'walk') this.body.setVelocityX(this.facing * WALK_SPEED);
      return;
    }
    switch (this.state) {
      case 'intro':
      case 'recover':
        this.enter('walk', WALK_MS);
        break;
      case 'walk':
        this.lastAttack = nextBossAttack(bossPhase(this.hp, this.maxHp), this.lastAttack, Math.random());
        this.enter('telegraph-' + this.lastAttack, TELEGRAPH_MS);
        break;
      case 'telegraph-stomp':
        this.stomp();
        this.enter('recover', RECOVER_MS);
        break;
      case 'telegraph-charge':
        this.enter('charge', Infinity);
        break;
      case 'telegraph-missiles':
        this.missiles();
        this.enter('recover', RECOVER_MS);
        break;
    }
  }

  // Two ground shockwaves, left and right: jump over them.
  stomp() {
    const y = this.body.bottom - 6;
    for (const angle of [Math.PI, 0]) fireBullet(this.ctx.enemyBullets, 'shockwave', this.x, y, angle, SHOCKWAVE_SPEED, { ignoreGround: true, lifespan: 3000 });
    this.scene.cameras.main.shake(150, 0.01);
    this.scene.sound.play('sfx-explosion', { volume: 0.5 });
  }

  // Phase 2: four arcing missiles, one aimed at the player.
  missiles() {
    const a = this.ctx.arena;
    const x = this.x;
    const y = this.body.top;
    const targets = [this.ctx.player.x, ...Array.from({ length: 3 }, () => a.x + 32 + Math.random() * (a.width - 64))];
    targets.forEach((tx, i) => this.scene.time.delayedCall(i * 120, () => {
      if (!this.active || this.dead) return;
      const vx = (tx - x) / MISSILE_FLIGHT_S;
      fireBullet(this.ctx.enemyBullets, 'missile', x, y, Math.atan2(MISSILE_VY, vx), Math.hypot(vx, MISSILE_VY), { gravity: true, lifespan: 4000 });
    }));
  }

  hit(n) {
    if (this.state !== 'intro') super.hit(n);
  }

  // Level owns the death sequence (explosions, then destroy).
  die() {
    this.dead = true;
    this.body.setVelocity(0);
    this.ctx.onKilled(this);
  }
}
