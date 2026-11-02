# Level Design Guide

Companion to [GDD.md](GDD.md) §6 and §8. Tile = 30 px. Levels are 32×18 tiles (one 960×540 screen).

**At a glance**
- Jumpable rise: **≤ 3 tiles**. Gaps: **≤ 4** comfortable, **≥ 7** impossible (use 8 for "must shift"). Leave **≥ 1 tile** to shift in (§1).
- A level is two ASCII grids (day, night) plus optional pranks, freaks and decor (§2).
- 12 built (§4), 4 tier-B levels planned (§5) and 3 Upside Down levels (§5.2): 19 levels in five acts. Jam minimum (tier A) is complete: the 6 originals + `stacked` + `clockout`.
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

**Fairness floor (Fish, 2026-11-02), enforced by `test/fairness.test.mjs`:** every shift and jump the scripted solution needs must have **≥ 200 ms** of slack in acts 1–2 and **≥ 100 ms** in acts 3–4 (one press moved earlier/later, everything else unchanged, still wins). At a full run 200 ms ≈ 1.8 tiles: leave about 2 tiles where both shifts are safe to switch in. The same tests check that no spawn or checkpoint sits in a freak's patrol and that no freak patrols over the exit.

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
  nightPatch: [{ x0, x1, y0, y1, ch }],   // optional, with offset: diffs applied to the generated night
  pranks: [{ id, onNight: 2, tell: { tx, ty }, set: [{ layer: 'night', x0, x1, y0, y1, ch }] }],
  freaks: [{ kind: 'lurker', tx, ty, range, speed }, { kind: 'peeker', tx, ty, period, duty, phase }, { kind: 'squatter', tx, ty },
           { kind: 'daywalker', tx, ty, range, speed }, { kind: 'supervisor', tx, ty, period, startFacing }],
  props:  [{ kind, tx, ty, layer?, w?, text?, style? }],   // non-collidable scenery (day/night via layer)
  decor:  [{ kind: 'eyes', tx, ty }],                      // night-only: eyes in the dark
}
```

| Char | Meaning | Layer |
|---|---|---|
| `#` | Solid | per layer |
| `^` | Hazard (bottom 45% of the tile): rebar by day, laser by night | per layer |
| `.` | Empty | |
| `S` | Spawn (exactly one) | shared |
| `E` | Exit (exactly one) | shared |
| `C` | Checkpoint (respawn here in the shift you touched it in; restores prank state) | shared |
| `~` | Wet floor: solid, low friction while grounded on it (every foot tile wet) | per layer |

Outside the grid: left/right walls and the ceiling are solid; below the grid is open (falling out is death).

**Tip:** build grids with a small script (fill rectangles, then print) rather than typing 32-char strings; widths must match exactly or `parseLevel` throws.

## 3. Design rules (from GDD §6.3, plus the freaks)

1. The intended solution uses only established mechanics.
2. Everything needed is observable: echoes show the other shift, hatching shows "only in this shift", tells show pending pranks, frozen freaks show where they'll be.
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
- **Freak evidence:** a peeker sits on a night-only crate at col 26 (so it can never touch the player) and footprints lead past the gate.

### 2. Scaffolding: par 1 (act 1)
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

### 7. Wet Floor: par 4 (act 3)
- **Lesson:** night floors are waxed — you keep sliding; the day shift gives grip back.
- **Day:** walls at col 4 and cols 15–16, and a pit (cols 19–24) that keeps the day route from skipping the lurker. **Night:** one long `~` corridor (cols 5–31) under a roof (rows 0–12, cols 8–30): lasers at cols 10–11, a lurker near the far end. Exit at col 31, past the lurker's reach.
- **Solution:** night onto the wax (the col-4 wall) → day before the lasers (dry floor: you stop) and walk past them → night again before the day wall at 15–16 → day to stop short of the lurker and walk past its outline.
- Inside the 1-tile tunnel you can't jump, and on wax steering back takes ≈ 2.4 tiles to stop (no turn-around boost, `wetAccel` 500), so the dry day floor is the brake. Checkpoints before the lasers and before the lurker.

### 8. Night Management: par 2 (act 3)
- **Lesson:** freaks only work while watched — cross on the side the supervisor isn't facing.
- **Night:** the supervisor sits on a perch mid-screen (out of reach) and turns every 2 s. A lurker patrols a 1-tile tunnel on each side; only the watched one moves. **Day:** walls at cols 11–12 and 20–21 force night for both crossings; a night wall at cols 26–27 forces day for the exit.
- **Solution:** clock into night short of the first tunnel, wait for the supervisor to face right, cross; wait in the nook (cols 14–18, checkpoint at col 16) for it to face left, cross; back to day at the night wall.

### 9. Stacked: par 5 (act 3)
- **Lesson:** several pranks are queued; each fixes one obstacle and breaks another. The puzzle is where you clock in.
- **Layout:** spawn floor cols 0–5, gap A cols 6–13, middle floor cols 14–17, a day wall at col 18 (only the night gets past), landing cols 19–22, gap B cols 23–30, the exit on col 31.
- **Pranks (all three tells visible from the spawn):** entry 1 bridges gap A but drops a night gate at col 18; entry 2 lifts the gate but takes the bridge back; entry 3 lays a plank over gap B.
- **Solution:** night on the spawn floor (bridge) → cross → day and night again on the middle floor (gate lifts, bridge goes) → past col 18 → day and night again on the landing (plank) → cross to the exit. Five clock-ins; checkpoint at col 20.
- Clock in at the wrong place (e.g. twice before gap A) and the bridge is gone before you cross: the pit resets the pranks (checkpoint rule). A test pins it.

### 10. Broad Daylight: par 5 (act 4)
- **Lesson:** day is no longer safe — one freak works the day shift — and each shift freezes the other shift's freaks.
- **Two tunnels, mirror images.** First a day tunnel under a building (cols 7–15, rows 0–12) with the day-walker in it (col 10, range 2); night gates at cols 6 and 16 let only the day shift in and out. Then `watch`'s tunnel the other way round: a building at cols 19–27 with day pillars at 19 and 27 and a lurker inside (col 22, range 2). Checkpoint at col 17 between them.
- **Solution:** day into the first tunnel → night inside (the day-walker freezes; walk through its outline) → day before the far gate → night into the second tunnel → day to freeze the lurker → night out → exit.
- Rebuilt 2026-11-02: the first version let you simply jump over the day-walker, so its mechanic was never needed. Two tests pin it now (staying on day gets you spooked; jumping can't clear it).

### 11. Floor 3.5: par 4 (act 4)
- **Lesson:** the night shift is the same building half a storey higher — shift at a jump's apex to step onto the other shift's floor.
- **Day:** a tower of ledges (floor, then ledges at +6 and +12 tiles; the top ledge runs cols 11–24 with the exit at col 22). **Night** is generated by `offset: { dx: 0, dy: -3 }` plus a laser patch where the day floor has no copy.
- **Solution:** four hops — jump and shift at the apex, alternating day/night, each time landing on a floor's copy 3 tiles up. Grounded shifts are refused (the copy would embed you), which the first floor teaches.
- The exit sits at col 22 so it can't be reached by a head-bump jump from the night ledge below (a skip of the hardest hop found in the audit).
- **Margin:** the full jump peaks at ≈ 93.5 px against the 90 px needed (plus the 4 px nudge): each apex shift has ≈ 250 ms. Any lower `jumpVelocity` breaks this level first — re-run `npm run audit` after tuning. `dy: -2` is the fallback.
- **Props:** floor signs read 3 and 3.5.

### 12. Clock Out: par 7 (act 4, the finale)
- **Lesson:** everything you know, in one run.
- **Room 1 (cols 0–14):** a pit with a 3-wide night stone (cols 5–7, row 13) and a higher day stone (cols 10–12, row 12): jump off each as you land, shifting mid-air to the one ahead.
- **Room 2 (cols 15–24):** `watch`'s tunnel under a building: day crates at cols 17 and 24 force night in and out; the lurker inside (col 20) forces a day freeze. Checkpoint at col 15.
- **Room 3 (cols 25–31):** the time clock sits on a ledge 4 tiles up (cols 28–31); the only way up is a night step at col 27. Leaving room 2 at night is clock-in 3, when they take the step (telegraphed); clock-in 4 puts it back. So clock out and in on the floor at cols 25–26, then climb. Checkpoint at col 25.
- **Ending:** the timecard, then the end screen (WRITING.md §8). Tests pin that without the fourth clock-in the time clock is out of reach.

## 5. Planned levels (specs)

Four more levels take the game to 16 in four acts (manifest: [CONTENT.md](CONTENT.md) §2). Each spec gives the lesson, a layout concept within the §1 metrics, the intended solution and a **target** par range. The real par is whatever the scripted solution in `SOLUTIONS` proves when the level is built; grids are drawn at build time. Rows are 0–17; "floor" means the usual floor with its top at row 14 (stand on row 13).

**Tiers:** A = jam minimum, B = existing systems only, C = needs a new mechanic (all four tier-C mechanics shipped in `wet`, `supervisor`, `offset` and `daywalker`). If a level is cut, the rest keep their order.

| # | Act | Level | id | Tier |
|---|---|---|---|---|
| 7 | 2 Overtime | Under Renovation | `stairs` | B |
| 8 | 2 | Lost & Found | `doors` | B |
| 10 | 3 | Structural Integrity | `pillar` | B |
| 15 | 4 | Employee of the Month | `portrait` | B |

### Under Renovation (`stairs`, slot 7): target par 2 (act 2, tier B)
- **Lesson:** height you only have on one shift can carry you into the other. A mid-air shift that starts from the top of something.
- **Fiction:** "They've built an entirely unnecessary staircase. It leads nowhere. They're very proud."
- **Night:** a staircase of 1-tile steps rising from about col 6 to a top step about 6 tiles above the floor, ending in mid-air (about col 16). Beyond it, nothing.
- **Day:** no staircase. A high ledge (top about 6 tiles above the floor, unjumpable) starts ≤ 4 tiles past the stair top and runs to the exit. At night that ledge is missing (renovation).
- **Solution:** clock into night, climb the stairs, run off the top, shift to day mid-air, land on the ledge, walk to the exit.
- **Uses:** existing tiles only. Optional squatter on a landing (jump over it) to keep act 2's freak presence.
- **Props:** a proud hand-painted sign at the stair top (WRITING.md §5), eyes under the stairs.
- **Constraints:** step rises of 1 tile; ≥ 1 tile of open air above the ledge where both shifts are clear for the mid-air shift.

### Lost & Found (`doors`, slot 8): target par 5 (act 2, tier B)
- **Lesson:** sometimes you *want* the freaks to act. Clock-ins are a resource you spend on purpose.
- **Fiction:** "The freaks have stolen every door. Not the keys. The doors."
- **Both shifts:** three full-height doors (D1–D3, around cols 9, 15 and 21) cut the floor into rooms. The exit is on a ledge about 6 tiles up at the right end.
- **Pranks:** night entry *n* steals door D*n* from the night layer **and** adds one door to the freaks' pile at the foot of the exit ledge. After 3 entries, the pile makes the climb jumpable (each rise ≤ 3).
- **Solution:** each door is passed by clocking out and back in next to it, so 3 night entries = 5 shifts. The puzzle is **where** to toggle: rebar by day and lasers by night leave a few spots where both shifts are safe, and a lurker between D2 and D3 has to be frozen at the right moment.
- **Par note:** this level inverts "fewest clock-ins": par is the shifts needed to earn 3 night entries safely, proven by the scripted solution like every other par.
- **Props:** door frames left behind (empty, non-solid), the pile, a LOST & FOUND box.

### Structural Integrity (`pillar`, slot 10): target par 4 (act 3, tier B)
- **Lesson:** one object, moved by each clock-in, is a wall in one place and a step in another. Count your night entries.
- **Fiction:** "They've moved a load-bearing pillar. The building is somehow fine."
- **Both shifts:** a mezzanine (top about 7 tiles above the floor) holds the exit.
- **Day:** the pillar (4 tiles tall, unjumpable on its own) stands where it blocks the floor route; a day-only crate stack (3 tall) sits further along.
- **Pranks (night only):** entries 1, 2 and 3 move the pillar to positions P1, P2, P3. At P2 it stands between the crate and the mezzanine, making a staircase: crate (3) → pillar top (4) → mezzanine (7).
- **Solution:** plan which clock-in is which. Pass the day pillar at night (entry 1), shift to day to use the crate, and time the next night entry so it's entry 2 when you jump from the crate and shift mid-air onto the pillar's top.
- **Props:** a ceiling crack and a dust outline where the pillar used to be; a memo about it.
- **Constraints:** tells for all three positions are visible from the start (eyes/notes at P1–P3).

### Employee of the Month (`portrait`, slot 15): target par 3–4 (act 4, tier B)
- **Lesson:** the obstacle and the tool are the same object, moved by each clock-in.
- **Fiction:** "The freaks have installed a portrait of themselves. It blocks the exit."
- **Night:** a big portrait (a solid block, about 2×3 tiles) hangs in front of the exit doorway.
- **Day:** the exit is clear, but the day route ends at a ledge you can't climb (5+ tiles).
- **Pranks:** each night entry rehangs the portrait; on entry 2 it hangs low next to the ledge, where its top is a step.
- **Solution:** use the portrait as a step at night (entry 2) to get onto the ledge, walk above the exit, shift to day and drop to the exit.
- **Props:** the portrait is just eyes (WRITING.md §6 memo), a nail where it used to hang.

## 5.1 Idea pool status

**Upside Down** (Fish, 2026-11-02) is decided and planned as act 5 (§5.2). All six ideas from Fish's first pool (2026-11-02) are slotted; `supervisor` and `offset` are built, the rest planned: *Lost & Found* → `doors`, *Under Renovation* → `stairs`, *Structural Integrity* → `pillar`, *Night Management* → `supervisor`, *Employee of the Month* → `portrait`, *Floor 3.5* → `offset`.

**Post-jam pool**

| Idea | Brief | Why post-jam |
|---|---|---|
| Freight | Loading dock; crates restack on each night entry along a fixed cycle; one arrangement connects to the exit | Prank chains are covered by `doors`, `stacked` and `pillar` |
| Scatterer | A freak that flees and knocks things over (real-time geometry change) | Breaks the "pranks only on shift" rule; needs new rules |
| Shared state | Levers and doors that keep one state across both shifts | New system; GDD §8.2 |


## 5.2 Act 5: Upside Down *(planned; decided by Fish 2026-11-02)*

**The rule:** by day you play the map as drawn. **At night you play the same map upside down:** the night grid is the day grid flipped top to bottom, and gravity points up. The worker stands under what were floors, on what were ceilings. Shifting keeps your position and momentum (S-01, S-02), so every shift is also a gravity flip.

**Why it's its own act:** it changes what "the other shift" means. In every other level the other shift is a different building; here it's the same building turned over. That needs a teach level, a mid-air level and a combination level, so three levels, then the finale.

**Designing flipped levels (rules of thumb, to verify at build):**
- A solid at day row *r* sits at night row *17 − r*. You author the **day map only**; the night is generated (like `offset`), with an optional `nightPatch` for the few tiles that differ.
- At night you rest **under** solids. Being at screen row *y* at night is like being at row *17 − y* in the day map. So a shift effectively **moves you to your mirror height** in the same room: from the day floor you're suddenly high up, falling toward the flipped floor; from up high you're suddenly near the bottom.
- That's the puzzle: places too high to reach by day are where you *are* after a shift, and the low route by day is the high route by night.
- Shift windows still apply. Shifting where the flipped geometry would embed you is refused (S-08), so good shift spots are in open air or at the mirror-clear points of a room. The fairness test (≥ 100 ms per required input in act 5) and `npm run audit` check every level as usual.
- Freaks keep their rules: night freaks live on the flipped map (hanging from the ceiling), freeze by day, and show as upside-down outlines by day.

| # | Act | Level | id | New element | Tier |
|---|---|---|---|---|---|
| 17 | 5 Upside Down | Mind Your Head | `upside` | At night you fall up: the ceiling is the floor | C |
| 18 | 5 | Falling Up | `fallup` | Shift mid-fall to reverse it; climb a shaft by flipping | C |
| 19 | 5 | Ceiling Walker | `ceiling` | A freak on the ceiling, and a prank on a flipped map | C |
| 20 | 5 | Clock Out | `clockout` (moved) | The finale closes act 5 (built; gets an optional flipped room) | A |

### Mind Your Head (`upside`, slot 17): target par 2–3 (act 5, tier C)
- **Lesson:** at night the building is upside down: you fall up, and walk along what was the ceiling.
- **Fiction:** "They flipped the night shift. Mind your head."
- **Concept:** by day the floor route is blocked (a pit too wide to jump, or a wall); the ceiling route above it is continuous. Clock in, fall up onto the flipped ceiling, walk across, clock out and drop down past the obstacle. A second beat reverses it: the ceiling route is blocked where the floor isn't.
- **Teach safely:** the first shift happens on open floor under a clear ceiling, with nothing to hit; a checkpoint before the first real use.

### Falling Up (`fallup`, slot 18): target par 4–6 (act 5, tier C)
- **Lesson:** shifting mid-fall reverses it. Chain flips to climb, or to stop a fall.
- **Fiction:** "The floor is up there now."
- **Concept:** a tall shaft with ledges on alternating sides at heights you can't jump between. Jump off a ledge, shift at the right height, and you "fall" the other way onto a ledge's flipped copy; repeat to climb (the cousin of Floor 3.5's apex shifts). One beat uses a flip as a brake over a pit.
- **Margin:** every required shift needs ≥ 100 ms (act 5 floor); tune ledge spacing against the jump (≈ 93.5 px) at build.

### Ceiling Walker (`ceiling`, slot 19): target par 4–6 (act 5, tier C)
- **Lesson:** the old tricks on the flipped map: freeze a freak, read a prank.
- **Fiction:** "Something is walking on the ceiling. It's fine."
- **Concept:** a lurker patrols the night ceiling route; by day it's an upside-down outline above you (freeze it by being on day, walk under its outline). Then a prank: on a night clock-in the freaks move a plank on the flipped map, telegraphed by tells hanging from the ceiling.

**Clock Out moves to the end of act 5** (it stays the finale). If the rule ships, it may get a short flipped room as a cameo; it must never depend on it (tier rule).

**Cut date:** the gravity flip (rules, tests, drawing) by **Nov 20**; if it misses, act 5 moves to post-jam and Clock Out stays at the end of act 4.

### Showing the freaks early (built, PRODUCTION.md L8)

Jam raters often play only the first couple of minutes (GDD §1.8), so act 1 shows freak *evidence* from the very first night shift — no pranks, no danger before level 5:
- **Clock In:** a peeker blinks behind the locked night gate (sealed off, unreachable), footprints lead up to it, eyes in the dark past it;
- **Scaffolding:** eyes float in the dark where the scaffold stands by day; footprints on the night floor;
- **Closing Time:** a peeker sealed past the far gate blinks at night and stands frozen beside the exit by day — the first freak a player walks through;
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
