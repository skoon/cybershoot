// Bullet pools. Members are recycled with enableBody/disableBody.
export function createBulletGroup(scene, maxSize) {
  return scene.physics.add.group({ allowGravity: false, maxSize });
}
