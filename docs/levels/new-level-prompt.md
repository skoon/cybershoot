# Prompt: create a new Cybershoot level

Copy the block below into a new Claude Code session in this repo, and fill in the `{{…}}` fields.

---

```
Create a new stage for Cybershoot (Phaser 3 run-and-gun in this repo).

Stage brief:
- Key / file: {{level3}}   (map → public/assets/maps/{{level3}}.json, source → tools/levels/{{level3}}.mjs)
- Display name: {{SEWERS}}
- Position in LEVELS: {{after level2 / before level2 / …}}
- Ending: {{boss_arena | exit}}
- Theme / idea: {{e.g. "flooded underpass: many pits, drones overhead, turrets guarding ledges"}}
- Difficulty: {{easier than / similar to / harder than}} {{level2}}
- Target length: {{200}} columns

Before you design anything, read docs/levels/LEVEL_GUIDE.md in full. Also read tools/levels/level1.mjs
and tools/levels/level2.mjs as examples of the format. The guide's hard rules (§2) and movement budget
(§4) are binding.

Do this:
1. Plan the stage as a list of 30-column segments (the last one may be narrower if it is an exit).
   Give each segment one idea, and follow the guide's pacing rules (§6). Show me the segment list,
   one line per segment, before you write any code.
2. Write tools/levels/{{level3}}.mjs, exporting SEGMENTS in the ASCII format (§3).
3. Add { key: '{{level3}}', path: 'assets/maps/{{level3}}.json', name: '{{SEWERS}}' } to LEVELS in
   src/assets.js, at the requested position.
4. Run `npm run level -- tools/levels/{{level3}}.mjs`, then `npm test`. Fix every error.
5. Run `node tools/check-level.mjs tools/levels/{{level3}}.mjs` and iterate until it prints `ok`. It proves the
   ending and every energy pickup are reachable (including head room under ceilings and the map top) and
   checks object placement. Then re-read the stage against the pacing rules (§6), which it does not check.
6. If you can open a browser, start `npm run dev` and run
   `game.scene.start('Level', { level: <index> })` in the console. Then walk the stage and confirm there
   are no console errors and that no enemy is floating or buried. (A stage forced from the console can lose energy
   right away; judge the layout there, not the damage.)
7. Commit: tools/levels/{{level3}}.mjs, public/assets/maps/{{level3}}.json, src/assets.js.

Constraints: don't change game code (src/*.js other than the LEVELS entry), the tile art, or the
generator. If the stage idea needs a new enemy type or mechanic, stop and tell me rather than adding it.
```
