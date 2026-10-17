// Bullet pools. Members are recycled with enableBody/disableBody.
export const WEAPONS = {
  blaster: { texture: 'bullet', cooldown: 180, speed: 420, count: 1, stepDeg: 0, damage: 1, pierce: false },
  spread: { texture: 'bullet', cooldown: 260, speed: 380, count: 3, stepDeg: 15, damage: 1, pierce: false },
  laser: { texture: 'laser', cooldown: 140, speed: 700, count: 1, stepDeg: 0, damage: 1, pierce: true },
};

export function createBulletGroup(scene, maxSize) {
  return scene.physics.add.group({ allowGravity: false, maxSize });
}

// Returns null when the pool is exhausted: the shot is just skipped.
export function fireBullet(group, texture, x, y, angle, speed, { damage = 1, pierce = false, lifespan = 1200, gravity = false, ignoreGround = false } = {}) {
  const b = group.get(x, y, texture);
  if (!b) return null;
  b.setTexture(texture);
  b.enableBody(true, x, y, true, true);
  b.setRotation(angle);
  b.body.setSize(); // match this texture's size
  if (Math.abs(Math.sin(angle)) > 0.7) b.body.setSize(b.height, b.width); // AABB doesn't rotate
  b.body.setAllowGravity(gravity);
  b.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  b.damage = damage;
  b.pierce = pierce;
  b.ignoreGround = ignoreGround;
  b.hits = new Set();
  b.dieAt = group.scene.time.now + lifespan;
  return b;
}

export function killBullet(b) {
  b.disableBody(true, true);
}

// Kill bullets past their lifespan or well outside the camera view.
export function expireBullets(group, time, view) {
  for (const b of group.getChildren()) {
    if (!b.active) continue;
    if (time >= b.dieAt || b.x < view.x - 16 || b.x > view.right + 16 || b.y < view.y - 64 || b.y > view.bottom + 16) killBullet(b);
  }
}
