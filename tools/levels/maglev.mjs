// Stage 4: MAGLEV YARD — freight yard of stacked containers, turrets on top. Legend and format: docs/levels/LEVEL_GUIDE.md
const G = n => '#'.repeat(n);
export const SEGMENTS = [
  // Warm-up: laser crate and one soldier on flat ground.
  { w: 30, rows: ['...P....L.........S.........', G(30), G(30), G(30)] },
  // Teach: a single turret on a 2-tall container pillar, soldier beyond; energy as the reward.
  { w: 30, rows: ['..............T.............', '..............###...........', '..............###.....S...E.', G(30), G(30), G(30)] },
  // Climb: 2-tall block, then a 3-tall stack with a turret on its left face and a soldier on top.
  { w: 30, rows: ['.............S................', '.........T######..............', '......##########..............', '......##########..............', G(30), G(30), G(30)] },
  // Drone alley over low containers; energy pickup.
  { w: 30, rows: ['.....D..............D.........', '', '', '', '...............E..............', '', '........####..........####...', '........####......S...####...', G(30), G(30), G(30)] },
  // Short pit with a container landing, soldier on top, one drone.
  { w: 30, rows: ['..................D...........', '', '', '', '', '......................S.......', '...............###...####....', '...............###...####....', G(11) + '...' + G(16), G(11) + '...' + G(16), G(11) + '...' + G(16)] },
  // Turret row: two pillar turrets with a soldier on the container between.
  { w: 30, rows: ['.....T...................T....', '....###..........S......###..', '....###.........####....###..', G(30), G(30), G(30)] },
  // Last stack: stepped containers to a wall turret, soldier drops energy; spread crate; energy before the arena.
  { w: 30, rows: ['.......................Q......', '...................T######....', '..........######...######....', '.....c....######...######..E.', G(30), G(30), G(30)] },
  // Boss arena: one wide central container (rise 2), floor all the way.
  { w: 30, arena: true, rows: ['', '', '', '..........########............', G(30), G(30), G(30)] },
];
