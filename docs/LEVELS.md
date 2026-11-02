# Level Design Guide

Companion to [GDD.md](GDD.md) §6 and §8. Tile = 30 px. Levels are 32×18 tiles (one 960×540 screen).

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

**Shift windows:** wherever the player must be in a specific shift, leave **≥ 1 tile** where both shifts are safe to switch in (≈ 0.11 s at full run). Use **0.5 tile** only in act 3 precision levels.

**Re-verify all of this after any `PARAMS` change** (`npm test` re-proves every par).

## 2. Authoring format

```js
{
  id: 'inventory',              // used by tests (SOLUTIONS key)
  name: 'Inventory',
  note: 'Every time you clock in, something gets moved.',   // shown for 5 s at level start
  par: 3,                       // fewest shifts found; proven by test
  spawnLayer: 0,                // optional, default DAY
  day:   [ 18 strings of 32 chars ... ],
  night: [ ... same size ... ],
  pranks: [{ id, onNight: 2, tell: { tx, ty }, set: [{ layer: 'night', x0, x1, y0, y1, ch }] }],
  freaks: [{ kind: 'lurker', tx, ty, range, speed }, { kind: 'peeker', tx, ty, period, duty, phase }, { kind: 'squatter', tx, ty }],
  decor:  [{ kind: 'eyes', tx, ty }],
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
| `~` | *(planned)* wet floor, low friction | per layer |

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

## 5. Planned levels (briefs)

| # | Name | Act | New element | Brief | Pri |
|---|---|---|---|---|---|
| 7 | Freight | 2 | Pranks + momentum | Loading dock. Crates restack on each night entry along a fixed cycle (entry 1, 2, 3 = three arrangements). A run-and-jump route exists in each arrangement but only one connects to the exit. Player picks which entry to cross on. | P1 |
| 8 | Wet Floor | 2 | Low-friction tile `~` | Night floors are waxed (by whom?). Momentum carries; stopping takes distance. Shifting to day gives grip back. Pairs with a lurker you must stop short of. | P1 |
| 9 | Stacked | 3 | Several pranks queued | Three pranks on entries 1, 2, 3, each fixing one obstacle and breaking another. The puzzle is the order of clock-ins. Tells for all three visible from the start. | **P0** |
| 10 | Moved Floor | 3 | Offset layer | Night is the day map translated by (dx, dy). Needs an `offset` field that generates the night grid. | P2 |
| 11 | Broad Daylight | 3 | Day-walker freak | One freak is active only on the day shift. Day is no longer the safe place. | P2 |
| 12 | Clock Out | 3 | Everything | A final run combining a frozen-lurker pass, a mid-air chain and one last prank. Ends at the time clock by the exit; final timecard. Eyes wave from the dark. | **P0** |

**Jam minimum:** 1–6, 9, 12.

### Showing the freaks early *(planned, PRODUCTION.md L8)*

Jam raters often play only the first couple of minutes (GDD §1.8), and today the first prank is in level 5. Act 1 should show freak *evidence* from the very first night shift, without new rules:
- eyes decor on the night shift of *Clock In* and *Scaffolding* (`decor: [{ kind: 'eyes', ... }]` already exists);
- a MINE note or a moved prop between levels;
- level select from the title screen (A7), so anyone can reach *Inventory* and *Night Watch*.

Keep act 1's lessons clean: evidence only, no pranks before level 5.

## 6. Level checklist (every level, before it ships)

- [ ] Grids are 32×18, parse cleanly (`npm run check`).
- [ ] A scripted solution in `test/levels.test.mjs` wins at ≤ par with no deaths.
- [ ] It can't be won without shifting.
- [ ] Par is the fewest shifts *you* can find; try to beat it by hand once.
- [ ] Every prank has a tell; every freak is visible or telegraphed before it can spook.
- [ ] Every required shift has a ≥ 1-tile safe window (≥ 0.5 in act 3).
- [ ] The note line (5 s) is in WRITING.md and fits on one line at 14 px.
- [ ] Played once by Fish; played cold by one tester (PLAYTEST.md).
- [ ] No unintended shortcut that skips the level's lesson (shortcuts that need skill are allowed: GDD §8.6).
