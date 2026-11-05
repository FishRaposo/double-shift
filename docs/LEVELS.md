# Level Design Guide

Companion to [GDD.md](GDD.md) §6 and §8. Tile = 30 px. Levels are 32×18 tiles (one 960×540 screen).

**At a glance**
- Jumpable rise: **≤ 3 tiles**. Gaps: **≤ 4** comfortable, **≥ 7** impossible (use 8 for "must shift") (§1).
- A level is two ASCII grids (day, night) plus optional pranks, freaks and decor (§2).
- **The game is 21 levels: five acts of four plus the finale (§5.0).** <!-- n:levels -->21<!-- /n --> built (§4): tiers A and B, all of act 5 (§5.2) and the reworked finale (§5.3). Tier A (a complete game) is built.
- Leave **≥ 200 ms** of slack per required input in acts 1–2, **≥ 100 ms** in acts 3–6 (tested).
- Nothing ships without a scripted par solution in the tests and the §6 checklist.

## 1. Movement metrics (from `PARAMS`, measured 2026-11-02)

| Metric | Value | Design rule |
|---|---|---|
| Run speed | 270 px/s = **9 tiles/s** | |
| Full jump height | ≈ 93.5 px = **3.1 tiles** (measured at 120 Hz) | Rises of **≤ 3 tiles** are jumpable. Walls **≥ 4 tiles** block. |
| Tap jump height | ~20–40 px | Hold matters; don't require exact heights |
| Full-jump airtime | 0.62 s | |
| Flat jump reach at full speed | ≈ 167 px ≈ 5.6 tiles | Gaps: **≤ 4 tiles** comfortable, 5 = skill, 6 = near-impossible, **≥ 7 = impossible** (use 8 for "must shift" gaps to be safe with coyote time) |
| Coyote time | 80 ms ≈ 0.7 tile of run | Carries across a shift |
| Worker hitbox | 18 × 26 px | A **1-tile-high tunnel** (30 px) fits; jumping inside one is impossible |
| Shift buffer | 80 ms ≈ 0.7 tile of run | A shift pressed slightly early still lands |
| Shift nudge | 4 px | Overlaps of ≤ 4 px into a wall resolve automatically |
| Freak box | 20 × 22 px, sits on its tile's floor | |

**Fairness floor (Fish, 2026-11-02), enforced by `test/fairness.test.mjs`:** every shift and jump the scripted solution needs must have **≥ 200 ms** of slack in acts 1–2 and **≥ 100 ms** in acts 3–6, the finale included (one press moved earlier/later, everything else unchanged, still wins). At a full run 200 ms ≈ 1.8 tiles: leave about 2 tiles where both shifts are safe to switch in. The same tests check that no spawn or checkpoint sits in a freak's patrol and that no freak patrols over the exit.

`npm run audit` prints, per level: the slack of every required input, how much input lag the solution tolerates, and a random search for wins below par or without shifting. Run it after any level or `PARAMS` change.

**Re-verify all of this after any `PARAMS` change** (`npm test` re-proves every par).

## 2. Authoring format

```js
{
  id: 'inventory',              // used by tests (SOLUTIONS key)
  name: 'Inventory',
  note: 'Every time you clock in, something gets moved.',   // shown for 5 s at level start
  par: 3,                       // fewest shifts found; proven by test
  act: 2,                       // act number; ACTS in src/levels.js names it. First level of each act is always open in level select
  spawnLayer: 0,                // optional, default DAY
  day:   [ 18 strings of 32 chars ... ],
  night: [ ... same size ... ],
  offset: { dx, dy },          // optional, REPLACES night: night grid = day grid moved (dx,dy) tiles
  upsideDown: true,            // optional, REPLACES night: night grid = day grid turned over, gravity up at night (§5.2)
  nightPatch: [{ x0, x1, y0, y1, ch }],   // optional, with offset or upsideDown: diffs applied to the generated night
  pranks: [{ id, onNight: 2, every: 2, tell: { tx, ty, text: 'MINE NOW' }, set: [{ layer: 'night', x0, x1, y0, y1, ch }], sound: 'doorThunk' }],  // every, text and sound optional
  skins:  [{ kind: 'door', tx, ty, h? }, { kind: 'pillar', tx, ty, h? }, { kind: 'portrait', tx, ty, w?, h? }, { kind: 'doorPile', tx, ty, h? }],  // a pile is 2 wide, at most h (3) high
          // object art over solid tiles, optional layer: 'day'|'night'. Doors and pillars stand on (tx, ty), a portrait
          // hangs from its top-left (tx, ty), the pile's bottom row is ty. The art follows the tiles (src/skins.js).
  freaks: [{ kind: 'lurker', tx, ty, range, speed }, { kind: 'peeker', tx, ty, period, duty, phase }, { kind: 'squatter', tx, ty },
           { kind: 'daywalker', tx, ty, range, speed }, { kind: 'supervisor', tx, ty, period, startFacing }],
  props:  [{ kind, tx, ty, layer?, w?, text?, style?, flip? }],   // non-collidable scenery (day/night via layer);
          // flip: true hangs it upside down inside its cell. In an upsideDown level every prop names its layer and
          // night props (except signs) take flip (a test checks)
  decor:  [{ kind: 'eyes', tx, ty }],                      // night-only: eyes in the dark
}
```

| Char | Meaning | Layer |
|---|---|---|
| `#` | Solid | per layer |
| `^` | Hazard (bottom 45% of the tile, the top 45% on a flipped night): rebar by day, laser by night | per layer |
| `.` | Empty | |
| `S` | Spawn (exactly one) | shared |
| `E` | Exit (exactly one) | shared |
| `C` | Checkpoint (respawn here in the shift you touched it in; restores prank state) | shared |
| `~` | Wet floor: solid, low friction while grounded on it (every foot tile wet) | per layer |

Outside the grid: left/right walls and the ceiling are solid; below the grid is open (falling out is death). On a flipped night (`upsideDown`) it's the other way up: above the grid is open (falling out the top is death) and below it is solid.

**Tip:** build grids with a small script (fill rectangles, then print) rather than typing 32-char strings; widths must match exactly or `parseLevel` throws.

## 3. Design rules (from GDD §6.3, plus the freaks)

1. The intended solution uses only established mechanics.
2. Everything needed is observable and labelled: the art shows the idea, and text names it (work order on the HUD, tags on the tool, the broken thing and what it drives). A level must make sense with its text hidden (`npm run media -- --notext`), but readability comes first, so the text stays in the game.
   Everything needed is observable: echoes show the other shift, hatching shows "only in this shift", tells show pending pranks with a countdown and outlined tiles, tracks show patrols, frozen freaks show where they'll be.
3. Every failure has a visible cause.
4. No reliance on unpredictable physics.
5. Shifting must matter (the test "cannot win without shifting" enforces this).
6. **Pranks are always telegraphed** (a `tell` for every prank) and never create a softlock (checkpoint restore guarantees this; still playtest it).
7. **Freaks never chase.** They patrol, peek or sit.
8. Teach one new thing per level, in a safe space first, then test it.
9. One screen: the whole puzzle is readable at a glance.

## 4. Built levels

### 1. Clock In: par 2 (act 1)
- **Lesson:** Shift changes the world; you'll need to go both ways.
- **Day:** floor with an 8-tile gap (cols 12–19). **Night:** continuous floor, but a full-height gate at col 24.
- **Solution:** shift to night before the gap, cross, shift back to day before the gate, exit.
- **Tutorial prompt** shows until the first shift. Barrier tape and a RENOVATION note dress the shaft.
- **Freak evidence:** a peeker sits on a night-only stack at col 26, five tiles tall (so it can never touch the player) and footprints lead past the gate.

### 2. Scaffolding: par 3 (act 1)
- **Lesson:** use the other shift's geometry to get past a block.
- **Both:** raised block (cols 16–31 from row 8). **Day only:** scaffolding steps (row 12 cols 6–9, row 10 cols 11–13) and a full-height delivery stack on the ledge (cols 23–24).
- **Solution:** climb the day scaffolding, shift to night to pass the deliveries.
- The first step is 4 tiles wide (was 3): from a full run the jump onto it has ≈ 400 ms of slack.

### 3. Closing Time: par 2 (act 1)
- **Lesson:** hazards and walls are per-shift; you choose which shift you're in, section by section.
- **Night:** gate col 9, lasers cols 21–25, gate col 27. **Day:** rebar cols 12–17, delivery wall col 18.
- **Solution:** day past the col-9 gate → night over the rebar and past col 18 → day over the lasers and past col 27.
- Each hazard starts two tiles after the wall before it, so each ground shift has ≈ 1.4 tiles (≈ 250 ms at a run). Before the 2026-11-02 audit it was 0.4 tile, passable only thanks to the shift buffer.
- **First frozen freak:** a peeker at col 28 (between the night gate and the exit). By day you walk through its outline on the way out.

### 4. Mid-Air: par 3 (act 1)
- **Lesson:** shift during a jump.
- **Both:** start ledge (cols 0–5), end ledge (cols 27–31), pit between. **Night:** platforms cols 9–11 and 21–23 (row 13). **Day:** platform cols 15–17 (row 12) with a checkpoint.
- **Solution:** jump, shift to night mid-air, land; jump, shift to day, land; jump, shift to night, land; run to the exit.
- **Decor:** two pairs of eyes blink in the dark on the night shift.
- The checkpoint at (16,11) used to save you at night if you passed it mid-air there, with no floor under it — an endless respawn into the pit. Checkpoints now save only in a shift with floor under them (TECH.md §3.2).

### 5. Inventory: par 3 (act 2)
- **Lesson:** every clock-in changes the night (first prank).
- **Both:** floors cols 0–6, 15–19, 28–31; pits cols 7–14 and 20–27 (both 8 wide, unjumpable). **Night:** a plank over the first pit.
- **Prank `plank`** on night entry 2: the plank moves to the second pit. **Tell** above the second pit (eyes at night, MINE note by day).
- **Solution:** night across pit 1 → day on the middle floor → night again (plank has moved) across pit 2.

### 6. Night Watch: par 4 (act 2)
- **Lesson:** freaks freeze when you go to day; three freak types.
- **Both:** floor, and a building mass (cols 6–19) with a one-tile tunnel on row 13. **Day:** crates seal both tunnel mouths (cols 6–8, 17–19); rebar cols 21–25. **Night:** a low roof (row 12, cols 20–29) continues the tunnel over the peeker and squatter.
- **Freaks (night):** lurker in the tunnel (col 11, range 3, 55 px/s), peeker at col 23 (1.6 s cycle, out 50%), squatter at col 29.
- **Solution:** night into the tunnel → day to walk past the frozen lurker → night out of the tunnel and past the day rebar, timing the peeker → day around the squatter.
- The night roof closes a 3-clock-in skip (jumping the peeker and the squatter at night); a test pins it.

### 7. Under Renovation: par 2 (act 2, built Nov 3)
- **Lesson:** height you only have on one shift can carry you into the other: a mid-air shift that starts from the top of something.
- **Day:** a floor and, from col 25, a tower whose top (row 9) is 5 tiles up: out of reach, and it blocks the floor. The exit stands on it at col 31.
- **Night:** no tower (renovation). The freaks' staircase rises in 1-tile steps, 4 wide (the top one 5), from col 3 to the top step at cols 19–23, level with the tower top. Then nothing.
- **Solution:** clock into night at the spawn, hop up the stairs (one jump per riser), jump off the end of the top step toward the tower, clock out mid-air and land on it, walk to the exit.
- **Why it holds:** the exit is 7 tiles past the top step, beyond a night jump (≈ 6.2 tiles to that height), so night alone never wins (a test pins it); by day there are no stairs.
- **Margin:** every hop has ≈ 400 ms (the steps were widened from 3 to 4 after the first audit, where chained hops had 100–167 ms); the mid-air clock-out ≈ 625 ms; input lag up to 150 ms still wins.
- **Props:** the freaks' proud sign OUR STARES! over the top step (night), eyes under the stairs (night decor), a notice board and barrier tape (day).

### 8. Lost & Found: par 5 (act 2, built Nov 3)
- **Lesson:** sometimes you *want* the freaks to act: clock-ins are a resource you spend on purpose.
- **Both shifts:** three doors, 4 tiles tall (cols 4, 15 and 24, skinned as doors), cut the floor into rooms; the exit ledge (cols 28–31) is 6 up.
- **Pranks:** night entry *n* steals door D*n* from the night (its frame stays) and lays it on the freaks' pile at the ledge's foot (cols 26–27, night only, a `doorPile` skin). Three doors make two 3-tile rises; with two the ledge is still out of reach (a test pins it). Every prank thunks (`doorThunk`); all three tells show from the spawn.
- **Where to clock:** one entry per room. Room 1: anywhere. Room 2 has lasers by night (cols 8–9) and rebar by day (13–14): clock out before the lasers, back in before the rebar. Room 3's lurker (col 20, range 1) works nights: clock out as you come in, back in past it. Low beams (rows 9–12, their tops out of reach) hang over the hazards and the lurker, so nothing can be jumped: spending all five clock-ins at the spawn meets the lasers at night (a test pins it; the PR 4 review found that route winning before the beams). A checkpoint at the door of room 3 saves at night with two doors gone.
- **Solution:** the five clock-ins above, then climb the pile at night: jump against its side, then against the ledge.
- **Par:** 5 is the minimum: three night entries take five clock-ins from day, and nothing else reaches the ledge (the audit's random search finds no win below it). It inverts "fewest clock-ins" as planned.
- **Margin:** clock-ins 275–525 ms, jumps 358–375 ms, input lag up to 150 ms still wins.
- **Props:** a notice board (day), the LOST & FOUND box, a vent (night); the stolen doors leave frames.

### 9. Wet Floor: par 4 (act 3)
- **Lesson:** night floors are waxed — you keep sliding; the day shift gives grip back.
- **Day:** walls at col 4 and cols 15–16, and a pit (cols 19–24) that keeps the day route from skipping the lurker. **Night:** one long `~` corridor (cols 5–31) under a roof (rows 0–12, cols 8–30): lasers at cols 10–11, a lurker near the far end. Exit at col 31, past the lurker's reach.
- **Solution:** night onto the wax (the col-4 wall) → day before the lasers (dry floor: you stop) and walk past them → night again before the day wall at 15–16 → day to stop short of the lurker and walk past its outline.
- Inside the 1-tile tunnel you can't jump, and on wax steering back takes ≈ 2.4 tiles to stop (no turn-around boost, `wetAccel` 500), so the dry day floor is the brake. Checkpoints before the lasers and before the lurker.

### 10. Structural Integrity: par 3 (act 3, built Nov 3)
- **Lesson:** one object, moved by each clock-in, is a wall in one place and a step in another. Count your night entries.
- **Both shifts:** the pillar (4 tall, skinned) at P0 (col 6), and the mezzanine (cols 21–31, top 7 up) with the exit. **Day only:** a crate stack, 3 tall (cols 17–18).
- **Pranks (night only, `pillarScrape`):** entry 1 moves the night pillar to P1 (col 11, a wall on the night floor), entry 2 to P2 (col 20, against the mezzanine: crate 3 → pillar top 4 → mezzanine 7), entry 3 to P3 (col 13, out of the way). The day pillar stays at P0. A crack marks only the places it stood (`skinPlan` now leaves a slot bare until the pillar has been there). All three tells show from the spawn.
- **Solution:** clock in to pass P0, out to pass P1, climb the crate by day, jump off its far end and clock in mid-air: that's entry 2, and the pillar lands under you. From its top, jump against the mezzanine.
- **Par:** 3, the minimum (the spec said about 4; nothing shorter wins and nothing longer was needed). One entry too many and the pillar is on P3 when you jump (a test pins it). It keeps going round (P1, P2, P3, for good: the lap repeats however many clock-ins), so an extra clock-in costs a lap, never a stuck run: there's nothing here to die on, so no checkpoint restore would rescue it. (Until the PR 5 review it stopped after three laps; Codex's review of the PR caught that a 9th clock-in left it on P3 for good.)
- **Margin:** clock-ins 567–600 ms, jumps 183–333 ms, input lag up to 150 ms still wins.
- **Props:** a notice board and a LOAD BEARING sign on the day pillar, a pallet by the crates (day).

### 11. Night Management: par 2 (act 3)
- **Lesson:** freaks only work while watched — cross on the side the supervisor isn't facing.
- **Night:** the supervisor sits on a perch mid-screen (out of reach) and turns every 2 s. A lurker patrols a 1-tile tunnel on each side; only the watched one moves. **Day:** walls at cols 11–12 and 20–21 force night for both crossings; a night wall at cols 26–27 forces day for the exit.
- **Solution:** clock into night short of the first tunnel, wait for the supervisor to face right, cross; wait in the nook (cols 14–18, checkpoint at col 16) for it to face left, cross; back to day at the night wall.

### 12. Stacked: par 5 (act 3)
- **The gate (Nov 5):** the drop on entry 1 is its own prank with its own tell at col 18, so the outline and the countdown there agree; when it has fired, the same tell counts down to the gate lifting.
- **Lesson:** several pranks are queued; each fixes one obstacle and breaks another. The puzzle is where you clock in.
- **Layout:** spawn floor cols 0–5, gap A cols 6–13, middle floor cols 14–17, a day wall at col 18 (only the night gets past), landing cols 19–22, gap B cols 23–30, the exit on col 31.
- **Pranks (all three tells visible from the spawn):** entry 1 bridges gap A but drops a night gate at col 18; entry 2 lifts the gate but takes the bridge back; entry 3 lays a plank over gap B.
- **Solution:** night on the spawn floor (bridge) → cross → day and night again on the middle floor (gate lifts, bridge goes) → past col 18 → day and night again on the landing (plank) → cross to the exit. Five clock-ins; checkpoint at col 20.
- Clock in at the wrong place (e.g. twice before gap A) and the bridge is gone before you cross: the pit resets the pranks (checkpoint rule). A test pins it.

### 13. Employee of the Month: par 4 (act 4, redesigned Nov 5 around its repair: the portrait fills the doorway on both shifts, undo the bracket and it drops flat)
- **Lesson:** the obstacle and the tool are the same object, moved by each clock-in.
- **Both shifts:** a ledge 5 up (cols 19–24) blocks the floor; past it, the exit sits in a doorway under a lintel (row 11, cols 28–31), open only from the left at floor level.
- **Night:** their portrait (3×2, solid, a `portrait` skin: just eyes) hangs in the doorway (cols 26–28), sealing it. Each entry rehangs it: high on the wall (P1), low against the ledge (P2, entry 2), back in the doorway (P3 = P0), and round again for good, so a clock-in too many costs a lap instead of a stuck run. A nail and an unfaded patch mark each spot (new `PROPS.nail`), seen when it isn't there.
- **Solution:** in, out, in at the start (entry 2), then at night jump onto the portrait (2 up) and onto the ledge (3 more), drop off the far side: on entry 2 the doorway is clear too, so walk in.
- **Par:** 3. The spec's route also clocked out on the ledge to drop by day; that works (4) but isn't needed, because the portrait that sealed the doorway is the step by then. Tests pin both halves: the exit can't be entered at night while the portrait hangs, and on entries 1 and 3 the ledge is out of reach.
- **Margin:** clock-ins 583–950 ms, jumps 233–708 ms, input lag up to 150 ms still wins.
- **Props:** the EMPLOYEE OF THE MONTH plaque and a notice board (day), the nails (night).

### 14. Broad Daylight: par 5 (act 4)
- **Lesson:** day is no longer safe — one freak works the day shift — and each shift freezes the other shift's freaks.
- **Two tunnels, mirror images.** First a day tunnel under a building (cols 7–15, rows 0–12) with the day-walker in it (col 10, range 2); night gates at cols 6 and 16 let only the day shift in and out. Then `watch`'s tunnel the other way round: a building at cols 19–27 with day pillars at 19 and 27 and a lurker inside (col 22, range 2). Checkpoint at col 17 between them.
- **Solution:** day into the first tunnel → night inside (the day-walker freezes; walk through its outline) → day before the far gate → night into the second tunnel → day to freeze the lurker → night out → exit.
- Rebuilt 2026-11-02: the first version let you simply jump over the day-walker, so its mechanic was never needed. Two tests pin it now (staying on day gets you spooked; jumping can't clear it).

### 15. Floor 3.5: par 4 (act 4)
- **Lesson:** the night shift is the same building half a storey higher — shift at a jump's apex to step onto the other shift's floor.
- **Day:** a tower of ledges (floor, then ledges at +6 and +12 tiles; the top ledge runs cols 11–24 with the exit at col 22). **Night** is generated by `offset: { dx: 0, dy: -3 }` plus a laser patch where the day floor has no copy.
- **Solution:** four hops — jump and shift at the apex, alternating day/night, each time landing on a floor's copy 3 tiles up. Grounded shifts are refused (the copy would embed you), which the first floor teaches.
- The exit sits at col 22 so it can't be reached by a head-bump jump from the night ledge below (a skip of the hardest hop found in the audit).
- **Margin:** the full jump peaks at ≈ 93.5 px against the 90 px needed (plus the 4 px nudge): each apex shift has ≈ 250 ms. Any lower `jumpVelocity` breaks this level first — re-run `npm run audit` after tuning. `dy: -2` is the fallback.
- **Props:** floor signs read 3 and 3.5.

### 16. Night Audit: par 5 (act 4, built Nov 3)
- **Freaks (Nov 5):** a peeker works the second tunnel and a squatter sits past the plank, both answering to the clipboard, so the exam uses every freak in the game so far.
- **Lesson:** acts 1–4 on one screen, no new rules: the exam before the building turns over.
- **Every beat is a 1-tile tunnel under a 4-thick roof** (its top 5 up): nothing can be jumped or walked over. (The first build had 1-row roofs, 2 up; the audit's random search walked across their tops and won in 2.) A checkpoint after each beat.
- **Beat 1 (wax):** a day wall (col 3) sends you in at night; under the roof, rebar by day (cols 4–5) keeps you on the night's wax, which won't let you stop before the laser (col 9): clock out on the dry stretch (cols 6–8).
- **Beat 2 (the supervisor):** the block (cols 12–18) is solid by day; at night a tunnel runs through it with a lurker each side of the supervisor on its roof. Wait at each mouth until that side slacks, then go through. The supervisor manages every night freak in the level, the far lurker included.
- **Beat 3 (act 4):** the day-walker (col 21) is frozen while you're on night. Past its reach, stop, clock out and back in: that's entry 3, when they lay the plank over the last pit (cols 25–26, under the roof; the tell sits just before the roof, in view from the spawn). Across it, the lurker at col 29 works nights, but it answers to the clipboard too: clock out, or wait until the supervisor looks left.
- **Par:** 5 (below the 6–8 target): waiting out the clipboard past the far lurker saves the last clock-out (the PR 4 review found it; it's a fair act-3 answer, so par follows it). Lessons pinned, one test each: night through the wax slides into the laser even if you let go; crossing a watched tunnel spooks; day past the day-walker spooks; night past the far lurker spooks while it works; the last pit on entry 2 is a fall, and on entry 3 the plank is there (the real route, played).
- **Margin:** clock-ins 158–458 ms; input lag up to 100 ms still wins (the policy waits at each tunnel mouth and at the far lurker for the clipboard with 0.75 s to spare, and stops early before the pit).
- **Props:** an INSPECTION sign and a notice board (day), a mop bucket and a WET FLOOR sign by the wax (night).

### 17. Mind Your Head: par 2 (act 5, built Nov 3)
- **Lesson:** at night the building is upside down: you fall up, and walk along what was the ceiling (`upsideDown: true`; the night is generated, §5.2).
- **Day:** a floor with an 8-tile pit (cols 10–17, too far to jump); a walkway high above it (row 6, cols 6–25) with a wall standing on it at col 24 (rows 2–5); a beam over the exit (row 3, cols 28–31); a shelf at (20, 13) under the checkpoint. **Night** is that map turned over: the walkway is at row 11, three rows above the worker's head on the floor, the wall hangs under it (rows 12–15), and the exit hangs from the beam's copy.
- **Solution:** clock in under the walkway (cols 6–9) and fall up onto it; walk across the pit hanging from it; past the pit, clock out and drop to the floor; exit. The wall is deeper than a night jump (93.5 px against 120 px), so staying on night never gets past it.
- **Teach safely:** the first clock-in is on open floor with a clear mirror; flipping too early lands you on the night ceiling (the floor's copy), where the pit is a hole: clock out and try again.
- **Checkpoint** at (20, 12): it hangs from the walkway at night and sits on the shelf by day, so it saves on either shift.
- **Margin:** both clock-ins have ≈ 990 ms; input lag up to 150 ms still wins (`npm run audit`).
- **Props:** a MIND YOUR HEAD sign (day), a notice board (day), and a coffee mug stuck upside down under the walkway (night, `flip`).

### 18. Falling Up: par 4 (act 5, built Nov 3)
- **Lesson:** shifting mid-fall turns the fall round; at night the floor is up there.
- **Day:** the floor, a high ledge (row 6, cols 12–17, 8 up) with a wall under its end, a bottomless pit (cols 18–27, 10 wide) and the exit on the far floor. **Night** is that map turned over (`upsideDown`), plus a `nightPatch`: lasers along the underside of the high ledge's copy, and the exit's cell walled up.
- **Solution:** clock in anywhere on the left and fall up to the ceiling (the floor's copy); walk over the high ledge and clock out: you drop onto it. Run off its end into the pit and clock in mid-fall (the brake): the fall turns round, and you rise across the pit to hang under the far ceiling. Clock out and drop to the exit.
- **Why it holds** (each found by the audit's random search, then closed): the pit is 10 wide, because at 8 a running jump off the high ledge reached the far floor; the lasers stop a 2-clock-in route that hung under the ledge's low night copy and clocked out over the pit; the exit is shut at night, because the brake's rise swept through its cell; and the wall's night copy runs on down to the grid's edge (col 17, rows 13–17), because the PR 5 review's full-audit run found a 2-clock-in brake from the floor: clock in falling at the wall's foot, pass under it on the night side, rise into the pit, clock out going up and arc onto the far floor (pinned by `Falling Up: no brake from the floor`). Now the pit is only reached from above.
- **Margin:** clock-ins 333–917 ms (the brake ≈ 333 ms), input lag up to 150 ms still wins.
- **Props:** a THIS WAY UP sign and a notice board (day), a vent stuck to the ceiling where you hang (night, `flip`).

### 19. Ceiling Walker: par 4 (act 5, built Nov 3)
- **Lesson:** the old tricks on the flipped map: freeze a freak, read a prank.
- **Day:** three floors split by two 8-tile pits (A: cols 5–12, B: cols 22–29), the exit on the last floor (cols 30–31); a walkway high above them (row 6) with gaps over both pits, and a column hanging from the top (rows 0–4, cols 15–18). **Night** is that map turned over (`upsideDown`): the walkway is at row 11, one step above the worker's head, and the column stands up from the bottom edge, leaving a 1-tile tunnel under the walkway at cols 15–18. A `nightPatch` lays their plank over the walkway's gap above pit A and bricks up the exit's floor (cols 30–31, rows 13–17).
- **Rehearsing the finale (Nov 5):** the walkway's copy is waxed at cols 13–14, just before the tunnel, and a supervisor hangs over it (col 18, row 4), so the lurker slacks whenever it looks away. A day wall (col 29) closes the exit's pocket, so the only way in is hanging from the plank on entry 2.
- **The plank** (`relocations`, from the second clock-in on): entry 2 moves it over pit B, entry 3 back over pit A, and so on, for good. The day tell (MINE) marks pit B; at night the eyes hang under it.
- **Solution (4):** clock in on the spawn floor and fall up onto the walkway; cross pit A hanging from it (the plank's there on entry 1). A lurker hangs in the tunnel: clock out before it and drop to the floor, walk under its outline, clock in past the column (entry 2: the plank's over pit B now) and cross. The exit is bricked up at night: clock out over it and drop in.
- **Why it holds:** both pits and both walkway gaps are 8 wide (a night jump reaches 5.6 tiles, like a day one). The tunnel's column runs to the grid's bottom edge, solid at night, because in the first draft a night jump went under a 1-row tunnel floor and past the lurker. The exit's cell sits under the night hang, so its floor is walled at night. Arriving at pit B on entry 3 finds the plank back over pit A: clock out and in again.
- **Checkpoint** at (19, 13), past the column on the day floor: day-only (nothing to hang from at night), so at night it's drawn upright on the floor's echo (`checkpointHangs`, `src/skins.js`).
- **Margin:** clock-ins 433–708 ms; input lag up to 150 ms still wins (`npm run audit`).
- **Props:** an IT'S FINE sign and a notice board (day), footprints on the walkway's copy before the tunnel (night, `flip`; not on the plank, which moves), eyes in the dark over pit A.

### 20. Head Over Heels: par 7 (act 5, built Nov 3)
- **Lesson:** act 5's combination: every shift freezes one freak, wakes the other, and flips gravity.
- **Day:** a loop on two corridors. The floor (rows 14–17) is the bottom corridor's floor, the walkway (row 5) the top one's. A block (cols 13–19) is solid but for one slot through each corridor (rows 4 and 13). Bottom: the spawn floor (cols 10–12), the slot, a pit (cols 20–27, 8 wide) and the far floor (cols 28–31). Top: the far walkway (cols 20–30) with a gap at col 31, the slot, the walkway at cols 10–12, a last gap with no floor and no walkway (cols 2–9, 8 wide) and the exit on a walkway stub (cols 0–1). **Night** is that map turned over (`upsideDown`): you hang under the walkway's copy along the bottom and under the floor's copy along the top, 4 px from where you stood, so a shift flips you in place; the slots map onto each other. A `nightPatch` lays their plank over the pit's copy (row 3, cols 20–27).
- **The freaks:** each slot holds a day-walker and a lurker, one awake per shift (bottom: the day-walker at col 13, the lurker at 18; top: the reverse). In a 1-tile slot nothing is jumped: you pass the frozen one's outline and must not clock in or out on top of the one that's about to wake.
- **The plank** (`relocations` from the 4th clock-in): over the last gap on entry 4, back over the pit's copy on 5, and so on, for good. Day tell MINE over the gap; at night the eyes hang under it.
- **Solution (7):** clock in before the bottom day-walker; out before the lurker; in again past it (entry 2) and cross the pit hanging; at the walkway's gap you fall up the shaft to the top. Clock out onto the walkway and walk back over the pit; in before the top day-walker (3), out before its lurker, then in on the walkway at cols 10–12: the 4th clock-in brings the plank over the last gap, and you cross it hanging to the exit.
- **Why par holds:** a wall (col 9) cuts the spawn off from the last gap and a low day roof stops a jump clearing the walkway's copy, so the top corridor is only reached round the loop. The exit is only reachable at night over the plank, which first covers the last gap on the 4th clock-in, so every route clocks in 4 times from a day start: 7 shifts. Staying on night along the top under their plank skips a clock-out and in, and then the 4th clock-in hasn't happened at the gap: clock out and in once more.
- **Checkpoints** at (29, 4) after the shaft and (11, 4) before the last gap, both standable in both shifts.
- **Margin:** clock-ins 367–842 ms; input lag up to 150 ms still wins (`npm run audit`).
- **Props:** a HARD HAT AREA sign and a notice board (day), a hard hat stuck to the ceiling (night, `flip`, `PROPS.hardHat`), eyes in the dark over the last gap.

### 21. Clock Out: par 7 (the finale, reworked Nov 3 as `rev: 2`; §5.3)
- **One of every freak (Nov 5):** a peeker in room 1 (wait, hanging, until the clipboard looks away), a squatter in room 2, a lurker in room 3, the day-walker in room 4, and the supervisor perched at col 23, row 4, under the floor's copy. A vent with eyes in it pays off the note. It asks nothing act 5 hasn't rehearsed (wax and a clipboard on a flipped map: Ceiling Walker).
- **Lesson:** everything you know, in one run, one room per act, on the flipped map.
- **Map:** `upsideDown`; the walkway (row 5) is the night's ceiling one step above the floor, so a shift flips you in place, as in Ceiling Walker. The night's walls are drawn in the day grid's top rows so they mirror into the night's bottom ones (the gate, the door, both tunnels' floors, room 2's far wall); by day they stand on the walkway and close it off, because a mid-jump clock-in at the spawn could otherwise reach the walkway's top and walk it past every room (found by the audit's random search, then closed).
- **Room 1 (act 1, cols 0–11):** no ceiling over the spawn: walk off the ledge and clock in as you fall, and the walkway's copy catches you; cross the 7-wide gap hanging; clock out before the gate, locked at night.
- **Room 2 (act 2, cols 12–21):** a day wall (col 15); the door they take on the 2nd clock-in (col 16, telegraphed; Lost & Found's door skin, then its empty frame); a lurker in the tunnel; the far wall (col 21) is night-only, so clock out before the lurker and walk through its frozen outline. Checkpoint at col 13.
- **Room 3 (act 3, cols 22–26):** stop on the dry floor (checkpoint, col 22) and clock in; the supervisor watches one tunnel at a time, and its clock only runs at night, so wait there, hanging, until the clipboard turns away from this tunnel, then slide over the waxed ceiling past its lurker before it turns back.
- **Room 4 (acts 4–5, cols 27–31):** the 3rd clock-in took the step at the top of the shaft and walled up the time clock (telegraphed, and the tell stays up until the 4th puts them back): clock out on the dry floor short of the day-walker, in again (the 4th puts both back), and fall up the shaft to the time clock. Checkpoint at col 27. By day the time clock sits in a pocket, so a clock-out mid-rise can't reach it either.
- **Margin:** clock-ins 250–617 ms; no win below par in the two-way audit.
- **Ending:** the timecard, then the end screen (WRITING.md §8).
- **The classic version** stays in `src/levels.js` as `CLOCKOUT_CLASSIC` (not in `LEVELS`), proven at par 7 by `SOLUTIONS_EXTRA.clockoutClassic`. Bringing it back would also need a memo and new room tests. Its rooms: a pit with a night stone and a higher day stone (mid-air shifts); `watch`'s tunnel with day crates and a lurker; the time clock on a ledge whose night step they take on clock-in 3 and return on 4.

## 5.0 The 21-level sequence (20 levels + finale; Fish, 2026-11-02)

Five acts of four, then the finale. Each act introduces one idea, practises it, and ends on a level that combines it with what came before. The game starts almost normal and grows into the full Upside Down levels. `#` is the position in the finished game; the build numbers levels by their position in `src/levels.js`.

| # | Act | Level (id) | Introduces / practises | Status |
|---|---|---|---|---|
| 1 | **1 · Renovation** (it's just a job) | Clock In (`clock`) | Shift changes the world | ✅ |
| 2 | 1 | Scaffolding (`scaff`) | Use the other shift's geometry | ✅ |
| 3 | 1 | Closing Time (`closing`) | Per-shift hazards and walls; first frozen outline (harmless) | ✅ |
| 4 | 1 | Mid-Air (`midair`) | Shift during a jump; eyes in the dark | ✅ |
| 5 | **2 · Overtime** (the freaks show up) | Inventory (`inventory`) | **First prank**: a clock-in changes the night | ✅ |
| 6 | 2 | Night Watch (`watch`) | **First visible freaks**: lurker, peeker, squatter; day freezes them | ✅ |
| 7 | 2 | Under Renovation (`stairs`) | Height from one shift carries into the other | ✅ |
| 8 | 2 | Lost & Found (`doors`) | **Wanted pranks**; act 2's combination (pranks + a lurker) | ✅ |
| 9 | **3 · Graveyard Shift** (they get organized) | Wet Floor (`wet`) | **Wet floor**: slide at night, grip by day | ✅ |
| 10 | 3 | Structural Integrity (`pillar`) | One object moved each clock-in: wall, then step | ✅ |
| 11 | 3 | Night Management (`supervisor`) | **Supervisor**: watched freaks work, the rest slack | ✅ |
| 12 | 3 | Stacked (`stacked`) | Several queued pranks; act 3's combination | ✅ |
| 13 | **4 · Lights Out** (the rules bend) | Employee of the Month (`portrait`) | The obstacle is the tool | ✅ |
| 14 | 4 | Broad Daylight (`daywalker`) | **Day-walker**: each shift freezes the other's freaks | ✅ |
| 15 | 4 | Floor 3.5 (`offset`) | **Offset layer**: night is the building moved; apex shifts | ✅ |
| 16 | 4 | Night Audit (`audit`) | Acts 1–4 exam on one screen; no new rules | ✅ |
| 17 | **5 · Upside Down** (the building turns over) | Mind Your Head (`upside`) | **Upside Down**: at night the map is flipped and gravity points up | ✅ |
| 18 | 5 | Falling Up (`fallup`) | Mid-fall flips; climb by flipping | ✅ |
| 19 | 5 | Ceiling Walker (`ceiling`) | A freak on the ceiling; a prank on the flipped map | ✅ |
| 20 | 5 | Head Over Heels (`heels`) | Act 5's combination: every shift freezes one freak and flips gravity | ✅ |
| 21 | **Finale** | Clock Out (`clockout`) | Pays everything off, then the ending | ✅ reworked (`rev: 2`); the 3-room version is the fallback |

**Freak and mechanic ladder** (first seen → first required):
- **Freak evidence:** eyes and footprints in act 1, a harmless frozen peeker in Closing Time.
- **Pranks:** single in 5, wanted in 8, moving an object in 10, queued in 12.
- **Visible freaks:** lurker, peeker and squatter in 6; the supervisor in 11; the day-walker in 14; a freak on the ceiling in 19.
- **New rules, one per act from act 3:** wax in 9, offset in 15, upside down in 17.
- **Act 4 previews act 5:** Floor 3.5 already says "the building isn't where it was", so the flip in 17 is the next step, not a jump.

**Tiers** (how it was planned; all shipped): A = the original 12, B = 17 on existing systems, C = 21 with act 5 and the finale rework.

## 5. Original specs (all built; §4 is the truth)

The specs the levels in acts 2–4 were built from, in the §5.0 order (manifest: [CONTENT.md](CONTENT.md) §2). Each spec gives the lesson, a layout concept within the §1 metrics, the intended solution and a **target** par range. The real par is whatever the scripted solution in `SOLUTIONS` proves when the level is built; grids are drawn at build time. Rows are 0–17; "floor" means the usual floor with its top at row 14 (stand on row 13).

**Tiers:** A = jam minimum, B = existing systems only, C = needed a new mechanic.

| # | Act | Level | id | Tier |
|---|---|---|---|---|
| 7 | 2 Overtime | Under Renovation | `stairs` | B |
| 8 | 2 | Lost & Found | `doors` | B |
| 10 | 3 | Structural Integrity | `pillar` | B |
| 13 | 4 | Employee of the Month | `portrait` | B |
| 16 | 4 | Night Audit | `audit` | B |

### Under Renovation (`stairs`, #7): target par 2 (act 2, tier B) ✅ built Nov 3 at par 2 (§4)
- **Lesson:** height you only have on one shift can carry you into the other. A mid-air shift that starts from the top of something.
- **Fiction:** "They've built an entirely unnecessary staircase. It leads nowhere. They're very proud."
- **Night:** a staircase of 1-tile steps rising from about col 6 to a top step about 6 tiles above the floor, ending in mid-air (about col 16). Beyond it, nothing.
- **Day:** no staircase. A high ledge (top about 6 tiles above the floor, unjumpable) starts ≤ 4 tiles past the stair top and runs to the exit. At night that ledge is missing (renovation).
- **Solution:** clock into night, climb the stairs, run off the top, shift to day mid-air, land on the ledge, walk to the exit.
- **Uses:** existing tiles only. Optional squatter on a landing (jump over it) to keep act 2's freak presence.
- **Props:** a proud hand-painted sign at the stair top (WRITING.md §5), eyes under the stairs.
- **Constraints:** step rises of 1 tile; ≥ 1 tile of open air above the ledge where both shifts are clear for the mid-air shift.

### Lost & Found (`doors`, #8): target par 5 (act 2, tier B) ✅ built Nov 3 at par 5 (§4)
- **Lesson:** sometimes you *want* the freaks to act. Clock-ins are a resource you spend on purpose.
- **Fiction:** "The freaks have stolen every door. Not the keys. The doors."
- **Both shifts:** three full-height doors (D1–D3, around cols 9, 15 and 21) cut the floor into rooms. The exit is on a ledge about 6 tiles up at the right end.
- **Pranks:** night entry *n* steals door D*n* from the night layer **and** adds one door to the freaks' pile at the foot of the exit ledge. After 3 entries, the pile makes the climb jumpable (each rise ≤ 3).
- **Solution:** each door is passed by clocking out and back in next to it, so 3 night entries = 5 shifts. The puzzle is **where** to toggle: rebar by day and lasers by night leave a few spots where both shifts are safe, and a lurker between D2 and D3 has to be frozen at the right moment.
- **Par note:** this level inverts "fewest clock-ins": par is the shifts needed to earn 3 night entries safely, proven by the scripted solution like every other par.
- **Props:** door frames left behind (empty, non-solid), the pile, a LOST & FOUND box.

### Structural Integrity (`pillar`, #10): target par 4 (act 3, tier B) ✅ built Nov 3 at par 3 (§4)
- **Lesson:** one object, moved by each clock-in, is a wall in one place and a step in another. Count your night entries.
- **Fiction:** "They've moved a load-bearing pillar. The building is somehow fine."
- **Both shifts:** a mezzanine (top about 7 tiles above the floor) holds the exit.
- **Day:** the pillar (4 tiles tall, unjumpable on its own) stands where it blocks the floor route; a day-only crate stack (3 tall) sits further along.
- **Pranks (night only):** entries 1, 2 and 3 move the pillar to positions P1, P2, P3. At P2 it stands between the crate and the mezzanine, making a staircase: crate (3) → pillar top (4) → mezzanine (7).
- **Solution:** plan which clock-in is which. Pass the day pillar at night (entry 1), shift to day to use the crate, and time the next night entry so it's entry 2 when you jump from the crate and shift mid-air onto the pillar's top.
- **Props:** a ceiling crack and a dust outline where the pillar used to be; a memo about it.
- **Constraints:** tells for all three positions are visible from the start (eyes/notes at P1–P3).

### Employee of the Month (`portrait`, #13): target par 3–4 (act 4, tier B) ✅ built Nov 3 at par 3 (§4)
- **Lesson:** the obstacle and the tool are the same object, moved by each clock-in.
- **Fiction:** "The freaks have installed a portrait of themselves. It blocks the exit."
- **Night:** a big portrait (a solid block, about 2×3 tiles) hangs in front of the exit doorway.
- **Day:** the exit is clear, but the day route ends at a ledge you can't climb (5+ tiles).
- **Pranks:** each night entry rehangs the portrait; on entry 2 it hangs low next to the ledge, where its top is a step.
- **Solution:** use the portrait as a step at night (entry 2) to get onto the ledge, walk above the exit, shift to day and drop to the exit.
- **Props:** the portrait is just eyes (WRITING.md §6 memo), a nail where it used to hang.

### Night Audit (`audit`, #16): target par 6–8 (act 4, tier B) ✅ built Nov 3 at par 5 (§4)
- **Lesson:** everything from acts 1–4 on one screen, no new rules. It's the "you've learned it all" exam before the building turns over.
- **Fiction:** "Management is doing a walkthrough tonight. So are they."
- **Beats** (left to right, a checkpoint between each):
  1. a waxed night corridor with a dry day stop before a hazard (act 3);
  2. a supervisor watching two short tunnels: cross on the slack side (act 3);
  3. a day-walker stretch you pass by going night, then a night lurker you pass by going day (act 4).
- **Glue:** one telegraphed prank (act 2), visible from the spawn: a plank that appears over the last pit on the night entry the beats naturally lead to. Count your clock-ins so it's there when you arrive.
- **Uses:** existing systems only. Every required input ≥ 100 ms (act 4 floor).

## 5.1 Idea pool status

**Upside Down** (Fish, 2026-11-02) shipped as act 5 (§5.2). All six ideas from Fish's first pool (2026-11-02) are built: *Lost & Found* → `doors`, *Under Renovation* → `stairs`, *Structural Integrity* → `pillar`, *Night Management* → `supervisor`, *Employee of the Month* → `portrait`, *Floor 3.5* → `offset`.

**Post-jam pool**

| Idea | Brief | Why post-jam |
|---|---|---|
| Freight | Loading dock; crates restack on each night entry along a fixed cycle; one arrangement connects to the exit | Prank chains are covered by `doors`, `stacked` and `pillar` |
| Scatterer | A freak that flees and knocks things over (real-time geometry change) | Breaks the "pranks only on shift" rule; needs new rules |
| Shared state | Levers and doors that keep one state across both shifts | New system; GDD §8.2 |


## 5.2 Act 5: Upside Down *(✅ built Nov 3; decided by Fish 2026-11-02)*

**The rule:** by day you play the map as drawn. **At night you play the same map upside down:** the night grid is the day grid flipped top to bottom, and gravity points up. The worker stands under what were floors, on what were ceilings. Shifting keeps your position and momentum (S-01, S-02), so every shift is also a gravity flip.

**Why it's its own act:** it changes what "the other shift" means. In every other level the other shift is a different building; here it's the same building turned over. That needs a teach level, a mid-air level, a freak-and-prank level and a combination level: four levels, then the finale (#21).

**Designing flipped levels (rules of thumb, to verify at build):**
- A solid at day row *r* sits at night row *17 − r*. You author the **day map only**; the night is generated (like `offset`), with an optional `nightPatch` for the few tiles that differ.
- At night you rest **under** solids. Being at screen row *y* at night is like being at row *17 − y* in the day map. So a shift effectively **moves you to your mirror height** in the same room: from the day floor you're suddenly high up, falling toward the flipped floor; from up high you're suddenly near the bottom.
- That's the puzzle: places too high to reach by day are where you *are* after a shift, and the low route by day is the high route by night.
- Shift windows still apply. Shifting where the flipped geometry would embed you is refused (S-08), so good shift spots are in open air or at the mirror-clear points of a room. The fairness test (≥ 100 ms per required input in act 5) and `npm run audit` check every level as usual.
- Freaks keep their rules: night freaks live on the flipped map (hanging from the ceiling), freeze by day, and show as upside-down outlines by day.

| # | Act | Level | id | New element | Tier |
|---|---|---|---|---|---|
| 17 | 5 Upside Down | Mind Your Head | `upside` | At night you fall up: the ceiling is the floor | C |
| 18 | 5 | Falling Up | `fallup` | Shift mid-fall to reverse it; climb by flipping | C |
| 19 | 5 | Ceiling Walker | `ceiling` | A freak on the ceiling, and a prank on a flipped map | C |
| 20 | 5 | Head Over Heels | `heels` | Act 5's combination: every shift freezes one freak and flips gravity | C |

### Mind Your Head (`upside`, #17): target par 2–3 (act 5, tier C) ✅ built Nov 3 at par 2 (§4)
- **Lesson:** at night the building is upside down: you fall up, and walk along what was the ceiling.
- **Fiction:** "They flipped the night shift. Mind your head."
- **Concept:** by day the floor route is blocked (a pit too wide to jump, or a wall); the ceiling route above it is continuous. Clock in, fall up onto the flipped ceiling, walk across, clock out and drop down past the obstacle. A second beat reverses it: the ceiling route is blocked where the floor isn't.
- **Teach safely:** the first shift happens on open floor under a clear ceiling, with nothing to hit; a checkpoint before the first real use.

### Falling Up (`fallup`, #18): target par 4–6 (act 5, tier C) ✅ built Nov 3 at par 4 (§4)
- **Lesson:** shifting mid-fall reverses it. Chain flips to climb, or to stop a fall.
- **Fiction:** "The floor is up there now."
- **Concept:** a tall shaft with ledges on alternating sides at heights you can't jump between. Jump off a ledge, shift at the right height, and you "fall" the other way onto a ledge's flipped copy; repeat to climb (the cousin of Floor 3.5's apex shifts). One beat uses a flip as a brake over a pit.
- **Margin:** every required shift needs ≥ 100 ms (act 5 floor); tune ledge spacing against the jump (≈ 93.5 px) at build.

### Ceiling Walker (`ceiling`, #19): target par 4–6 (act 5, tier C) ✅ built Nov 3 at par 4 (§4)
- **Lesson:** the old tricks on the flipped map: freeze a freak, read a prank.
- **Fiction:** "Something is walking on the ceiling. It's fine."
- **Concept:** a lurker patrols the night ceiling route; by day it's an upside-down outline above you (freeze it by being on day, walk under its outline). Then a prank: on a night clock-in the freaks move a plank on the flipped map, telegraphed by tells hanging from the ceiling.

### Head Over Heels (`heels`, #20): target par 6–8 (act 5, tier C) ✅ built Nov 3 at par 7 (§4)
- **Lesson:** act 5's combination: every shift freezes one freak, wakes the other, and flips gravity.
- **Fiction:** "Up is a matter of opinion now."
- **Concept:** `upsideDown: true`. A day-walker patrols the floor by day; a lurker walks the flipped ceiling by night. Each shift both flips you to the other side of the room and swaps which freak is moving, so you route through the moments when the one on your side is frozen. It ends on a prank: a plank moved on the flipped map, telegraphed by a tell hanging from the ceiling.
- **Role:** the hardest level before the finale. Fairness floor 100 ms per required input; checkpoints between beats.



## 5.3 The finale: Clock Out reworked *(✅ built Nov 3 at par 7, `rev: 2`, §4)*

The classic 3-room Clock Out (`CLOCKOUT_CLASSIC`) is kept for the record. The rework makes the finale pay off every act:
- **One screen, `upsideDown: true`, four rooms**, each recalling an act:
  1. mid-air shifts across stones (act 1); built as a clock-in mid-fall off the ledge, then the gap and the gate. Stones don't work on a flipped map: a day jump rises away from the night's ceiling and a night jump drops away from the day's floor, so a mid-air shift can't carry you onto a stone of the other shift;
  2. a frozen-lurker tunnel and a telegraphed prank (act 2);
  3. a wax stop under a supervisor's gaze (act 3);
  4. a flipped climb to the time clock, where the freaks take the last step and put it back (acts 4–5).
- **Fiction:** "Almost done. Don't look at the vents." (kept). Act card: FINALE · CLOCK OUT · "One more shift."
- **Ending:** the timecard, then the eyes-and-wave ending that's already built.
- Grids at build time, with the fairness floor (≥ 100 ms), a checkpoint at every room, and par proven by test.

### Showing the freaks early (built, PRODUCTION.md L8)

Jam raters often play only the first couple of minutes (GDD §1.8), so act 1 shows freak *evidence* from the very first night shift — no pranks, no danger before level 5:
- **Clock In:** a peeker blinks behind the locked night gate (sealed off, unreachable), footprints lead up to it, eyes in the dark past it;
- **Scaffolding:** eyes float in the dark where the scaffold stands by day; footprints on the night floor;
- **Closing Time:** a peeker on a high night shelf over the exit blinks at night and hangs frozen there by day, out of reach;
- **Mid-Air:** eyes decor was already there ("Something up there blinked.");
- level select from the title screen (A7), so anyone can reach *Inventory* and *Night Watch*.

## 6. Level checklist (every level, before it ships)

- [ ] Grids are 32×18, parse cleanly (`npm run check`).
- [ ] A scripted solution in `test/solutions.mjs` wins at ≤ par with no deaths.
- [ ] It can't be won without shifting.
- [ ] Par is the fewest shifts *you* can find; try to beat it by hand once.
- [ ] Every prank has a tell; every freak is visible or telegraphed before it can spook.
- [ ] Every checkpoint has floor under it in at least one shift (it saves only in a shift that does).
- [ ] `npm test` fairness tests pass (≥ 200 / 100 ms per required input; no respawn in a patrol; no freak over the exit), and `npm run audit` finds no win below par.
- [ ] The note line (5 s, shown low on the screen) is in WRITING.md and fits on one line at scale 2 (14 px tall).
- [ ] Played once by Fish; played cold by one tester (PLAYTEST.md).
- [ ] No unintended shortcut that skips the level's lesson (shortcuts that need skill are allowed: GDD §8.6).
