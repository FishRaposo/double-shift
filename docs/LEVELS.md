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

## 4. The levels (rebuilt around what repairs do, Nov 5)

Every level is built on one rule: **the repair is the level's puzzle, not its lock.** The types and the freaks' roles are in the GDD (§4.10, §4.11). `test/levels.test.mjs` enforces the shape: every job is needed, the first repair lands within 70% of the scripted run, at least one shift and one jump follow it (a flipped level's falling counts), and each type does what it says. Those tests stop the old shape coming back; they can't prove a level is fun.

| # | Level (id) | Par | Repair | Freaks | The puzzle |
|---|---|---|---|---|---|
| 1 | Clock In (`clock`) | 3 | Build | None | Cross on the night boards, fix the deck, and climb it to the top floor |
| 2 | Scaffolding (`scaff`) | 4 | Build | None | The deck and the wall beside it are the day crew's: jump off the deck and clock in mid-air |
| 3 | Closing Time (`closing`) | 2 | Power | Peeker | One fuse: fit it in the shutter box, pull it from the far side, fit it in the laser box |
| 4 | Mid-Air (`midair`) | 3 | Water | None | Climb out mid-air; the valve floods where you came from and drains where you are going |
| 5 | Inventory (`inventory`) | 3 | Secure | Prank | Bolt the far plank before the second night |
| 6 | Night Watch (`watch`) | 4 | Light | Lurker, squatter | The bulb is on a lurker's beat; the light clears the corridor past it |
| 7 | Under Renovation (`stairs`) | 5 | Machine | Lurker | The hoist moves a stop per clock-in, wherever you are: be there when it comes |
| 8 | Lost & Found (`doors`) | 6 | Secure | Pranks, lurker | The doors swap every night: bolt them when they are where you want them |
| 9 | Wet Floor (`wet`) | 4 | Water | Lurker | Fetch the wrench from the lurker's corridor, turn the leak onto it, and ride the wax out above |
| 10 | Structural Integrity (`pillar`) | 5 | Secure | Repeating prank | The jack only bites with the pillar under the beam, and it has to stay for the next clock-in |
| 11 | Night Management (`supervisor`) | 2 | Power | Supervisor, lurkers | Two tunnels, one each side of the clipboard, and the fuse goes through with you |
| 12 | Stacked (`stacked`) | 3 | Secure | Three pranks | Three things are scheduled and there is one bolt: read them and choose |
| 13 | Employee of the Month (`portrait`) | 4 | Light | Squatter | By day the portrait fills the doorway, by night its sitter does; the spotlight clears it |
| 14 | Broad Daylight (`daywalker`) | 5 | Machine | Day-walker, lurker | A beat on each shift in the tunnel, and every clock-in past them moves the hoist |
| 15 | Floor 3.5 (`offset`) | 6 | Machine | Peeker | The lift is a trolley across the top-floor gap, and it only runs on a clock-in |
| 16 | Night Audit (`audit`) | 5 | Build, Secure, Light | Several | The exam: a gate, a plank and a tunnel, one job per stretch |
| 17 | Mind Your Head (`upside`) | 2 | Light | Squatter | Change the light from the ceiling; the squatter in the low lane past it scatters |
| 18 | Falling Up (`fallup`) | 4 | Water | Peeker | Turn the valve mid-fall, and the leak goes back down the pit |
| 19 | Ceiling Walker (`ceiling`) | 4 | Secure | Supervisor, prank | Bolt the far plank by day, under the clipboard’s tunnel |
| 20 | Head Over Heels (`heels`) | 7 | Power | Day-walkers, lurkers | One fuse for the floor corridor and the ceiling corridor: take it up the shaft |
| 21 | Clock Out (`clockout`) | 7 | All six | All | One fuse through two shutters, a light for the low tunnel, a clamp on the last step, the valve, the winch, then the time clock |

Notes that outlive the table:
- **The classic Clock Out** stays in `src/levels.js` as `CLOCKOUT_CLASSIC` (not in `LEVELS`), proven at par 7.
- **Text:** the art carries the idea and the labels name it. `npm run media -- --notext <ids>` is a review check; the text stays in the game.

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

## 5. Original specs (from before the Nov 5 redesign; §4 is the truth)

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
