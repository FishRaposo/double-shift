# Level Design Guide

Companion to [GDD.md](GDD.md) §6 and §8. Tile = 30 px. Levels are 32×18 tiles (one 960×540 screen).

**At a glance**
- Jumpable rise: **≤ 3 tiles**. Gaps: **≤ 4** comfortable, **≥ 7** impossible (use 8 for "must shift"). Leave **≥ 1 tile** to shift in (§1).
- A level is two ASCII grids (day, night) plus optional pranks, freaks and decor (§2).
- 10 built (§4), 6 planned with full specs (§5): 16 levels in four acts. Jam minimum (tier A): the 6 originals + `stacked` + `clockout`.
- Nothing ships without a scripted par solution in the tests and the §6 checklist.

## 1. Movement metrics (from `PARAMS`, 2026-11-01)

| Metric | Value | Design rule |
|---|---|---|
| Run speed | 270 px/s = **9 tiles/s** | |
| Full jump height | ≈ 96 px = **3.2 tiles** | Rises of **≤ 3 tiles** are jumpable. Walls **≥ 4 tiles** block. |
| Tap jump height | ~20–40 px | Hold matters; don't require exact heights |
| Full-jump airtime | 0.62 s | |
| Flat jump reach at full speed | ≈ 167 px ≈ 5.6 tiles | Gaps: **≤ 4 tiles** comfortable, 5 = skill, 6 = near-impossible, **≥ 7 = impossible** (use 8 for "must shift" gaps to be safe with coyote time) |
| Coyote time | 80 ms ≈ 0.7 tile of run | Carries across a shift |
| Worker hitbox | 18 × 26 px | A **1-tile-high tunnel** (30 px) fits; jumping inside one is impossible |
| Shift buffer | 80 ms ≈ 0.7 tile of run | A shift pressed slightly early still lands |
| Shift nudge | 4 px | Overlaps of ≤ 4 px into a wall resolve automatically |
| Freak box | 20 × 22 px, sits on its tile's floor | |

**Shift windows:** wherever the player must be in a specific shift, leave **≥ 1 tile** where both shifts are safe to switch in (≈ 0.11 s at full run). Use **0.5 tile** only in act 3–4 precision levels.

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
- **Tutorial prompt** shows until the first shift.
- *Polish:* make the gap read as a renovation shaft (barrier tape, a sign).

### 2. Scaffolding: par 1 (act 1)
- **Lesson:** use the other shift's geometry to get past a block.
- **Both:** raised block (cols 16–31 from row 8). **Day only:** scaffolding steps (rows 12 and 10) and a full-height delivery stack on the ledge (cols 23–24).
- **Solution:** climb the day scaffolding, shift to night to pass the deliveries.
- *Polish:* the stack should look like crates/pallets.

### 3. Closing Time: par 2 (act 1)
- **Lesson:** hazards and walls are per-shift; you choose which shift you're in, section by section.
- **Night:** gate col 9, lasers cols 20–25, gate col 27. **Day:** rebar cols 11–17, delivery wall col 18.
- **Solution:** day past the col-9 gate → night over the rebar and past col 18 → day over the lasers and past col 27.
- *Polish:* this is the first level with timing pressure on the shift; confirm in playtest that the window after col 9 isn't too tight.

### 4. Mid-Air: par 3 (act 1)
- **Lesson:** shift during a jump.
- **Both:** start ledge (cols 0–5), end ledge (cols 27–31), pit between. **Night:** platforms cols 9–11 and 21–23 (row 13). **Day:** platform cols 15–17 (row 12) with a checkpoint.
- **Solution:** jump, shift to night mid-air, land; jump, shift to day, land; jump, shift to night, land; run to the exit.
- **Decor:** two pairs of eyes blink in the dark on the night shift. First hint of the freaks.

### 5. Inventory: par 3 (act 2)
- **Lesson:** every clock-in changes the night (first prank).
- **Both:** floors cols 0–6, 15–19, 28–31; pits cols 7–14 and 20–27 (both 8 wide, unjumpable). **Night:** a plank over the first pit.
- **Prank `plank`** on night entry 2: the plank moves to the second pit. **Tell** above the second pit (eyes at night, MINE note by day).
- **Solution:** night across pit 1 → day on the middle floor → night again (plank has moved) across pit 2.
- *Polish:* the middle floor should invite the step-out (a sign, the note in view).

### 6. Night Watch: par 4 (act 2)
- **Lesson:** freaks freeze when you go to day; three freak types.
- **Both:** floor, and a building mass (cols 6–19) with a one-tile tunnel on row 13. **Day:** crates seal both tunnel mouths (cols 6–8, 17–19); rebar cols 21–25.
- **Freaks (night):** lurker in the tunnel (col 11, range 3, 55 px/s), peeker at col 23 (1.6 s cycle, out 50%), squatter at col 28.
- **Solution:** night into the tunnel → day to walk past the frozen lurker → night out of the tunnel and past the day rebar, timing the peeker → day around the squatter.

### 7. Wet Floor: par 4 (act 3)
- **Lesson:** night floors are waxed — you keep sliding; the day shift gives grip back.
- **Day:** walls split the corridor, and a pit (cols 19–24) keeps the day route from skipping the lurker stretch. **Night:** one long `~` tunnel (cols 5–31, roofed rows 0–12): lasers partway down, a lurker at the far end.
- **Solution:** night into the tunnel → day over the first wall → night back in → day to brake on the dry strip before the lasers → night through the second stretch → day to stop short of the lurker and walk past its outline.
- The 1-tile tunnel makes the lasers and the lurker unjumpable: braking on dry ground is the only way. Checkpoints sit before the lasers and before the lurker.

### 8. Night Management: par 2 (act 3)
- **Lesson:** freaks only work while watched — cross on the side the supervisor isn't facing.
- **Night:** the supervisor sits mid-screen (2 s per facing). A lurker patrols each side; only the watched one moves. **Day:** solid mass blocks the corridors, so the crossings must be at night.
- **Solution:** wait for the right facing, cross the far side, reach the perch, wait again, cross back past the other side to the exit.

### 9. Floor 3.5: par 4 (act 4)
- **Lesson:** the night shift is the same building half a storey higher — shift at a jump's apex to step onto the other shift's floor.
- **Day:** a tower of ledges (floor, then ledges at +6 and +12 tiles). **Night** is generated by `offset: { dx: 0, dy: -3 }` plus a laser patch where the day floor has no copy.
- **Solution:** four hops — jump and shift at the apex, alternating day/night, each time landing on a floor's copy 3 tiles up. Grounded shifts are refused (the copy would embed you), which the first floor teaches.
- **Window measured at build:** with `dy: -3` and the ≈ 3.2-tile jump, the feet are clear of the copy's floor top for ≈ 0.16 s around the apex; the 80 ms shift buffer covers the rest of the clear zone. Proven tight but fair by the scripted par solution; `dy: -2` remains the fallback if playtests call it too strict.
- **Props:** floor signs read 3 and 3.5.

### 10. Broad Daylight: par 3 (act 4)
- **Lesson:** day is no longer safe — one freak works the day shift, and each shift freezes the other's freaks.
- **Day:** the day-walker patrols an open corridor whose night version is a 9-tile pit — you must be on day there and dodge it. **Night:** a lurker patrols a sealed-tunnel stretch, like `watch`.
- **Solution:** dodge the day-walker along the corridor (or ghost through it mid-air), night through the pit stretch, then shift to day inside the tunnel to freeze the lurker and walk past its outline.

## 5. Planned levels (specs)

Six more levels take the game to 16 in four acts (manifest: [CONTENT.md](CONTENT.md) §2). Each spec gives the lesson, a layout concept within the §1 metrics, the intended solution and a **target** par range. The real par is whatever the scripted solution in `SOLUTIONS` proves when the level is built; grids are drawn at build time. Rows are 0–17; "floor" means the usual floor with its top at row 14 (stand on row 13).

**Tiers:** A = jam minimum, B = existing systems only, C = needs a new mechanic (all four tier-C mechanics shipped in `wet`, `supervisor`, `offset` and `daywalker`). If a level is cut, the rest keep their order.

| # | Act | Level | id | Tier |
|---|---|---|---|---|
| 7 | 2 Overtime | Under Renovation | `stairs` | B |
| 8 | 2 | Lost & Found | `doors` | B |
| 10 | 3 | Structural Integrity | `pillar` | B |
| 12 | 3 | Stacked | `stacked` | A |
| 15 | 4 | Employee of the Month | `portrait` | B |
| 16 | 4 | Clock Out | `clockout` | A |

### 7. Under Renovation (`stairs`): target par 2 (act 2, tier B)
- **Lesson:** height you only have on one shift can carry you into the other. A mid-air shift that starts from the top of something.
- **Fiction:** "They've built an entirely unnecessary staircase. It leads nowhere. They're very proud."
- **Night:** a staircase of 1-tile steps rising from about col 6 to a top step about 6 tiles above the floor, ending in mid-air (about col 16). Beyond it, nothing.
- **Day:** no staircase. A high ledge (top about 6 tiles above the floor, unjumpable) starts ≤ 4 tiles past the stair top and runs to the exit. At night that ledge is missing (renovation).
- **Solution:** clock into night, climb the stairs, run off the top, shift to day mid-air, land on the ledge, walk to the exit.
- **Uses:** existing tiles only. Optional squatter on a landing (jump over it) to keep act 2's freak presence.
- **Props:** a proud hand-painted sign at the stair top (WRITING.md §5), eyes under the stairs.
- **Constraints:** step rises of 1 tile; ≥ 1 tile of open air above the ledge where both shifts are clear for the mid-air shift.

### 8. Lost & Found (`doors`): target par 5 (act 2, tier B)
- **Lesson:** sometimes you *want* the freaks to act. Clock-ins are a resource you spend on purpose.
- **Fiction:** "The freaks have stolen every door. Not the keys. The doors."
- **Both shifts:** three full-height doors (D1–D3, around cols 9, 15 and 21) cut the floor into rooms. The exit is on a ledge about 6 tiles up at the right end.
- **Pranks:** night entry *n* steals door D*n* from the night layer **and** adds one door to the freaks' pile at the foot of the exit ledge. After 3 entries, the pile makes the climb jumpable (each rise ≤ 3).
- **Solution:** each door is passed by clocking out and back in next to it, so 3 night entries = 5 shifts. The puzzle is **where** to toggle: rebar by day and lasers by night leave a few spots where both shifts are safe, and a lurker between D2 and D3 has to be frozen at the right moment.
- **Par note:** this level inverts "fewest clock-ins": par is the shifts needed to earn 3 night entries safely, proven by the scripted solution like every other par.
- **Props:** door frames left behind (empty, non-solid), the pile, a LOST & FOUND box.

### 10. Structural Integrity (`pillar`): target par 4 (act 3, tier B)
- **Lesson:** one object, moved by each clock-in, is a wall in one place and a step in another. Count your night entries.
- **Fiction:** "They've moved a load-bearing pillar. The building is somehow fine."
- **Both shifts:** a mezzanine (top about 7 tiles above the floor) holds the exit.
- **Day:** the pillar (4 tiles tall, unjumpable on its own) stands where it blocks the floor route; a day-only crate stack (3 tall) sits further along.
- **Pranks (night only):** entries 1, 2 and 3 move the pillar to positions P1, P2, P3. At P2 it stands between the crate and the mezzanine, making a staircase: crate (3) → pillar top (4) → mezzanine (7).
- **Solution:** plan which clock-in is which. Pass the day pillar at night (entry 1), shift to day to use the crate, and time the next night entry so it's entry 2 when you jump from the crate and shift mid-air onto the pillar's top.
- **Props:** a ceiling crack and a dust outline where the pillar used to be; a memo about it.
- **Constraints:** tells for all three positions are visible from the start (eyes/notes at P1–P3).

### 12. Stacked (`stacked`): target par 4–5 (act 3, tier A)
- **Lesson:** several pranks are queued; each fixes one obstacle and breaks another. The puzzle is the order and place of your clock-ins.
- **Fiction:** "They've been busy."
- **Pranks:** three, on night entries 1, 2 and 3. Example chain: entry 1 bridges gap A but drops gate C; entry 2 opens gate C but takes away bridge A; entry 3 puts a plank over gap B.
- **Solution:** be past gap A before entry 2 fires, and at gate C when it does. All three tells are visible from the spawn.
- **Uses:** existing systems only. A checkpoint between the halves (G3).
- **Jam-minimum level:** it must ship.

### 15. Employee of the Month (`portrait`): target par 3–4 (act 4, tier B)
- **Lesson:** the obstacle and the tool are the same object, moved by each clock-in.
- **Fiction:** "The freaks have installed a portrait of themselves. It blocks the exit."
- **Night:** a big portrait (a solid block, about 2×3 tiles) hangs in front of the exit doorway.
- **Day:** the exit is clear, but the day route ends at a ledge you can't climb (5+ tiles).
- **Pranks:** each night entry rehangs the portrait; on entry 2 it hangs low next to the ledge, where its top is a step.
- **Solution:** use the portrait as a step at night (entry 2) to get onto the ledge, walk above the exit, shift to day and drop to the exit.
- **Props:** the portrait is just eyes (WRITING.md §6 memo), a nail where it used to hang.

### 16. Clock Out (`clockout`): target par 5–7 (act 4, tier A)
- **Lesson:** everything you know, in one run. The ending.
- **Fiction:** "Almost done. Don't look at the vents."
- **Rooms:** (1) a mid-air shift chain over a pit (act 1); (2) a frozen-lurker pass through a tunnel (act 2); (3) one last telegraphed prank that has to be timed (act 2–3). Checkpoints between rooms.
- **Tier rule:** built only from tier A and B elements. If tier C mechanics shipped, a short cameo of one may be added; the level must never depend on them.
- **Ending:** the exit is the time clock. Punching out shows the final timecard (totals), then a dozen pairs of eyes blink in sequence in the dark. One waves (WRITING.md §8).
- **Jam-minimum level:** it must ship.

## 5.1 Idea pool status

All six ideas from Fish's pool (2026-11-02) are now planned levels: *Lost & Found* → `doors`, *Under Renovation* → `stairs`, *Structural Integrity* → `pillar`, *Night Management* → `supervisor`, *Employee of the Month* → `portrait`, *Floor 3.5* → `offset`.

**Post-jam pool**

| Idea | Brief | Why post-jam |
|---|---|---|
| Freight | Loading dock; crates restack on each night entry along a fixed cycle; one arrangement connects to the exit | Prank chains are covered by `doors`, `stacked` and `pillar` |
| Scatterer | A freak that flees and knocks things over (real-time geometry change) | Breaks the "pranks only on shift" rule; needs new rules |
| Shared state | Levers and doors that keep one state across both shifts | New system; GDD §8.2 |

### Showing the freaks early (built, PRODUCTION.md L8)

Jam raters often play only the first couple of minutes (GDD §1.8), so act 1 shows freak *evidence* from the very first night shift — no pranks, no danger before level 5:
- **Clock In:** a peeker blinks behind the locked night gate (sealed off, unreachable), footprints lead up to it, eyes in the dark past it;
- **Scaffolding:** eyes float in the dark where the scaffold stands by day; footprints on the night floor;
- **Closing Time:** a peeker sealed past the far gate blinks at night and stands frozen beside the exit by day — the first freak a player walks through;
- **Mid-Air:** eyes decor was already there ("Something up there blinked.");
- level select from the title screen (A7), so anyone can reach *Inventory* and *Night Watch*.

## 6. Level checklist (every level, before it ships)

- [ ] Grids are 32×18, parse cleanly (`npm run check`).
- [ ] A scripted solution in `test/levels.test.mjs` wins at ≤ par with no deaths.
- [ ] It can't be won without shifting.
- [ ] Par is the fewest shifts *you* can find; try to beat it by hand once.
- [ ] Every prank has a tell; every freak is visible or telegraphed before it can spook.
- [ ] Every required shift has a ≥ 1-tile safe window (≥ 0.5 in acts 3–4).
- [ ] The note line (5 s) is in WRITING.md and fits on one line at 14 px.
- [ ] Played once by Fish; played cold by one tester (PLAYTEST.md).
- [ ] No unintended shortcut that skips the level's lesson (shortcuts that need skill are allowed: GDD §8.6).
