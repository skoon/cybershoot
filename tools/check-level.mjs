// Static playability check for ASCII level files (tools/levels/*.mjs).
// Models the movement budget in docs/levels/LEVEL_GUIDE.md: walk, or jump up to 3 tiles with a horizontal
// reach that shrinks as the rise grows. Dash is never required, so it is ignored.
// usage: node tools/check-level.mjs tools/levels/<key>.mjs [...]
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const H = 17;
// Max column distance (centre to centre) for a jump rising `rise` tiles; drops use REACH[0].
// Physics allows ~1 column more at each height; the margin keeps jumps comfortable.
const REACH = [6, 5, 5, 4];
// A ceiling cuts the jump short. Indexed by clear rows above the head at take-off (capped at 4):
// the highest rise still possible, and the reach of a level jump under that ceiling.
const RISE_UNDER = [0, 0, 1, 2, 3];
const REACH_UNDER = [1, 3, 4, 5, 6];

export function buildGrid(segments) {
  const grid = Array.from({ length: H }, () => []);
  for (const seg of segments) {
    const top = H - seg.rows.length;
    for (let r = 0; r < H; r++) grid[r].push(...(r < top ? '' : seg.rows[r - top]).padEnd(seg.w, '.'));
  }
  const last = segments.at(-1);
  return { grid, ending: { arena: !!last.arena, col: grid[0].length - last.w, w: last.w } };
}

export function checkLevel(segments) {
  const { grid, ending } = buildGrid(segments);
  const W = grid[0].length;
  const problems = [];
  // Map sides and top are walls (world bounds collide there); below the map is the pit.
  const solid = (r, c) => (c < 0 || c >= W || r < 0) || (r < H && grid[r][c] === '#');
  const headRoom = (r, c) => { let k = 0; while (k < 4 && !solid(r - 3 - k, c)) k++; return k; };
  // Feet in row r, body rows r-2..r (the player is ~3 tiles tall).
  const standable = (r, c) => c >= 0 && c < W && r >= 0 && r < H - 1 && solid(r + 1, c) && ![r, r - 1, r - 2].some(y => solid(y, c));
  const cells = ch => grid.flatMap((row, r) => row.flatMap((x, c) => (x === ch ? [[r, c]] : [])));
  const at = (r, c) => `row ${r}, col ${c}`;

  const starts = cells('P');
  if (starts.length !== 1) return [`need exactly one P, found ${starts.length}`];
  if (!standable(...starts[0])) problems.push(`P at ${at(...starts[0])} is not standing on ground`);

  // Breadth-first search over standable cells.
  const seen = new Set();
  const key = (r, c) => r * W + c;
  const queue = [starts[0]];
  seen.add(key(...starts[0]));
  while (queue.length) {
    const [r, c] = queue.shift();
    for (let c2 = c - REACH[0]; c2 <= c + REACH[0]; c2++) {
      for (let r2 = r - 3; r2 < H; r2++) {
        if (seen.has(key(r2, c2)) || !standable(r2, c2)) continue;
        const rise = r - r2;
        const dc = Math.abs(c2 - c);
        const k = headRoom(r, c);
        const walkOrFall = k === 0 && (rise === 0 ? dc <= 1 : rise < 0 && dc <= 2);
        if (!walkOrFall && (rise > RISE_UNDER[k] || dc > Math.min(REACH[Math.max(0, rise)], REACH_UNDER[k]))) continue;
        // Columns jumped over must leave room for the body near the top of the arc.
        const top = Math.min(r, r2);
        let blocked = false;
        for (let cc = Math.min(c, c2) + 1; cc < Math.max(c, c2) && !blocked; cc++) {
          blocked = [top - 2, top - 3, top - 4].some(y => solid(y, cc));
        }
        if (blocked) continue;
        seen.add(key(r2, c2));
        queue.push([r2, c2]);
      }
    }
  }
  const reached = [...seen].map(k => [Math.floor(k / W), k % W]);

  const goalCol = ending.col + (ending.arena ? 3 : 1); // boss triggers at arena.x+48, exit at exit.x+16
  if (!reached.some(([, c]) => c >= goalCol)) {
    const far = Math.max(...reached.map(([, c]) => c));
    problems.push(`ending (col ${ending.col}) is unreachable; furthest reachable column is ${far}`);
  }
  if (ending.arena) {
    if (ending.w !== 30) problems.push('boss arena must be 30 columns wide');
    for (let c = ending.col; c < W; c++) if (!solid(14, c)) problems.push(`boss arena has no floor at col ${c}`);
  }

  for (const [r, c] of cells('E')) {
    if (!reached.some(([r2, c2]) => Math.abs(c2 - c) <= 1 && r2 - r >= 0 && r2 - r <= 4)) problems.push(`energy E at ${at(r, c)} is out of reach`);
  }
  for (const ch of 'SQ') for (const [r, c] of cells(ch)) {
    if (!solid(r + 1, c)) problems.push(`${ch} at ${at(r, c)} is not standing on ground`);
  }
  for (const ch of 'CLc') for (const [r, c] of cells(ch)) {
    if (!solid(r + 1, c)) problems.push(`crate ${ch} at ${at(r, c)} is not standing on ground`);
    if (solid(r - 1, c) || solid(r - 2, c)) problems.push(`crate ${ch} at ${at(r, c)} needs 2 empty rows above it (it is 40px tall)`);
  }
  for (const [r, c] of cells('T')) {
    if (!solid(r, c + 1) && !solid(r + 1, c)) problems.push(`turret T at ${at(r, c)} needs a wall to its right or a pillar below`);
  }
  for (const [r, c] of cells('D')) {
    if (r > 10) problems.push(`drone D at ${at(r, c)} is too low (keep drones in rows 0-10)`);
  }
  return problems;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let failed = false;
  for (const file of process.argv.slice(2)) {
    const { SEGMENTS } = await import(pathToFileURL(resolve(file)).href);
    const problems = checkLevel(SEGMENTS);
    const { grid } = buildGrid(SEGMENTS);
    const count = ch => grid.flat().filter(x => x === ch).length;
    const summary = `${grid[0].length} cols, ${count('S') + count('Q')} soldiers, ${count('D')} drones, ${count('T')} turrets, ${count('C') + count('L') + count('c')} crates, ${count('E') + count('c') + count('Q')} energy sources`;
    console.log(problems.length ? `FAIL ${file} (${summary})\n  ${problems.join('\n  ')}` : `ok   ${file} (${summary})`);
    failed ||= problems.length > 0;
  }
  process.exitCode = failed ? 1 : 0;
}
