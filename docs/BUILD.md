# Build Guide (for agents)

Everything still to build for the 21-level jam game, written so an agent can pick up any task cold. Each task card says what to build, which files to touch, how (concretely), how to prove it's done, and which docs to update. Written 2026-11-02 against the build at 12 levels and 141 tests.

**At a glance**
- **What's left:**
  - 9 levels;
  - 1 rule system (Upside Down);
  - 1 rendering hook (skins for doors, pillars and portraits);
  - the finale rework;
  - act 5 and finale cards;
  - credits;
  - a few sound hooks;
  - the release refresh.
- **Read first:** `CLAUDE.md`, then this guide's §1 (protocol) and §2 (recipes). The specs live in [LEVELS.md](LEVELS.md) §5–5.3 and [TECH.md](TECH.md) §6.5; this guide links to them, it doesn't repeat them.
- **Order:** §3. Tasks in the same column can run in parallel (different files); arrows are hard dependencies.
- **Done means:** `npm test`, `npm run check`, `npm run audit` and `npm run media` all pass, and the docs are synced (§1.3).

## 1. Protocol (every task)

### 1.1 Rules that never bend
- **The one rule:** the screen only draws what `src/rules.js` decided. Anything that changes where the player is, or whether they live, die or win, goes in `rules.js`, with a test. Drawing, sound and effects go in `main.js`, `art.js`, `sprites.js` and `audio.js`.
- **Tests first** for any rule change (`test/rules.test.mjs`). Levels are proven by a scripted policy in `test/solutions.mjs`; fairness is enforced by `test/fairness.test.mjs`:
  - ≥ 200 ms of slack on every required input in acts 1–2, ≥ 100 ms in acts 3–5;
  - no respawn point inside a patrol;
  - no freak over an exit.
- **Determinism:** no `Math.random`, no `Date` and no per-object mutable state in `rules.js`. Freak positions are pure functions of a clock.
- **`main` is the public build:** GitHub Pages serves it. Never push a broken or unplayable `main`; run §1.2 first.
- **Docs follow the code in the same commit** (`docs/INDEX.md` rules): every number in a doc matches the code, and nothing planned is described as built.
- **Commit messages** end with the attribution lines the session gives you.

### 1.2 Commands (before every push)
```bash
npm test
```
```bash
npm run check
```
```bash
npm run audit
```
```bash
npm run media
```
- **`npm test`:** all tests, including fairness (≈ 2 min).
- **`npm run check`:** syntax plus every level parses.
- **`npm run audit`:** per-level input slack, lag tolerance, and a random search for wins below par.
- **`npm run media`:** headless Edge or Chrome plays level 1 with real keys and runs the flow checks; it also checks audio clipping and draw cost, and saves screenshots to `media/` for you to look at.

Manual play: `npm start`, then `?level=N&autostart` (N = position in `src/levels.js`), `?debug` for the overlay (clocks, layer, night entries). In the console, `__doubleShift` is the game object.

### 1.3 Doc sync checklist (tick what your change touches)
- **New or changed level:**
  - LEVELS.md (move the spec from §5 to §4 "Built levels", with real columns and par);
  - CONTENT.md §2 status;
  - GDD.md §8.2 ✅;
  - WRITING.md §3 ✅ (the note must match `note` in `levels.js` exactly);
  - PRODUCTION.md backlog row struck through;
  - ART.md §6.2 props row.
- **Counts:** the test count in README.md, TECH.md (two places), DESIGN.md, PRODUCTION.md §1 and itch/page.md; the level count in README.md, itch/page.md, PRODUCTION.md §1, LEVELS.md At a glance, GDD At a Glance and CONTENT At a glance; `src/*.js` line counts in DESIGN.md.
- **New rule:** TECH.md §3 (state, step order, events, API) and §6.5; LEVELS.md §1 metrics if movement changed; CLAUDE.md architecture bullets.
- **New sound:** AUDIO.md §4.1 values must match `SOUNDS`.
- **New art:** ART.md §5 / §6.1 / §6.2.

## 2. Recipes

### 2.1 Add a level
1. **Data.** Add a block to `LEVELS` in `src/levels.js`, **at its position in the 21-level order** (LEVELS.md §5.0). The build shows levels in array order; the full-game number is the spec's `#`. Fields:
   ```js
   {
     id: 'stairs', name: 'Under Renovation', act: 2,
     note: "They built a staircase. It leads nowhere. They're very proud.",   // WRITING.md §3, one line at scale 2
     par: 2,                       // set to what the scripted solution proves
     props: [{ kind, tx, ty, layer?, w?, text?, style? }],                   // PROPS in src/art.js
     skins: [ ... ],               // after task T1: doors/pillars/portraits drawn over solids
     decor: [{ kind: 'eyes', tx, ty }],
     day: [ 18 strings × 32 chars ], night: [ ... ],                         // or offset / upsideDown (T7)
     pranks: [{ id, onNight, tell: { tx, ty }, set: [{ layer: 'night', x0, x1, y0, y1?, ch }], sound? }],
     freaks: [{ kind: 'lurker'|'peeker'|'squatter'|'supervisor'|'daywalker', tx, ty, range?, speed?, period?, duty?, phase?, startFacing? }],
   }
   ```
   - Grid legend: `#` solid, `^` hazard (bottom 45% of its tile), `~` wet floor, `S`, `E` and `C` shared (place them in the day grid), `.` empty. Rows 0–17; the usual floor has its top at row 14, so you stand on row 13. Outside the grid, the sides and ceiling are solid and below is a fall.
   - Building grids: write them in a throwaway script (fill rectangles, then print rows) rather than by hand. Every row must be exactly 32 characters or `parseLevel` throws.
2. **Metrics** (LEVELS.md §1):
   - rises ≤ 3 tiles are jumpable, 4 block;
   - gaps ≤ 4 are comfortable, ≥ 7 impossible (use 8 for "must shift");
   - a 1-tile-high tunnel can't be jumped in;
   - a full jump is ≈ 93.5 px high and reaches ≈ 5.6 tiles flat at full run.

   Leave about 2 tiles where both shifts are safe wherever a shift is required.
3. **Solution.** Add a policy to `SOLUTIONS` in `test/solutions.mjs`, keyed by `id`. Policies read the state like a player:
   - `tx(s)` for position;
   - `s.layer`, `s.nightEntries`, `s.freakClock`, `s.dayClock`;
   - `freakBoxes(L.<id>, s)` for freak timing.

   Return `{ right, left, jump, shift }`. `play()` turns a held shift into one press, so release between shifts. Model on `watch`, `supervisor` (waiting on a freak), `offset` (apex shifts, with a `m` memo object) and `clockout` (jumping on landing).
4. **Level-specific tests** in `test/levels.test.mjs`: the lesson is required. For example, staying on one shift gets you spooked, or the skip you worried about doesn't win. Copy the Night Watch, Broad Daylight, Stacked and Clock Out tests.
5. **Run** `npm test` and `npm run audit -- <id>`. Fix any input under the act's floor by widening the space, not by tightening the policy. If the audit's random search finds a win below par, close the route (that's how the Night Watch roof and the Floor 3.5 exit came about).
6. **Look at it:** add `[<position>, <night?>, 'NN-<id>-<shift>.png']` to the level list in `scripts/media.mjs`, run it, and read the screenshot. Check that no HUD text covers the exit, a tell or a freak.
7. **Docs:** §1.3.

### 2.2 Add or change a rule
Write the tests first in `test/rules.test.mjs`, using tiny ASCII levels: `level(day, night, extra)`, `stepN`, `place` and `play` from `test/helpers.mjs`. Then change `rules.js`, then run all levels' pars and fairness (`npm test`), then document TECH.md §3 and §6.5.

### 2.3 Add a sound or a visual
- **Sound:** add to `SOUNDS` in `src/audio.js` (each voice ≤ 0.25 s, vol ≤ 0.35; a test enforces it), expose it on `sfx`, and call it from an event in `main.js`'s `handleEvents`.
- **Visual:** procedural pixel art goes in `src/art.js` (use `px()`: art pixels are 2×2 screen pixels; colors from `PAL` and `C`). Character sprites are string grids in `src/sprites.js` (a test checks rectangles and palettes). Show every new asset in `tools/gallery.html`.

## 3. Work order

```
T1 skins ─┬─> T3 doors (Lost & Found)          T2 stairs (Under Renovation)     T6 audit (Night Audit)
          ├─> T4 pillar (Structural Integrity)
          └─> T5 portrait (Employee of the Month)
T7 Upside Down rule ──> T8 upside ──> T9 fallup ──> T10 ceiling ──> T11 heels ──> T12 finale rework
T13 act 5 + finale cards (after T8)     T14 credits (any time)     T15 sound hooks (after T1)
T16 release refresh (last, and after each batch)
```

- **Tier B by Nov 15:** T1–T6.
- **Tier C:** T7 working and T8 at par by **Nov 18**, then T9–T12. If T7/T8 miss Nov 18, stop act 5. The game ships tier B with today's Clock Out (the fallback is already built).
- **Content freeze:** Nov 22.

## 4. Task cards

### T1 · Skins: doors, pillars and portraits drawn over solids *(rendering only)*
- **Why:** doors, the pillar and the portrait are ordinary `#` tiles in the rules (pranks move them by overriding tiles), but they must look like doors, a pillar and a portrait. Their art already exists in `src/art.js`: `drawDoor`, `drawEmptyFrame`, `drawDoorPile`, `drawPillar`, `drawCrack`, `drawPortrait`.
- **Design:** a new optional level field `skins: [{ kind, tx, ty, w?, h?, layer? }]`, drawn in `staticLayer()` in `src/main.js` **after** the tiles. The static layer is cached per level × shift × prank state, so skins follow pranks for free.
  - `door`: covers `(tx, ty-h+1 … ty)`. If every covered cell is solid in that layer under the current overrides, draw `drawDoor(ctx, tx, ty, layer, h)`; if every cell is empty, draw `drawEmptyFrame` (the stolen door).
  - `pillar`: same rule, `drawPillar(ctx, tx, ty-h+1, ty, layer)`. Where a pillar was but isn't, draw `drawCrack` at the top cell.
  - `portrait`: a `w×h` rect; draw `drawPortrait` where all cells are solid. It needs `t` for blinking, so draw portraits per frame in `drawPlay()`, not in the cache.
  - `doorPile`: `{ tx, ty (bottom row), w }`. Count the consecutive solid rows from the bottom and draw `drawDoorPile(ctx, tx, ty, layer, count)`.
  - Unknown kinds throw in `parseLevel` (validation); `parseLevel` passes `skins` through (`skins: def.skins ?? []`).
- **Prank sounds:** `parseLevel` keeps `sound: pr.sound ?? null` on each prank. In `handleEvents` `case 'prank'`, if the prank has a `sound`, also call `playSound(sound)` (`doorThunk`, `pillarScrape`).
- **Tests:**
  - `test/art.test.mjs`: every skin kind used in `LEVELS` exists;
  - `test/rules.test.mjs`: `parseLevel` throws on an unknown skin kind, and keeps `sound`.
- **Gallery:** already shows these objects.
- **Done when:** a test level with a door skin removed by a prank shows the door, then the empty frame (check in a screenshot). Docs: TECH.md §5 (level format) and LEVELS.md §2 (authoring format).

### T2 · Under Renovation (`stairs`, #7, act 2, tier B)
- **Spec:** LEVELS.md §5 "Under Renovation". A night staircase of 1-tile steps climbs about 6 tiles and ends in mid-air; a day ledge (unjumpable from the floor, about 6 up) starts ≤ 4 tiles past the top step and runs to the exit. Solution: night, climb, run off the top, shift to day mid-air, land on the ledge. **Target par 2.**
- **Place:** after `watch` in `LEVELS`, `act: 2`.
- **Props:** the proud sign (`sign` text `OUR STARES!` or a WRITING draft), eyes under the stairs; optional squatter on a landing (you jump over it).
- **Fairness:** act 2, so ≥ 200 ms. Give the mid-air shift a tall clear column (both shifts empty) above the ledge's start.
- **Tests:** can't win staying on day (the ledge is too high); can't win staying on night (no ledge).

### T3 · Lost & Found (`doors`, #8, act 2, tier B) · needs T1 for the look
- **Spec:** LEVELS.md §5 "Lost & Found".
  - Three full-height doors D1–D3 (both shifts, `#` columns about rows 9–13 or full height) cut the floor into rooms. The exit is on a ledge about 6 up.
  - Night entry *n* steals door D*n* (the prank sets that column `.` on night) and adds one door to the pile at the ledge's foot (sets one more row of the pile `#` on night).
  - After 3 entries the pile makes the climb jumpable (each rise ≤ 3).
- **Par:** 5. The challenge is *where* to toggle: rebar by day and lasers by night leave only some spots safe in both shifts, and a lurker between D2 and D3 must be frozen at the right moment.
- **Skins:** `door` for D1–D3 (empty frame once stolen), `doorPile`. Props: `lostFoundBox`. Prank `sound: 'doorThunk'`.
- **Tests:** below 3 entries the ledge is unreachable; the prank order (D1 then D2 then D3).

### T4 · Structural Integrity (`pillar`, #10, act 3, tier B) · needs T1 for the look
- **Spec:** LEVELS.md §5 "Structural Integrity".
  - A mezzanine (top about 7 up) holds the exit.
  - By day a 4-tall pillar blocks the floor route; a 3-tall day-only crate stack sits further on.
  - Night entries 1–3 move the pillar to positions P1–P3 (pranks clear the old cells, set the new ones). At P2 it stands between the crate and the mezzanine: crate (3) → pillar top (4) → mezzanine (7).
  - Solution: plan which clock-in is which, so you're on the crate in day when entry 2 fires, then jump and shift mid-air onto the pillar.
- **Par:** ≈ 4. Tells at P1–P3 are all visible from the spawn.
- **Skins:** `pillar` at each position (only the solid one draws), `drawCrack` where it was. Prank `sound: 'pillarScrape'`.

### T5 · Employee of the Month (`portrait`, #13, act 4, tier B) · needs T1 for the look
- **Spec:** LEVELS.md §5 "Employee of the Month".
  - At night a 2×3 portrait (solid) hangs in front of the exit doorway.
  - By day the exit is clear, but the day route ends at an unclimbable ledge (5+).
  - Each night entry rehangs it (prank: clear old cells, set new ones). On entry 2 it hangs low beside the ledge as a step.
  - Solution: step on it at night, walk above the exit, shift to day, drop in.
- **Par:** 3–4.
- **Skins:** `portrait` at each position (drawn per frame, eyes blink). Props: `plaque`, a nail mark (a small `px` or a new prop).
- **Place:** first level of act 4 (`act: 4`), before `daywalker`.

### T6 · Night Audit (`audit`, #16, act 4, tier B)
- **Spec:** LEVELS.md §5 "Night Audit". One screen, three beats left to right with checkpoints between:
  1. a wax corridor with a dry day stop before a hazard;
  2. a supervisor watching two short 1-tile tunnels;
  3. a day-walker you pass by going night, then a night lurker you pass by going day.

  One prank, telegraphed from the spawn, lays a plank over the last pit on the night entry the beats naturally lead to.
- **Par:** 6–8, the scripted count.
- **Place:** after `offset` (`act: 4`).
- **Watch-outs:**
  - Only one supervisor per level (validation).
  - The supervisor's side is decided by each freak's base `tx` versus its own.
  - The day-walker and lurker clocks are separate (`dayClock`, `freakClock`), and neither is checkpointed.
  - Put checkpoints where both shifts have floor; the respawn rule only saves where you can stand.
- **Tests:** each beat's lesson is required (copy the `supervisor`, `wet` and `daywalker` patterns).

### T7 · The Upside Down rule (SYS-16) · the tier-C gate, due Nov 18
- **Spec:** TECH.md §6.5 "Upside Down" and LEVELS.md §5.2. The level field `upsideDown: true`: by day the map as drawn; **at night the same map flipped top to bottom, with gravity pointing up**. Author the day grid only.
- **Rules (`src/rules.js`):**
  1. **Parse:** in `parseLevel`, if `def.upsideDown`, generate `night[y] = day[H-1-y]` (like `generateOffset`, line ~118). Strip `S`/`E`/`C` from the copy, then apply `nightPatch`. Throw if combined with `night` or `offset`. Keep `upsideDown` on the parsed level.
  2. **Gravity sign:** add `gravitySign(level, layer)`, returning `-1` when `level.upsideDown && layer === NIGHT`, else `1`.
  3. **Step:**
     - the jump sets `vy = -sign * jumpVelocity` (line ~458);
     - the variable-jump cut applies while moving against gravity (`sign * vy < 0`, lines ~465–469);
     - gravity integrates `vy += sign * gravity * dt`, clamped to `±maxFall` in the gravity direction (line ~472);
     - landing sets `grounded` when the vertical collision stops movement in the gravity direction;
     - `land` and `jump` events fire as now.
  4. **Grounding:** `isGrounded` (line ~213) probes 1 px in the gravity direction (above the head when the sign is −1). Give it the sign through the layer.
  5. **Hazards:** a `^` cell's hitbox is the bottom 45% of the tile; on a flipped shift use the **top** 45% (in day terms it's the same hazard turned over). Update `overlapsHazard` to take the sign.
  6. **Freaks:** in `freakBoxes`, for night freaks in an upside-down level, hang them from the solid above: `y = ty * TILE` instead of `(ty+1) * TILE - FREAK.h`, in the flipped coordinates the author used.
  7. **Checkpoints:** the `standable()` check (line ~506) already calls `isGrounded`; it must pass the layer's sign.
  8. **Shift:** the transaction is unchanged (S-08). Velocity is kept in screen space, so a rise becomes a fall the other way.
- **Tests first** (`test/rules.test.mjs`):
  - the generated night equals a hand-flipped grid;
  - S/E/C aren't copied; `nightPatch` applies after the flip; validation throws;
  - gravity sign per layer; at night you fall up and land on the flipped floor (`grounded` true under a solid);
  - a jump at night goes down; the variable-jump cut at night;
  - a mid-air shift reverses the fall and keeps `vx` and `vy`;
  - a grounded shift whose flipped geometry would embed you is refused;
  - the hazard hitbox is flipped at night;
  - a hanging freak box at night, frozen by day;
  - a checkpoint is standable under flipped gravity;
  - a determinism replay;
  - every existing test still passes (non-flipped levels must not change at all).
- **Drawing (`main.js`, `art.js`, `sprites.js`):**
  - `drawSprite` gets a `vflip` option (scale(1, -1) about the sprite). The worker draws with `vflip` when the gravity sign is −1, and `workerFrame` should treat "rising" as moving against gravity.
  - Night freaks in upside-down levels draw with `vflip`, as do their frozen outlines by day.
  - `drawRebar`/`drawLaser` get a flipped variant for night tiles in upside-down levels (draw inside `ctx.save(); translate; scale(1,-1)`).
  - Tells (`drawTells`) hang under the solid at night.
  - The HUD and level note stay upright.
- **Sound:** add `flip` to `SOUNDS` (sine sweep down, about 300 → 120 Hz, 0.12 s, vol 0.12) and play it with the shift sound in upside-down levels (`handleEvents` `case 'shift'`).
- **Gallery:** add a flipped worker, a hanging freak and a flipped laser.
- **Done when:** all the tests pass and a throwaway test level (not shipped) plays correctly in the browser. Then do T8.

### T8 · Mind Your Head (`upside`, #17, act 5) · needs T7 · prove by Nov 18
- **Spec:** LEVELS.md §5.2 "Mind Your Head" and its design rules. At night the building is upside down: you fall up and walk along what was the ceiling.
  - First beat: the floor route is blocked by day while the ceiling route is clear; clock in, fall up, cross, clock out, drop past the obstacle.
  - Second beat: the reverse.
  - The first shift happens in open space with nothing to hit; a checkpoint before the first real use.
- **Par:** 2–3. `upsideDown: true`, `act: 5`.
- **Design rule** (LEVELS.md §5.2): at night, being at screen row *y* is like being at row *17-y* in the day map. A shift moves you to your mirror height, so put shift spots where both the day position and its mirror are clear.
- **Solution policy:** gravity-aware. When airborne, read `s.player.vy` with the sign, and when to shift by position.
- **Then:** T13 (act 5 card) can land.

### T9 · Falling Up (`fallup`, #18) · T10 · Ceiling Walker (`ceiling`, #19) · T11 · Head Over Heels (`heels`, #20) · need T7, after T8
- **Specs:** LEVELS.md §5.2. Pars: 4–6, 4–6 and 6–8. All `upsideDown: true`, `act: 5`, in this order after `upside`.
- **Falling Up:** a tall shaft with ledges on alternating sides at unjumpable heights; flip mid-fall to "fall" onto the opposite side. One beat uses a flip as a brake over a pit. Space the ledges against the jump (≈ 93.5 px) and give every flip ≥ 100 ms; check with the audit.
- **Ceiling Walker:** a lurker on the night ceiling route (hanging box from T7); by day it's an upside-down outline above you. Then a telegraphed plank prank on the flipped map, with tells hanging under solids.
- **Head Over Heels:** a day-walker on the floor by day and a lurker on the ceiling by night. Every shift freezes one, wakes the other and flips gravity. It ends on a prank. Checkpoints between beats.
- **Tests:** each lesson is required, e.g. Ceiling Walker: staying on night under the lurker gets you spooked.

### T12 · Finale rework (`clockout`, #21) · needs T7–T11 · fallback stays
- **Spec:** LEVELS.md §5.3. One screen, `upsideDown: true`, four rooms recalling the acts:
  1. mid-air stones;
  2. a frozen-lurker tunnel plus a telegraphed prank;
  3. a wax stop under a supervisor;
  4. a flipped climb to the time clock, where they take the last step and put it back.

  Checkpoint at every room; fairness ≥ 100 ms.
- **Keep the fallback one line away:** move today's Clock Out block into `src/levels.js` as an exported `CLOCKOUT_CLASSIC` (not in `LEVELS`), keep its policy as `SOLUTIONS_EXTRA.clockoutClassic`, and keep a test that it still wins at par 7. Shipping the fallback is then swapping one array entry.
- **Ending:** unchanged (the end screen's eyes and wave already exist).
- **Order:** last in `LEVELS`. Give it `act: 6` with `ACTS[6] = 'Finale'` (see T13) so level select shows it on its own row.

### T13 · Act 5 and finale cards *(small; after T8)*
- `src/levels.js`: `ACTS[5] = 'Upside Down'` and `ACTS[6] = 'Finale'`.
- `src/copy.js`: `ACT_LINES[5] = 'The night shift turned the building over.'` and `ACT_LINES[6] = 'One more shift.'`.
- `src/main.js` `drawAct()`: when `act === 6`, draw `FINALE` instead of `ACT 6`.
- Level select rows come from acts, so act 6 gets its own row (check that `cardRect` fits 6 rows: `CARD.top + 5 * rowH` must stay on screen; shrink `rowH` if needed).
- Tests: `test/save.test.mjs` already checks that acts never go backwards and every act has a name. The font test checks every printed character has a glyph.
- Check the act card and level select screenshots.

### T14 · Credits *(any time)*
- WRITING.md §8: "Designed by Vinícius Raposo. Built with AI assistance (Claude). Made for GitHub Game Off 2026." Plus the design partner, if any, as they choose to be credited.
- Add them under the end screen's totals (it's sized from the level count), or as a second page on Space. Mark WRITING §8 ✅ and CONTENT TXT-7.

### T15 · Sound hooks *(after T1)*
- **`doorThunk` / `pillarScrape`:** via the prank `sound` field (T1).
- **`peekerBoing`:** in `main.js`, compare each peeker's `active` with the previous frame (cosmetic, so `main` is fine); on false→true while it's on screen and on its shift, play it.
- **`lurkerStep`:** optional, very quiet. Skip it if it clutters the mix.
- Update AUDIO.md §4 and §4.1 status.

### T16 · Release refresh *(after each batch, and last)*
1. `npm run media`. Add the new levels to its capture list and pick the itch screenshots; the first one should show a prank or the flip.
2. Refresh `tools/cover.html` only if act 5 ships (an upside-down hint is a strong hook).
3. Update the counts: itch/page.md (description "What's in this build", screenshot order, test count), README status line, DESIGN.md.
4. `npm run zip`, and test the zip in an iframe (RELEASE.md §5 first-60-seconds check).
5. `docs/PLAYTEST.md` round 2 on the full run.

## 5. Known gotchas
- **Offset and Upside Down levels generate their night grid:** don't also give `night`.
- **Checkpoints only save where you can stand.** A `C` over a pit in one shift saves in the other or not at all.
- **The supervisor's side is decided at parse time,** from each freak's base `tx`; a lurker patrolling across the supervisor's column keeps its side.
- **`play()` merges a held shift into one press:** policies must alternate `shift: true/false`.
- **HUD placement:** the HUD sits on rows 0–1; the level note is low on the screen for 5 s. Keep exits and tells out from under the HUD (rows 0–1, top corners).
- **Static cache:** the static layer is cached per level × shift × prank state. Anything animated (portrait eyes, lasers, freaks, tells, checkpoints) must be drawn per frame in `drawPlay()`.
- **Headless timing:** `npm run media` uses real keys; a cold Edge start can take 30 s. Draw-cost and audio checks fail the run if exceeded.
