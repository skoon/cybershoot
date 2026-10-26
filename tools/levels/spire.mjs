// Stage 5: DATA SPIRE — climb a server tower. Legend and format: docs/levels/LEVEL_GUIDE.md
const G = n => '#'.repeat(n);
// Build a segment from solid blocks [col, width, topRow, bottomRow=16] and objects [col, row, char].
const seg = (w, blocks, objs = [], extra = {}) => {
  const g = Array.from({ length: 17 }, () => Array(w).fill('.'));
  for (const [c, bw, top, bot = 16] of blocks) for (let r = top; r <= bot; r++) for (let x = c; x < c + bw; x++) g[r][x] = '#';
  for (const [c, r, ch] of objs) g[r][c] = ch;
  return { w, ...extra, rows: g.map(r => r.join('')) };
};
export const SEGMENTS = [
  // Warm-up: spread crate, one soldier, a low two-step stair, a drone.
  seg(30, [[0, 30, 14], [18, 4, 12]], [[3, 13, 'P'], [10, 13, 'C'], [26, 13, 'S'], [16, 6, 'D']]),
  // First climb: 2-tile steps up to a high ledge, one turret on a step wall.
  seg(30, [[0, 30, 14], [4, 3, 12], [7, 3, 10], [10, 3, 8], [13, 17, 7]], [[9, 8, 'T'], [20, 4, 'D']]),
  // High ledges: narrow platforms over the drop (safe, floor below), energy and drones beside them.
  seg(30, [[0, 30, 14], [0, 3, 7, 7], [6, 3, 7, 7], [12, 3, 7, 7], [18, 3, 7, 7], [24, 6, 7, 7]], [[13, 5, 'E'], [9, 5, 'D'], [21, 5, 'D']]),
  // Descent: stairs down the far side, then a flat breather with a soldier and a laser crate.
  seg(30, [[0, 30, 14], [0, 3, 7], [3, 3, 9], [6, 3, 11], [9, 3, 13]], [[19, 13, 'L'], [26, 13, 'S']]),
  // Second climb: 3-tile steps with turrets on their left faces, drones at the top.
  seg(30, [[0, 30, 14], [4, 3, 11], [7, 3, 8], [10, 20, 7]], [[3, 11, 'T'], [6, 8, 'T'], [14, 4, 'D'], [24, 4, 'D']]),
  // The pit: floating ledges high above bottomless dark, one wall turret at the far pillar.
  seg(30, [[3, 3, 7, 8], [9, 3, 7, 8], [15, 3, 8, 9], [21, 3, 9, 10], [26, 4, 11]], [[25, 11, 'T'], [12, 5, 'D'], [16, 6, 'E']]),
  // Descent to the base: stairs down, soldiers at the bottom.
  seg(30, [[0, 4, 11], [4, 3, 12], [7, 3, 13], [10, 20, 14]], [[16, 13, 'S'], [22, 13, 'Q'], [26, 6, 'D']]),
  // Exit.
  seg(12, [[0, 12, 14]], [], { exit: true }),
];
