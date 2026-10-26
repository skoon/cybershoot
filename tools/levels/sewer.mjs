// Stage 3: SEWER RUN — flooded underpass. Legend and format: docs/levels/LEVEL_GUIDE.md
const G = n => '#'.repeat(n);
const N = n => '.'.repeat(n);
// Alternating widths, ground first: F(6,3,21) = 6 ground, 3 pit, 21 ground.
const F = (...w) => w.map((n, i) => (i % 2 ? N(n) : G(n))).join('');
// Segment from a {rowNumber: string} map (rows 0-16); unlisted rows are empty.
const seg = (w, m, extra = {}) => ({ w, ...extra, rows: Array.from({ length: 17 }, (_, r) => m[r] || '') });
// Standard floor (rows 14-16) from F() widths.
const floor = (...w) => ({ 14: F(...w), 15: F(...w), 16: F(...w) });
export const SEGMENTS = [
  // Warm-up: spread crate on flat ground, then one easy 3-wide pit.
  seg(30, { 13: '...P.......C', ...floor(22, 3, 5) }),
  // Gentle drone: one drone overhead above a single 3-wide gap; energy on the far side.
  seg(30, { 6: N(14) + 'D', 13: N(22) + 'E', ...floor(13, 3, 14) }),
  // Platform chain: four 3-wide hops across a long drop; risky energy on a high ledge.
  seg(30, { 10: N(13) + 'E', 11: N(13) + '##', 14: F(6, 3, 3, 3, 3, 3, 3, 3, 3), 15: G(6) + N(21) + G(3), 16: G(6) + N(21) + G(3) }),
  // Island fight (breather from pits): stepped plateau with a soldier, plus an energy soldier.
  seg(30, { 11: N(15) + 'S', 12: N(12) + G(8), 13: N(4) + 'Q' + N(3) + G(16), ...floor(30) }),
  // Rising/falling hops: 3-wide platforms at changing heights, two drones hunt overhead.
  seg(30, { 6: N(12) + 'D', 7: N(22) + 'D', 12: N(15) + '###', 13: N(9) + '###' + N(9) + '###', 14: G(6) + N(21) + G(3), 15: G(6) + N(21) + G(3), 16: G(6) + N(21) + G(3) }),
  // Final-third chain: soldiers on the launch island, 2-wide platforms, drones, energy ledge.
  seg(30, { 5: N(14) + 'D', 6: N(22) + 'D', 9: N(21) + 'E', 10: N(21) + '##', 12: N(23) + '##', 13: '...S...Q' + N(10) + '##', 14: G(10) + N(3) + '##' + N(13) + G(2),15: G(10) + N(18) + G(2), 16: G(10) + N(18) + G(2) }),
  // Lead-in to the exit: energy before the end, one last pit with a drone.
  seg(18, { 5: N(11) + 'D', 12: N(6) + 'E', ...floor(10, 3, 5) }),
  // Exit zone.
  seg(12, { ...floor(12) }, { exit: true }),
];
