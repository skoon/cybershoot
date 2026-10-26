// Stage 2: NEON MARKET — crowded street, awnings and kiosks. Legend and format: docs/levels/LEVEL_GUIDE.md
// Rows below are rows 8..16: awnings sit at row 11 (index 3), awning soldiers at row 10 (index 2).
const G = n => '#'.repeat(n);
export const SEGMENTS = [
  // Warm-up: spread crate, a kiosk block to hop, one street soldier.
  { w: 30, rows: ['', '', '', '', '................##............', '...P......C...........S.......', G(30), G(30), G(30)] },
  // First group: an awning soldier above two street soldiers.
  { w: 30, rows: ['', '', '............S...............', '...........######.............', '', '....................S....S....', G(30), G(30), G(30)] },
  // Short pit between stalls (nothing covers it); laser crate and a drone after.
  { w: 30, rows: ['..................D...........', '', '', '', '', '.......................L......', '############...###############', '############...###############', '############...###############'] },
  // Group fight: two awning soldiers and a street soldier, energy on the awning.
  { w: 30, rows: ['', '', '.....E.S...............S......', '....######...........######...', '', '.........................S....', G(30), G(30), G(30)] },
  // Kiosk block and a short pit, then a lone turret on a pillar; energy crate.
  { w: 30, rows: ['', '', '', '........................T.....', '............##..........#.....', '...c........##..........#.....', G(30).slice(0, 7) + '...' + G(20), G(30).slice(0, 7) + '...' + G(20), G(30).slice(0, 7) + '...' + G(20)] },
  // Last stand: awning soldier, two street soldiers, drone, energy before the exit.
  { w: 30, rows: ['....................D.........', '', '..........E...S...............', '.........########.............', '', '......................S...S...', G(30), G(30), G(30)] },
  // Exit.
  { w: 12, exit: true, rows: ['', G(12), G(12), G(12)] },
];
