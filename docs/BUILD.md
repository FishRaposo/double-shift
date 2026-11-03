# Build Guide (for agents)

Everything still to build for the 21-level jam game, written so an agent can pick up any task cold. Each task card says what to build, which files to touch, how (concretely), how to prove it's done, and which docs to update. Written 2026-11-02 against the build at 12 levels and 141 tests; updated 2026-11-03 with the full-game plan (§3), the Upside Down decisions (T7) and cards T17–T25.

**At a glance**
- **What's left:**
  - foundations: levels addressed by id, cloud-ready media, doc counts sync, the shell for 6 acts and 21 levels (T17, T18);
  - a quality and identity pass over everything already built (T19–T21);
  - 9 levels;
  - 1 rule system (Upside Down);
  - 1 rendering hook (skins for doors, pillars and portraits);
  - the finale rework, with saves that ignore bests from an older revision (T22);
  - act 5 and finale cards;
  - credits;
  - a few sound hooks;
  - copy features (T23) and four stretch features (T24);
  - the demo GIF tool (T25) and the release refresh.
- **Read first:** `CLAUDE.md`, then this guide's §1 (protocol) and §2 (recipes). The specs live in [LEVELS.md](LEVELS.md) §5–5.3 and [TECH.md](TECH.md) §6.5; this guide links to them, it doesn't repeat them.
- **Order:** §3, seven milestone PRs. Each PR leaves `main` shippable.
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
- **`npm test`:** all tests, including fairness (about 10 s on 12 levels; the files run in parallel).
- **`npm run check`:** syntax plus every level parses.
- **`npm run audit`:** per-level input slack, lag tolerance, and a random search for wins below par (about 3 min on 12 levels; `npm run audit -- <id>` for one).
- **`npm run media`:** headless Edge, Chrome or Chromium plays level 1 with real keys and runs the flow checks; it also checks audio clipping and draw cost, and saves screenshots to `media/` for you to look at. In a cloud session it finds `/opt/pw-browsers/chromium` and adds `--no-sandbox` as root.
- **Review shots:** `npm run media -- --review <id,id> --gray --cvd` writes a day and a night picture of each level, plus grayscale and color-blind variants, to `media/review/`. Read them: that's the visual check for every level (§2.1 step 6).

Manual play: `npm start`, then `?level=<id>&autostart` (an id like `offset`; a 1-based position like `?level=11` also works), `?debug` for the overlay (clocks, layer, night entries). In the console, `__doubleShift` is the game object.

### 1.3 Doc sync checklist (tick what your change touches)
- **New or changed level:**
  - LEVELS.md (move the spec from §5 to §4 "Built levels", with real columns and par);
  - CONTENT.md §2 status;
  - GDD.md §8.2 ✅;
  - WRITING.md §3 ✅ (the note must match `note` in `levels.js` exactly);
  - PRODUCTION.md backlog row struck through;
  - ART.md §6.2 props row.
- **Counts:** run `npm run counts -- --write`. It rewrites every marked count (`<!-- n:tests -->`, `<!-- n:levels -->`, `<!-- n:lines:src/<file> -->`) in README.md, TECH.md, DESIGN.md, PRODUCTION.md §1, itch/page.md and the LEVELS, GDD and CONTENT At-a-glance boxes; CI fails if one drifts. The paste-ready itch description (itch/page.md §4) has no markers: fix its numbers by hand in the release refresh. Words around a count ("all four acts", tier names) still need a human.
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
6. **Look at it:** run `npm run media -- --review <id> --gray` and read the PNGs in `media/review/`. Check that no HUD text covers the exit, a tell or a freak, and that the worker, the exit, every hazard and every freak are findable in grayscale. If the level is an itch screenshot, add `['<id>', <night?>, 'NN-<id>-<shift>.png']` to the capture list in `scripts/media.mjs`.
7. **Docs:** §1.3.

### 2.2 Add or change a rule
Write the tests first in `test/rules.test.mjs`, using tiny ASCII levels: `level(day, night, extra)`, `stepN`, `place` and `play` from `test/helpers.mjs`. Then change `rules.js`, then run all levels' pars and fairness (`npm test`), then document TECH.md §3 and §6.5.

### 2.3 Add a sound or a visual
- **Sound:** add to `SOUNDS` in `src/audio.js` (each voice ≤ 0.25 s, vol ≤ 0.35; a test enforces it), expose it on `sfx`, and call it from an event in `main.js`'s `handleEvents`.
- **Visual:** procedural pixel art goes in `src/art.js` (use `px()`: art pixels are 2×2 screen pixels; colors from `PAL` and `C`). Character sprites are string grids in `src/sprites.js` (a test checks rectangles and palettes). Show every new asset in `tools/gallery.html`.

## 3. Work order

Seven milestone PRs (decided 2026-11-03). Each one passes every gate in §1.2 plus a code review before it's pushed, and each leaves `main` shippable.

| PR | Cards | Levels after | Target |
|---|---|---|---|
| 1 Foundations | T17 tooling, T18 shell + T14 credits, T1 skins + T15 sound hooks | 12 | Nov 5 |
| 2 Quality & identity | T19 quality audit, T20 readability tests, T21 identity pass + backdrops | 12 | Nov 8 (playtest round 1 plays it) |
| 3 Upside Down | T7 rule + drawing, T8 `upside`, T13 act 5 and finale cards | 13 | Nov 11 |
| 4 Tier B | T2 `stairs`, T3 `doors`, T4 `pillar`, T5 `portrait`, T6 `audit` | 18 | Nov 15 (M2) |
| 5 Act 5 + finale | T9 `fallup`, T10 `ceiling`, T11 `heels`, T12 finale rework + T22 rev saves | 21 | Nov 20 |
| 6 Copy + stretch | T23 copy features, T24 stretch features | 21 | Nov 22 |
| 7 Release | T25 GIF tool, T16 release refresh | 21 | Nov 27 (Fish submits Nov 30) |

- **Why this order:** the identity pass comes first because every later level and the flipped art build on it, and it lands before playtest round 1. Upside Down is the riskiest system, and it still lands a week before its Nov 18 gate; the 12 existing policies prove it regresses nothing.
- **The Upside Down gate:** T7 working and T8 at par by **Nov 18**. If they miss it, act 5 and the finale rework go post-jam and the game ships with today's Clock Out (the fallback is already built).
- **Content freeze:** Nov 22 for levels, copy and art. Stretch features that don't touch levels may land until Nov 26 if every gate passes; otherwise they're cut, timer first, then gamepad, rebinding and music layers.

## 4. Task cards

### T1 · Skins: doors, pillars and portraits drawn over solids *(rendering only)* · ✅ built 2026-11-03
*Built as `skinPlan` in `src/skins.js` (pure, tested in `test/skins.test.mjs`) plus `drawSkin` in `src/art.js`; a portrait hangs from its top-left cell. The gallery shows every skin before and after the pranks.*
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

### T2 · Under Renovation (`stairs`, #7, act 2, tier B) *(✅ built Nov 3, par 2; LEVELS.md §4)*
- **Spec:** LEVELS.md §5 "Under Renovation". A night staircase of 1-tile steps climbs about 6 tiles and ends in mid-air; a day ledge (unjumpable from the floor, about 6 up) starts ≤ 4 tiles past the top step and runs to the exit. Solution: night, climb, run off the top, shift to day mid-air, land on the ledge. **Target par 2.**
- **Place:** after `watch` in `LEVELS`, `act: 2`.
- **Props:** the proud sign (`sign` text `OUR STARES!` or a WRITING draft), eyes under the stairs; optional squatter on a landing (you jump over it).
- **Fairness:** act 2, so ≥ 200 ms. Give the mid-air shift a tall clear column (both shifts empty) above the ledge's start.
- **Tests:** can't win staying on day (the ledge is too high); can't win staying on night (no ledge).

### T3 · Lost & Found (`doors`, #8, act 2, tier B) · needs T1 for the look *(✅ built Nov 3, par 5; LEVELS.md §4)*
- **Spec:** LEVELS.md §5 "Lost & Found".
  - Three full-height doors D1–D3 (both shifts, `#` columns about rows 9–13 or full height) cut the floor into rooms. The exit is on a ledge about 6 up.
  - Night entry *n* steals door D*n* (the prank sets that column `.` on night) and adds one door to the pile at the ledge's foot (sets one more row of the pile `#` on night).
  - After 3 entries the pile makes the climb jumpable (each rise ≤ 3).
- **Par:** 5. The challenge is *where* to toggle: rebar by day and lasers by night leave only some spots safe in both shifts, and a lurker between D2 and D3 must be frozen at the right moment.
- **Skins:** `door` for D1–D3 (empty frame once stolen), `doorPile`. Props: `lostFoundBox`. Prank `sound: 'doorThunk'`.
- **Tests:** below 3 entries the ledge is unreachable; the prank order (D1 then D2 then D3).

### T4 · Structural Integrity (`pillar`, #10, act 3, tier B) · needs T1 for the look *(✅ built Nov 3, par 3; LEVELS.md §4)*
- **Spec:** LEVELS.md §5 "Structural Integrity".
  - A mezzanine (top about 7 up) holds the exit.
  - By day a 4-tall pillar blocks the floor route; a 3-tall day-only crate stack sits further on.
  - Night entries 1–3 move the pillar to positions P1–P3 (pranks clear the old cells, set the new ones). At P2 it stands between the crate and the mezzanine: crate (3) → pillar top (4) → mezzanine (7).
  - Solution: plan which clock-in is which, so you're on the crate in day when entry 2 fires, then jump and shift mid-air onto the pillar.
- **Par:** ≈ 4. Tells at P1–P3 are all visible from the spawn.
- **Skins:** `pillar` at each position (only the solid one draws), `drawCrack` where it was. Prank `sound: 'pillarScrape'`.

### T5 · Employee of the Month (`portrait`, #13, act 4, tier B) · needs T1 for the look *(✅ built Nov 3, par 3; LEVELS.md §4)*
- **Spec:** LEVELS.md §5 "Employee of the Month".
  - At night a 2×3 portrait (solid) hangs in front of the exit doorway.
  - By day the exit is clear, but the day route ends at an unclimbable ledge (5+).
  - Each night entry rehangs it (prank: clear old cells, set new ones). On entry 2 it hangs low beside the ledge as a step.
  - Solution: step on it at night, walk above the exit, shift to day, drop in.
- **Par:** 3–4.
- **Skins:** `portrait` at each position (drawn per frame, eyes blink). Props: `plaque`, a nail mark (a small `px` or a new prop).
- **Place:** first level of act 4 (`act: 4`), before `daywalker`.

### T6 · Night Audit (`audit`, #16, act 4, tier B) *(✅ built Nov 3, par 5; LEVELS.md §4)*
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

### T7 · The Upside Down rule (SYS-16) · the tier-C gate, due Nov 18 *(✅ rules, drawing and `upside` built Nov 3)*
- **Spec:** TECH.md §6.5 "Upside Down" and LEVELS.md §5.2. The level field `upsideDown: true`: by day the map as drawn; **at night the same map flipped top to bottom, with gravity pointing up**. Author the day grid only.
- **Rules (`src/rules.js`):**
  1. **Parse:** in `parseLevel`, if `def.upsideDown`, generate `night[y] = day[H-1-y]` (`generateNight` builds both the offset and the flipped night). Strip `S`/`E`/`C` from the copy, then apply `nightPatch`. Throw if combined with `night` or `offset`. Keep `upsideDown` on the parsed level.
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
  7. **Checkpoints:** a new exported `standableSpot(level, layer, tx, ty, ov)` replaces the inline `standable()` check; `step()` and the fairness test both use it.
  8. **Shift:** the transaction is unchanged (S-08). Velocity is kept in screen space, so a rise becomes a fall the other way.

  Decided 2026-11-03 (the principle: flipping the map and gravity together is the day map seen upside down, so every rule is the day rule mirrored):
  9. **Grid edges:** on a flipped layer `ty < 0` is open and `ty >= h` is solid (the day's ceiling and open floor, turned over). Falling out the top is a `fall` death when `p.y + playerH < -60`.
  10. **Spawn and respawn:** `spawnPoint(tx, ty, sign)` is exported; with sign −1 the worker hangs under the cell above (`y = ty * TILE`). Spawn, checkpoint saves and respawn use the sign of the layer they save in.
  11. **Nudge:** a blocked shift tries its ≤ 4 px nudge against the target layer's gravity first.
  12. **Coyote time:** a shift that changes the gravity sign clears coyote time (unless you're grounded after it) and `rising`, so there's no mid-air jump right after a flip. Same-sign shifts are unchanged, so §13.7 case 10 still holds in normal levels.
  13. **Authoring:** night pranks, tells, freaks and props use night screen coordinates. Every prop in an upside-down level names its `layer`; props take an optional `flip: true` for things stuck to the ceiling.
- **Tests first** (`test/rules.test.mjs`):
  - the generated night equals a hand-flipped grid;
  - S/E/C aren't copied; `nightPatch` applies after the flip; validation throws;
  - gravity sign per layer; at night you fall up and land on the flipped floor (`grounded` true under a solid);
  - a jump at night goes down; the variable-jump cut at night;
  - a mid-air shift reverses the fall and keeps `vx` and `vy`;
  - a grounded shift whose flipped geometry would embed you is refused;
  - the hazard hitbox is flipped at night;
  - a hanging freak box at night, frozen by day;
  - a checkpoint is standable under flipped gravity, and the respawn hangs grounded, not embedded;
  - the nudge tries against the new gravity first;
  - a flipping shift clears coyote time; a same-sign shift keeps it;
  - falling out the top at night is a fall death;
  - a determinism replay, and the no-embedding fuzz on a flipped level;
  - every existing test still passes (non-flipped levels must not change at all), and `npm run audit` prints the same windows and pars for every existing level before and after.
- **Drawing (`main.js`, `art.js`, `sprites.js`):**
  - `drawSprite` gets a `vflip` option. A pure `spriteRect(name, frame, x, y, { vflip, scale })` in `sprites.js` keeps the hitbox rows on the same screen rectangle when flipped (each sprite records its hitbox `box`: worker [9,13], freaks [10,11]); a test checks it. The worker draws with `vflip` when the gravity sign is −1, and `workerFrame(p, t, fx, sign)` treats "rising" as moving against gravity.
  - Night freaks in upside-down levels draw with `vflip` (`freakBoxes` returns `hang: true`), as do their frozen outlines by day; the ducked-in peeker slot mirrors too.
  - `drawLaser`, `drawHazardEcho`, `drawCheckpoint` and `drawExit` get a mirrored option for flipped tiles.
  - Tells (`drawTells`) hang under the solid at night; dust, the spook gag and the land puff use the feet side.
  - The HUD, notes and signs stay upright.
- **Sound:** add `flip` to `SOUNDS` (sine sweep down, about 300 → 120 Hz, 0.12 s, vol 0.12) and play it with the shift sound in upside-down levels (`handleEvents` `case 'shift'`).
- **Gallery:** add a flipped worker, a hanging freak and a flipped laser.
- **Done when:** all the tests pass and a throwaway test level (not shipped) plays correctly in the browser. Then do T8.

### T8 · Mind Your Head (`upside`, #17, act 5) · needs T7 · prove by Nov 18 *(✅ built Nov 3, par 2; LEVELS.md §4)*
- **Spec:** LEVELS.md §5.2 "Mind Your Head" and its design rules. At night the building is upside down: you fall up and walk along what was the ceiling.
  - First beat: the floor route is blocked by day while the ceiling route is clear; clock in, fall up, cross, clock out, drop past the obstacle.
  - Second beat: the reverse.
  - The first shift happens in open space with nothing to hit; a checkpoint before the first real use.
- **Par:** 2–3. `upsideDown: true`, `act: 5`.
- **Design rule** (LEVELS.md §5.2): at night, being at screen row *y* is like being at row *17-y* in the day map. A shift moves you to your mirror height, so put shift spots where both the day position and its mirror are clear.
- **Solution policy:** gravity-aware. When airborne, read `s.player.vy` with the sign, and when to shift by position.
- **Then:** T13 (act 5 card) can land.

### T9 · Falling Up (`fallup`, #18) · T10 · Ceiling Walker (`ceiling`, #19) · T11 · Head Over Heels (`heels`, #20) · need T7, after T8 *(✅ all three built Nov 3, par 4, 4 and 7; LEVELS.md §4)*
- **Specs:** LEVELS.md §5.2. Pars: 4–6, 4–6 and 6–8. All `upsideDown: true`, `act: 5`, in this order after `upside`.
- **Falling Up:** a tall shaft with ledges on alternating sides at unjumpable heights; flip mid-fall to "fall" onto the opposite side. One beat uses a flip as a brake over a pit. Space the ledges against the jump (≈ 93.5 px) and give every flip ≥ 100 ms; check with the audit.
- **Ceiling Walker:** a lurker on the night ceiling route (hanging box from T7); by day it's an upside-down outline above you. Then a telegraphed plank prank on the flipped map, with tells hanging under solids.
- **Head Over Heels:** a day-walker on the floor by day and a lurker on the ceiling by night. Every shift freezes one, wakes the other and flips gravity. It ends on a prank. Checkpoints between beats.
- **Tests:** each lesson is required, e.g. Ceiling Walker: staying on night under the lurker gets you spooked.

### T12 · Finale rework (`clockout`, #21) · needs T7–T11 · fallback stays *(✅ built Nov 3, par 7; LEVELS.md §4)*
- **Spec:** LEVELS.md §5.3. One screen, `upsideDown: true`, four rooms recalling the acts:
  1. mid-air stones;
  2. a frozen-lurker tunnel plus a telegraphed prank;
  3. a wax stop under a supervisor;
  4. a flipped climb to the time clock, where they take the last step and put it back.

  Checkpoint at every room; fairness ≥ 100 ms.
- **Keep the fallback one line away:** move today's Clock Out block into `src/levels.js` as an exported `CLOCKOUT_CLASSIC` (not in `LEVELS`), keep its policy as `SOLUTIONS_EXTRA.clockoutClassic`, and keep a test that it still wins at par 7. Shipping the fallback is then swapping one array entry.
- **Ending:** unchanged (the end screen's eyes and wave already exist).
- **Order:** last in `LEVELS`. Give it `act: 6` with `ACTS[6] = 'Finale'` (see T13) so level select shows it on its own row.
- **Saves:** the rework keeps the id `clockout` and gets `rev: 2`, so bests saved on the classic version are ignored (T22).

### T13 · Act 5 and finale cards *(small; after T8; ✅ built Nov 3)*
- `src/levels.js`: `ACTS[5] = 'Upside Down'` and `ACTS[6] = 'Finale'`.
- `src/copy.js`: `ACT_LINES[5] = 'The night shift turned the building over.'` and `ACT_LINES[6] = 'One more shift.'`.
- `src/main.js` `drawAct()`: for `FINALE_ACT` (6), the small line reads FINALE and the big line is the level's name (CLOCK OUT), then "One more shift.".
- Level select rows come from acts, so act 6 gets its own row; the 6-row layout is T18's. The finale is always open in level select, like every act start (Fish, 2026-11-03).
- Tests: `test/save.test.mjs` already checks that acts never go backwards and every act has a name. The font test checks every printed character has a glyph.
- Check the act card and level select screenshots.

### T14 · Credits *(any time)*
- WRITING.md §8: "Designed by Vinícius Raposo. Built with AI assistance (Claude). Made for GitHub Game Off 2026." No design-partner line (Fish, 2026-11-03: the art is all code-drawn).
- `CREDITS` lives in `src/copy.js`; the end screen draws it under the per-act totals (T18). The font test scans `copy.js`, so the `í` glyph is required. Mark WRITING §8 ✅ and CONTENT TXT-7.

### T15 · Sound hooks *(after T1)* · ✅ built 2026-11-03
- **`doorThunk` / `pillarScrape`:** via the prank `sound` field (T1).
- **`peekerBoing`:** in `main.js`, compare each peeker's `active` with the previous frame (cosmetic, so `main` is fine); on false→true while it's on screen and on its shift, play it.
- **`lurkerStep`:** stays unwired (decided 2026-11-03): a constant tick under the music clutters the mix. AUDIO.md says so.
- Update AUDIO.md §4 and §4.1 status.

### T16 · Release refresh *(after each batch, and last)*
1. `npm run media`. Add the new levels to its capture list and pick the itch screenshots; the first one should show a prank or the flip.
2. Refresh `tools/cover.html` only if act 5 ships (an upside-down hint is a strong hook).
3. Update the counts: itch/page.md (description "What's in this build", screenshot order, test count), README status line, DESIGN.md.
4. `npm run zip`, and test the zip in an iframe (RELEASE.md §5 first-60-seconds check).
5. `docs/PLAYTEST.md` round 2 on the full run.

### T17 · Tooling: levels by id, cloud-ready media, doc counts *(PR 1)*
- **Levels by id:** `levelIndex(defs, param)` in `src/layout.js` (an id → its index; an integer N → N−1, clamped; anything else → 0). `?level=offset` and `?level=11` both work. `scripts/media.mjs` addresses every shot by id, so inserting a level never breaks a capture.
- **Media flags:** `--review a,b` writes a day and a night PNG per level into `media/review/` (night is set directly, for review only); `--gray` and `--cvd` add grayscale and color-blind variants (deuteranopia, protanopia, tritanopia); `--root <dir>` smoke-tests an unzipped build. It finds `/opt/pw-browsers/chromium` and adds `--no-sandbox` when run as root (cloud sessions).
- **Counts:** numbers that track the code are wrapped `<!-- n:KEY -->N<!-- /n -->` (keys `tests`, `levels`, `lines:src/<file>`). `npm run counts` checks them (it runs the suite) and `npm run counts -- --write` rewrites them; CI runs the check. Dated history sentences stay unmarked.

### T18 · Shell for 6 acts and 21 levels *(PR 1)*
- **Pure layout:** `src/layout.js` holds the level select and end-screen math, tested in `test/layout.test.mjs`: everything inside 960×(60…510), nothing overlapping, every level name wrapped to ≤ 2 lines inside its card.
- **Level select:** one row per act with a 90-px act tab on the left (ACT n at scale 2 and the act name at scale 1, or FINALE); four 196×56 cards per row, 10-px gaps, 66-px row pitch, starting at y 64. Each card shows the level number at scale 3, the name at scale 1 (wrapped, `wrapText` in `font.js`) and a status stamp or lock. A detail bar at y 470–506 gives the selected level's full name, BEST and PAR at scale 2.
- **End screen:** one row per act (clock-ins / par over the levels played), the grand total, then the credits (T14).
- **Saves:** a test proves that inserting levels keeps cleared levels open and the unlock chain intact.

### T19 · Quality audit of everything built *(PR 2)*
- A code review at high effort over `src/`, `scripts/` and `test/`, then a simplification pass on `src/`. A behavior bug gets a failing test before its fix; judgment calls go to Fish in the PR.
- A docs pass: every value and claim checked against the code (known: TECH.md pointed `SOLUTIONS` at the wrong file; AGENTS.md cited a script that doesn't exist).
- An audio pass: any peak ≥ 0.8 in `__audioCheck` is fixed or justified in AUDIO.md §5. Fish listens on headphones and laptop speakers.

### T20 · Readability as tests *(PR 2)*
- `test/palette.test.mjs` turns ART.md §3.1 into WCAG contrast checks (rgba composited over the sky it sits on, both sky bands): worker outline vs sky ≥ 3:1; solid edge vs sky ≥ 3:1; night solid fill vs night sky ≥ 1.4:1; HUD text vs its plate ≥ 7:1; note ink vs paper ≥ 7:1; echo vs the opposite sky ≥ 3:1; rebar vs day sky and laser vs night sky ≥ 3:1; freak eyes vs freak body ≥ 4.5:1; background windows and motifs vs sky ≤ 1.35:1 (the quiet layer).

### T21 · Visual identity pass and per-act backdrops *(PR 2)*
- **Identity** (ART.md §1): "A workplace comedy in two lights: warm paper-and-brick days, cool cyan-panel nights. Everything official is paper. The freaks are glowing eyes and lumpy silhouettes in the dark, more present every act."
- **Fixes, from the 2026-11-03 screenshot review of every screen and level** (✅ built Nov 3; ART.md §3, §3.1, §5, §6, §7):
  - text on paper strips and plates instead of halos over textures;
  - hatching only on the 1-tile rim of "only in this shift" regions, and none in levels with a generated night (offset, upside down), whose echoes carry the cue;
  - quieter night windows: two of the six lit, at the old warm `0.12` (a brighter `0.22` pane broke the quiet-layer rule), the rest nearly black;
  - eyes at twice the size with a soft glow, and freaks plus the subtitle on the title screen;
  - the EXIT sign moves beside the door when it would leave the screen;
  - barrier tape sags between two stanchions and never spans a gap at floor height;
  - the checkpoint becomes a punch-clock box on a post;
  - each freak kind gets its own silhouette inside today's frames (lurker low and wide, peeker tall with gripping hands, squatter on its hoard, supervisor with clipboard and visor, day-walker in an orange hard hat and shades, never the worker's yellow), hitboxes unchanged; `test/art.test.mjs` checks that every pair differs by ≥ 12 art px and every silhouette fills ≥ 75 % of its hitbox;
  - the ending's freak peeks and waves a real hand;
  - a scaling check at 1366×768 and 1920×1080: a fractional scale stretches some pixels to 3 device px and others to 2, so the canvas snaps to a whole number of device pixels per canvas pixel (counting `devicePixelRatio`) unless that wastes more than 15 % of the window (`canvasScale` in `src/layout.js`).
- **Per-act backdrops** (✅ built Nov 3; ART.md §2, §6): `drawBackground(..., act)` draws one quiet motif per act: act 1 scaffolding and tarps; act 2 office windows with blinds and a wall clock; act 3 warehouse shelving and pipes; act 4 fluorescent strips by day, emergency lights and EXIT glow by night; act 5 hanging lamps, inverted at night; the finale a dawn tint by day and a low moon by night.
- **Review:** `npm run media -- --review <ids> --gray --cvd` for every level, checked against the identity checklist in LEVELS.md §6. Before/after pairs go in the PR.

### T22 · Saves ignore bests from an older level revision *(PR 5, with T12; ✅ built Nov 3)*
- A level may carry `rev: N` (default 1). Bests are saved with their rev; `best(id, rev)` ignores a best from another rev; `cleared()` ignores revs, so unlocks never change. The reworked finale has `rev: 2`.

### T23 · Copy features *(PR 6)*
- **Sticky Keys memo** on the title screen: "WE PRES SHIFT 5 TIMES. FOR FUN." on a sticky note above the practical line (draft for Fish).
- **Tell texts:** a prank's tell can carry `text` (default MINE); variants from WRITING.md §5.
- **Notice-board memos:** a `memo` prop in every level; its text shows on a paper panel (scale 2, ≤ 360 px wide, y ≥ 60, clamped) while the worker is within 2 tiles. Copy from WRITING.md §6.1.

### T24 · Stretch features *(PR 6; approved by Fish 2026-11-03)*
- **Per-act music layers** *(✅ built Nov 3; AUDIO.md §3.1)*: `layersFor(act)` = pulse from act 2, a second lead from act 3, faster organ stabs from act 4, the melody inverted (`2·MELODY[0] − n`) from act 5; the finale plays every layer.
- **Rebindable controls** *(✅ built Nov 3)*: `src/keys.js` (`DEFAULT_BINDS`, reserved keys, `rebind`, `cleanBinds`, `keyLabel`); a CONTROLS screen under SETTINGS; title and tutorial text built from the bindings. Taking another action's only key swaps, never unbinds.
- **Gamepad** *(✅ built Nov 3)*: `src/pad.js` turns the standard mapping into edge-triggered key codes (A jump; B, X or RB shift; Start pause; Back restart; d-pad or stick with 0.5/0.3 hysteresis). Fixed mapping.
- **Speedrun timer** *(✅ built Nov 3)*: a TIMER setting (SPEEDRUN TIMER); the HUD shows the level time and the end screen the run total.
- **Cut order if late:** timer, then gamepad, then rebinding, then music layers.

### T25 · Demo GIF tool *(✅ built Nov 3)*
- `npm run gif -- <id>` writes `media/demo-<id>.gif` at 480×270 (`--full`: 960×540, `demo-<id>-full.gif`), the same bytes every time: the page imports the level's scripted policy from `test/solutions.mjs` and runs it through the game's own `advance()` and `render()` on a fixed clock, one frame per 1/25 s. It stops 1.5 s after the timecard comes up or at `--seconds` (8), loops forever, and keeps under 3 MB (else 20 fps, then 6 s). Measured: `upside` 0.09 MB, `doors` 0.50 MB (`--full` 1.12 MB).
- Checks: the page's run matches the tests' (shifts, deaths, time), and Chromium's decoder reads every frame back as encoded. The dependency-free encoder (`scripts/gif-encode.mjs`) is tested in `test/gif.test.mjs` against a reference GIF reader. The browser helper is shared with `media.mjs` (`scripts/cdp.mjs`).

## 5. Known gotchas
- **Offset and Upside Down levels generate their night grid:** don't also give `night`.
- **Checkpoints only save where you can stand.** A `C` over a pit in one shift saves in the other or not at all.
- **The supervisor's side is decided at parse time,** from each freak's base `tx`; a lurker patrolling across the supervisor's column keeps its side.
- **`play()` merges a held shift into one press:** policies must alternate `shift: true/false`.
- **HUD placement:** the HUD sits on rows 0–1; the level note is low on the screen for 5 s. Keep exits and tells out from under the HUD (rows 0–1, top corners).
- **Static cache:** the static layer is cached per level × shift × prank state. Anything animated (portrait eyes, lasers, freaks, tells, checkpoints) must be drawn per frame in `drawPlay()`.
- **Headless timing:** `npm run media` uses real keys; a cold Edge start can take 30 s. Draw-cost and audio checks fail the run if exceeded.
