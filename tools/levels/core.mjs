// Stage 6: CORP CORE — reactor core, everything combined. Legend and format: docs/levels/LEVEL_GUIDE.md
const G = n => '#'.repeat(n);
// seg(width, {row: string}, floorString, extra): fills rows top..16, floor rows 14-16 default to full ground.
const seg = (w, o, f = G(w), extra = {}) => {
  const top = Math.min(...Object.keys(o).map(Number));
  const rows = [];
  for (let r = top; r <= 16; r++) rows.push(o[r] ?? (r >= 14 ? f : ''));
  return { w, ...extra, rows };
};
export const SEGMENTS = [
  // Warm-up: spread crate, three soldiers in a row, two drones.
  seg(30, { 6: '..........D.............D.....', 13: '...P....C.......S...S.....S...' }),
  // Two pits with floating platforms; laser crate first, soldier covering the far side, drones overhead.
  seg(30, { 6: '........D...........D.........', 12: '.......##..........##.........', 13: '..L.........S...........S...S.' }, G(6) + '....' + G(8) + '....' + G(8)),
  // Turret pillars: three turrets with soldiers between.
  seg(30, { 11: '........T.......T.......T.....', 12: '........###.....###.....###...', 13: '........###..S..###..S..###...' }),
  // Stair climb to a shelf: turret at the top, Q soldier drops energy.
  seg(30, {
    3: '...............D..............',
    7: '....................Q....T....',
    8: '..................#########...',
    9: '..................#########...',
    10: '............###############...',
    11: '............###############...',
    12: '......#####################...',
    13: '...S..#####################...',
  }),
  // Wide pits crossed on mid-pit platforms; soldiers on the landings, drones overhead.
  seg(30, { 5: '.........D............D.......', 12: '........##............##......', 13: '...............S............S.' }, G(5) + '........' + G(6) + '........' + G(3)),
  // Combined: pit with high energy platform, turret at a wall, soldiers on both sides.
  seg(30, { 4: '..................D...........', 10: '............E.................', 12: '............##........####....', 13: '.....S...........S...T####..S.' }, G(10) + '......' + G(14)),
  // Last breather before the boss: energy, two soldiers, drones.
  seg(20, { 5: '......D.......D.....', 12: '..........E.........', 13: '....S..........S....' }),
  // Boss arena: stepped platforms on the left only.
  { w: 30, arena: true, rows: ['......###', '..###', '', G(30), G(30), G(30)] },
];
