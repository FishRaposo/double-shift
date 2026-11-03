# Technical Reference

Companion to [GDD.md](GDD.md) §13. Describes the code as built on 2026-11-02 (after the level audit).

**At a glance**
- **The one rule:** `src/rules.js` decides everything that matters; the screen only draws it (§2).
- `npm start` to play, `npm test` (<!-- n:tests -->281<!-- /n --> tests), `npm run check` (§7), `npm run media` (headless checks + itch media).
- Add a level: grids in `src/levels.js` + a `SOLUTIONS` entry in `test/solutions.mjs` (§6; the full recipe is BUILD.md §2.1).
- The tier-C mechanics (wet floor, day-walker, supervisor, offset layer) are built — §6.5 documents them.

## 1. Stack and constraints

- Plain JavaScript ES modules, one `<canvas>` (960×540), no engine, no dependencies, no asset files.
- Sound synthesized with WebAudio at runtime.
- Must be served over HTTP (ES modules don't load from `file://`). itch.io serves it as an HTML5 game.
- Node 22 for tests and scripts (`node --test`).

## 2. Files

| File | Role | May touch the DOM? |
|---|---|---|
| `index.html` | Canvas + module entry | — |
| `src/rules.js` | **All gameplay rules.** Pure: `step(level, state, input)` → next state | No |
| `src/levels.js` | Level data (ASCII grids + pranks/freaks/decor) | No |
| `src/input.js` | Key events → one input frame per physics tick | No (takes event-like objects) |
| `src/main.js` | Fixed-step loop, screens, event → sfx/fx, draw order; caches the static layer (echo, solids, hatched rims, skins, props, exit) per level × shift × prank state and the background per act × shift (the last 6); sizes the canvas on resize (`fitCanvas`, whole-pixel scale from `canvasScale`) | Yes |
| `src/sprites.js` | Pixel sprites as string grids (worker frames, freaks), palettes, `workerFrame(p, t, fx, sign)` (pure), `spriteRect` (pure: where a frame lands, upright or `vflip`ped around its hitbox `box`), `drawSprite`/`drawEyes` | Data no; drawing yes |
| `src/art.js` | Procedural pixel drawing: tiles, hatch, echoes, hazards, exit, checkpoint, signs, freaks, `PROPS`, planned-level objects, effects, panels, stamps, logo. Also the pure pieces the art tests check: the identity colors (`PAL`, `PLATE`, `NOTE_STRIP`, `HAZARD`, `BACKDROP`), `skyBands`, `exitRects` and `checkpointRect` (always on screen), and `shouldHatch` (only a one-shift region's rim; none when the night is generated). `drawBackground(g, layer, W, H, t, act)` draws the sky and `drawBackdrop`, one motif per act with rects only (the palette test rasterizes it) | Yes (canvas) |
| `src/font.js` | The pixel font: glyph table (pure), `measureText`, `wrapText`, `drawText` (cached string canvases) | Data no; drawing yes |
| `src/copy.js` | Result-based lines: timecard comments, stamps, act card lines, spook lines, credits | No |
| `src/layout.js` | Pure shell logic: `levelIndex` (`?level=` by id or position), `canvasScale` (whole device pixels per canvas pixel unless that wastes > 15 % of the window), the level select layout (`actRows`, `cardRect`, `tabRect`, `detailRect`, `moveSelect`, `selectClick`, `actLabel`) and the end screen's per-act `endSummary` | No |
| `src/music.js` | The theme as note data (pure), `scheduleStep`, `createMusic` (look-ahead player with day/night crossfade) | Data no; engine yes |
| `src/save.js` | Best result per level in localStorage (key `double-shift.progress.v1`); unlock rule for level select. Storage is passed in; blocked or corrupt storage falls back to memory | No (takes a storage object) |
| `src/audio.js` | Mix bus (music + SFX → master → compressor), `voice()`, every SFX as data in `SOUNDS`, `sfx.*`, volumes, music shift/menu hooks | Yes (AudioContext) |
| `tools/gallery.html` | Every asset on both palettes, audio board, offline loudness check (`window.__audioCheck`) | Yes |
| `tools/cover.html` | The itch cover, drawn with the game's sprites, tiles and font | Yes |
| `test/*.test.mjs` | `node --test` suites against the real rules | No |
| `test/helpers.mjs` | `level()`, `stepN()`, `place()`, `play(level, policy)` | No |
| `scripts/serve.mjs` | Zero-dependency local server, no caching (`npm start` opens the browser; `npm run serve` doesn't). `play.bat` wraps it for double-click on Windows. | — |
| `scripts/check.mjs` | Syntax-check modules, validate levels | — |
| `scripts/counts.mjs` | `npm run counts`: every `<!-- n:KEY -->` count in the docs matches the code (`-- --write` rewrites them) | — |
| `scripts/media.mjs` | `npm run media`: drives headless Edge/Chrome over the DevTools protocol (no dependencies). Saves the cover, screenshots and gallery to `media/`; fails if level 1 can't be cleared with real keys, the page logs an error, the audio clips, or a frame takes > 8 ms to draw. | — |
| `scripts/zip.mjs` | Builds `double-shift-web.zip` for itch | — |

**The one architectural rule:** the screen only draws what `rules.js` decided. Anything that affects whether the player lives, dies, wins or where they are belongs in `rules.js` and gets a test.

## 3. Rules module

### 3.1 Loop
- Fixed timestep `DT = 1/120` s. `main.js` accumulates real time and calls `step()` up to 12 times per frame.
- `step()` clones the previous state (`structuredClone`), so states are immutable snapshots. That's what makes determinism tests trivial.

### 3.2 Order of operations inside `step()`
1. **Shift** (new press sets a 80 ms buffer; try clean → nudge ≤4 px, against the destination's gravity first → keep buffering → reject). Validated against geometry *after* any due prank. A shift that turns gravity over (into or out of an Upside Down night) clears `rising`, and coyote time unless you're grounded after it.
2. **Freak clock** advances by `dt` only if the player is on the night shift.
3. **Horizontal** acceleration/deceleration (ground vs air values, turn-around boost).
4. **Jump**: buffer (100 ms), coyote (80 ms, survives a shift of the same gravity), variable height (release while rising → `vy *= 0.45`). From here on every vertical rule reads `sign = gravitySign(level, layer)`, taken after the shift: the jump is `vy = −sign·620`, rising means `sign·vy < 0`.
5. **Gravity** `vy += sign·gravity·dt`, clamped to `sign·vy ≤ maxFall`.
6. **Move X then Y**, resolve against the active layer's tiles (with prank overrides). Recompute grounding with a 1 px probe in the direction of gravity.
7. **Death checks**: hazard, freak contact (on the freak's own shift), fell out of the level (below it; above it on a flipped layer).
8. **Shared objects**: checkpoints (store position, layer, prank state; a checkpoint saves in the shift you touched it in only if `standableSpot` finds ground for its respawn point there under that shift's gravity, else in the other shift if that has ground, else not at all, so a respawn can never drop you into a pit forever), exit (sets `won`).

Shift happens first so a shift and a jump on the same tick see the new world (GDD §13.7 case 10).

### 3.3 State shape
```js
{
  layer: 0 | 1,                 // DAY | NIGHT
  player: { x, y, vx, vy, facing, grounded, coyote, jumpBuf, rising },
  shiftPending: number,         // seconds left on a buffered shift
  shifts: number,               // successful shifts this run (timecard)
  deaths: number,
  checkpoint: { x, y, layer, id, overrides, nightEntries },
  won: boolean,
  time: number,                 // seconds simulated this run
  nightEntries: number,         // successful entries into night (pranks key off this)
  overrides: { 'layer,tx,ty': ch },  // tiles changed by pranks
  freakClock: number,           // advances only on the night shift
  dayClock: number,             // advances only on the day shift (day-walkers)
  events: [ ... ],              // this tick only
}
```

### 3.4 Events (per tick, consumed by `main.js`)
| `type` | Extra fields | Fired when |
|---|---|---|
| `shift` | `layer`, `nudged` | A shift succeeds |
| `shiftFail` | — | A buffered shift expires |
| `prank` | `id` | A prank fires (always right after its `shift`) |
| `jump` / `land` | `x`, `y`, `layer` (where it happened; a death later in the tick may move the player) | Takeoff / touchdown |
| `death` | `cause`: `hazard` \| `spooked` \| `fall`, `by` (killer kind), `x`, `y` | Before respawn |
| `respawn` | — | After death, same tick |
| `checkpoint` | `id` | New checkpoint taken |
| `win` | `shifts`, `par` | Exit reached |
| `wetStop` | — | A wet-floor slide decelerated to zero |
| `supervisorTurn` | `id`, `facing` | A supervisor changed facing (once per window) |
| `peek` | `id` | A peeker popped out (hidden last tick, out this tick) while you're on its shift; the boing |

### 3.5 Public API
`TILE` (30), `DT`, `PARAMS`, `DAY`, `NIGHT`, `FREAK` ({w:20,h:22}), `SKIN_KINDS`, `parseLevel(def)`, `initState(level)`, `step(level, state, input)`, `NO_INPUT`, `tileAt(level, layer, tx, ty, overrides)` (outside the grid: side walls, a solid ceiling and an open floor, the other way up on a flipped layer), `overlapsSolid(...)`, `overlapsHazard(...)` (the hazard band is on the floor side of the tile: the bottom 45 %, or the top 45 % on a flipped layer), `freakBoxes(level, state)` (each box has `hang`: true for a freak of a flipped shift, which hangs from the solid above its cell), `isSolidChar(ch)`, `supervisorFacing(f, t)`, `watchedClock(side, sup, t)`, `isEmbedded(level, state)`, `gravitySign(level, layer)` (−1 only on the night of an `upsideDown` level), `spawnPoint(tx, ty, sign = 1)` (standing on the cell's floor, or hanging under the cell above), `standableSpot(level, layer, tx, ty, ov)` (that spot when it's free and grounded under the layer's gravity, else null; checkpoints and the fairness test use it). Death events carry `cause`, `by` (freak kind) and `layer` (the shift you died in).

Input frame: `{ left, right, jumpHeld, jumpPressed, shiftPressed }`.

## 4. Tuning values (`PARAMS` in `src/rules.js`)

| Param | Value | Unit | Effect |
|---|---|---|---|
| `playerW` × `playerH` | 18 × 26 | px | Worker hitbox |
| `maxSpeed` | 270 | px/s | Run speed (9 tiles/s) |
| `groundAccel` / `groundDecel` | 2600 / 3000 | px/s² | Snappy start/stop |
| `airAccel` / `airDecel` | 1700 / 900 | px/s² | Air control; low decel keeps momentum |
| `gravity` | 2000 | px/s² | |
| `jumpVelocity` | 620 | px/s | Full jump ≈ 96 px (3.2 tiles), 0.62 s airtime |
| `jumpCut` | 0.45 | × | Tap-jump height |
| `maxFall` | 900 | px/s | 7.5 px/tick, less than a tile: no tunnelling |
| `coyoteTime` | 0.08 | s | Carries across a shift |
| `jumpBuffer` | 0.10 | s | |
| `shiftBuffer` | 0.08 | s | Blocked-shift retry window (S-08) |
| `shiftNudge` | 4 | px | Corner nudge reach (up, travel dir, back, down) |
| `hazardHeight` | 0.45 | tile | Hazard hitbox is the bottom 45% of its tile |
| `wetAccel` / `wetDecel` | 500 / 250 | px/s² | Friction while grounded on `~` (grip: 2600 / 3000); no turn-around boost on wax, so steering back from full speed takes ≈ 2.4 tiles |

Derived metrics for level design are in [LEVELS.md](LEVELS.md) §1. **Any change here: re-run `npm test` (par proofs) and update LEVELS.md §1.**

## 5. Level format

See [LEVELS.md](LEVELS.md) §2 for the full format. Summary: `{ id, name, act, note, par, day: [...], night: [...], pranks?, freaks?, skins?, decor?, props?, spawnLayer? }` — or `offset: { dx, dy }` + `nightPatch?` instead of `night` (§6.5). Act names are `ACTS` in `src/levels.js`; the finale is act `FINALE_ACT` (6). Grids must be equal size; the current game uses 32×18 (exactly one screen).

- **Skins** (`skins: [{ kind: 'door'|'pillar'|'portrait'|'doorPile', tx, ty, w?, h?, layer? }]`) are object art over ordinary solid tiles; `parseLevel` validates them like every other field (the kind is one of `SKIN_KINDS`, `layer` is `'day'`, `'night'` or left out for both, the covered cells are inside the grid, doors and pillars are 1 wide and the pile 2) and fills default sizes (door 1×2, pillar 1×4, portrait 3×2, pile 2 wide and at most `h` = 3 doors high). The pure `skinPlan(level, layer, ov)` in `src/skins.js` reads the tiles under each skin under the current prank overrides: all solid draws the object, all empty draws what's left (a door's empty frame, a pillar's crack) but only if the object stood there (the level built it there or a prank has written those tiles), mixed draws nothing. Doors and pillars stand on their bottom cell; a portrait hangs from its top-left cell; the pile counts solid rows up from its bottom row, never more than `h` (so a platform above it isn't drawn as doors).
- **Prank sounds:** a prank may name a `sound` (a `SOUNDS` entry, e.g. `doorThunk`) played with the giggle when it fires.

## 6. Extending

### 6.1 Add a level
1. Write the grids and metadata in `src/levels.js` (or generate with a script; widths must match).
2. Add a scripted solution policy to `SOLUTIONS` in `test/solutions.mjs`. `test/levels.test.mjs` asserts it wins at ≤ par with zero deaths and that running/jumping without shifting can't win; `test/fairness.test.mjs` checks the timing slack of every required input, respawns outside patrols and the exit clear of freaks.
3. `npm test`, `npm run check`, `npm run audit -- <id>`, `npm run media -- --review <id>`, play it. BUILD.md §2.1 has the full recipe.

### 6.2 Add a prank
Add to the level's `pranks`: `{ id, onNight: N, tell: { tx, ty }, set: [{ layer: 'day'|'night', x0, x1, y0, y1, ch }] }`. The engine handles validation, tells, the giggle, and checkpoint restore.

### 6.3 Add a freak kind
1. In `freakBoxes()` give the kind its position/`active` rule as a pure function of its shift's clock (`s.freakClock` by night, `s.dayClock` by day, or `watchedClock` under a supervisor), with no per-freak mutable state.
2. Add a rules test (frozen by day, spooks on contact at night, any timing behavior).
3. Draw it in `drawFreak()` in `src/art.js` (sprite in `src/sprites.js`).

### 6.4 Add a tile type
1. Decide whether it's solid for collision (`overlapsSolid`) and what else it changes (e.g. friction read in step 3).
2. Parse char in `parseLevel` if it needs metadata; otherwise just use it in grids.
3. Tests first: behavior on it, behavior shifting onto/off it.
4. Draw it in `drawSolids`/a new draw function.

### 6.5 Tier-C mechanics (built)

The four tier-C mechanics from [CONTENT.md](CONTENT.md) §3 — all built, tested and shipped in their levels. Each follows the same rules as everything else: pure functions of state and level, no per-object mutable state.

#### Wet floor `~` (SYS-1, level `wet`)
- **Collision:** `~` is solid. One `isSolidChar(ch)` exported from `rules.js` is the single solidity test for rules (`overlapsSolid`) and renderer (`main.js`), so the two can't drift.
- **Friction:** in the horizontal step, when grounded **and every tile under the feet is `~`**, `PARAMS.wetAccel` (500) / `wetDecel` (250) replace the ground values, and turning around gets no boost. Any dry floor under a foot gives grip; air under a foot doesn't. Max speed is unchanged.
- **Events:** a wet slide that decelerates to zero emits `wetStop` (sfx).
- **Shifting:** friction is read from the active layer each tick, so shifting from night `~` to a dry day floor gives grip on the next tick. That's the level's whole lesson.
- **Tests:** slide distance from full speed on `~` vs. dry floor; one dry tile under the feet gives grip; shift night→day on `~` stops you within the dry-floor stopping distance; jump buffer and coyote unchanged on `~`; `isSolidChar` treats `~` as solid in both the rules and the echo outline.
- **Drawing:** `drawWetTile` (wavy sheen), ART.md §6.1.

#### Day-walker freak (SYS-2, level `daywalker`)
- **State:** `dayClock` advances by `dt` only while `s.layer === DAY` (mirror of `freakClock`, which advances only at night). Neither clock is checkpointed — like `freakClock` before it, `dayClock` is a timing pattern, not prank state.
- **Freak field:** every freak carries `shift` (`NIGHT` by default); `kind: 'daywalker'` gets `shift: DAY` and patrols like a lurker (`range`, `speed`) on `dayClock`.
- **Contact:** `touchedFreak` is "the player overlaps an active freak **whose `shift` is the current layer**"; the frozen outline on the other shift is harmless.
- **Shifting into it:** shifting to day onto an active day-walker is a spook, mirroring the night rule.
- **Tests:** `dayClock` advances only on day; frozen at night (position constant while on night); spooks on contact by day; overlapping its outline at night is safe; shifting into it by day spooks; night freaks frozen simultaneously on day; existing night-freak tests unchanged.
- **Drawing:** dark silhouette by day; dashed outline in the day echo color at night (ART.md §5.1). A spook by a day-walker plays `daywalkerGiggle` (death event `by` field).

#### Supervisor freak (SYS-3, level `supervisor`)
- **Definition:** `{ kind: 'supervisor', tx, ty, period, startFacing: 'left'|'right' }`. It never moves and never spooks (it's management).
- **Facing:** at night time `t = freakClock`, `supervisorFacing` returns `startFacing` during `[2kP, (2k+1)P)` and the other way otherwise (P = `period`). A facing change emits `supervisorTurn` once per window (sfx + cue).
- **Who works:** a freak is *watched* if the supervisor faces its side (decided by the freak's base `tx` against the supervisor's `tx`). Unwatched freaks are frozen and `active: false`, so they're harmless.
- **Staying pure:** `watchedClock(side, sup, t)` is the closed form of "night time during which `f`'s side was watched": with `k = floor(t / 2P)` and `r = t − 2kP`, time watched on the start side = `kP + min(r, P)`, and on the other side = `t − that`. It stands in for `freakClock` in the freak's existing pattern (lurker pingpong, peeker cycle). No mutable per-freak state, so the TECH §6.3 rule holds.
- **Tests:** alternating facing; a lurker on the unwatched side doesn't move and doesn't spook; on the watched side it moves and spooks and resumes where its watched clock left off; the closed form matches a tick-by-tick accumulation over 10,000 ticks (determinism); supervisor is harmless and stationary; everything is frozen by day, facing included; one `supervisorTurn` per facing window.
- **Drawing:** clipboard, a head turned toward the watched side, an eye glow on that side, a squint just before each turn; non-color cue (ART.md §5.1).

#### Offset layer (SYS-4, level `offset`)
- **Format:** a level may give `offset: { dx, dy }` (in tiles) instead of a full `night` grid. `parseLevel` generates night as the day grid moved by (dx, dy), so `night[y][x] = day[y − dy][x − dx]`, with empty `.` outside the grid. `S`, `E` and `C` stay shared and aren't moved; the parsed level gets `nightGenerated: true`, which turns hatching off (the echoes carry the cue: nearly every tile differs). An optional `nightPatch` (the same rectangle format as prank `set`) adds differences: the exit approach, hazards.
- **Nothing else changes:** after parsing it's an ordinary two-layer level, so collision, pranks, freaks and echoes all just work.
- **Expected behavior:** shifting while standing on a floor puts you inside the other shift's copy of that floor (3 tiles away, well beyond the 4 px nudge), so the shift is refused (S-08). That's intended and taught (LEVELS.md `offset`).
- **Tests:** a generated night grid equals a hand-written equivalent; `nightPatch` applies after the offset; shifting on the ground in an offset level is refused and leaves the player unchanged; shifting at the apex of a jump lands on the night copy (scripted with the real jump).
- **Drawing:** nothing new beyond the floor-number signs (ART.md §6.1).

#### Upside Down (SYS-16, act 5 and the finale rework) *(built Nov 3: rules, drawing and `upside`; the other act 5 levels and the finale rework planned, cut Nov 18)*
- **Format:** `upsideDown: true` on a level: `parseLevel` generates `night[y] = day[H − 1 − y]` (S, E, C stay shared and unmoved), then applies `nightPatch`. It can't be combined with `night` or `offset` (validation throws, like today's night/offset check).
- **Gravity:** a per-shift sign `g = level.upsideDown && s.layer === NIGHT ? −1 : 1`. Gravity, jump velocity, the variable-jump cut (`rising` means moving against gravity), max fall, coyote and jump buffer all use it. Grounding probes 1 px in the gravity direction (the tile above the head at night). The horizontal step is unchanged.
- **Shift:** unchanged transaction (S-08: clean, ≤ 4 px nudge, 80 ms buffer, reject), checked against the flipped geometry. Velocity is kept as-is in screen space (S-02), so a rise becomes a fall the other way; that is the mechanic.
- **Shared objects:** checkpoints save only where they're standable under that shift's gravity, through one exported `standableSpot(level, layer, tx, ty, ov)` that `step()` and the fairness test share.
- **Freaks:** boxes for night freaks hang from the solid above (`y = ty × TILE` instead of the floor) and carry `hang: true`.
- **Decided 2026-11-03.** The principle: flipping the map and gravity together is the day map seen upside down, so every rule is the day rule mirrored.
  - **Grid edges:** on a flipped layer, `ty < 0` is open and `ty >= h` is solid (the day's open floor and solid ceiling, turned over). Falling out the top is a `fall` death when `p.y + playerH < −60`.
  - **Spawn and respawn:** `spawnPoint(tx, ty, sign)` is exported; with sign −1 the worker hangs under the cell above (`y = ty × TILE`). Spawn, checkpoint saves and respawn use the sign of the layer they save in.
  - **Nudge:** a blocked shift tries its ≤ 4 px nudge against the target layer's gravity first.
  - **Coyote time:** a shift that changes the gravity sign clears coyote time (unless you're grounded after it) and `rising`: no mid-air jump right after a flip. Same-sign shifts are unchanged.
  - **Hazards:** a `^` cell's hitbox is the top 45 % of the tile on a flipped layer.
  - **Authoring:** night pranks, tells, freaks and props use night screen coordinates. Every prop in an upside-down level names its `layer`; props take an optional `flip: true`.
- **Tests** (written first, all passing since Nov 3: the `upside down:` tests in `test/rules.test.mjs`; the existing levels' audit output is byte-identical before and after): generated grid equals a hand-flipped one; gravity sign per layer; jumping and landing on the ceiling at night; a mid-air shift reverses the fall and keeps speed; a grounded shift into embedded flipped geometry is refused; the nudge direction; coyote time across a flip; falling out the top; ceiling checkpoint standable and the respawn grounded; hanging freak boxes; determinism and the no-embedding fuzz on a flipped level. The fairness test and `npm run audit` cover the levels, and the audit output of every existing level must not change.
- **Drawing** (built Nov 3; ART.md §6.1): the worker sprite flips vertically when gravity is up (`spriteRect` keeps the hitbox in place); freak sprites and outlines flip on the night shift; lasers, hazard echoes, the checkpoint and the exit mirror on a flipped layer; tells hang under solids; the HUD, notes and signs stay upright. Every shift in an `upsideDown` level also plays `flip` (AUDIO.md §4.1); the debug overlay shows `g`.

## 7. Testing

| Command | What it covers |
|---|---|
| `npm test` | <!-- n:tests -->281<!-- /n --> tests: GDD §13.7 cases 1–15, S-rules, nudge/buffer, pranks, freaks, checkpoint restore, input semantics, determinism, a 6000-tick no-embedding fuzz, wet floor, day/night freak clocks and per-freak shifts, supervisor watched clock, offset generation/refusal/apex, Upside Down rules (flip, gravity sign, hanging, jump and cut, nudge order, coyote across a flip, hazard band, grid edges, checkpoints, fuzz), every level at par + unwinnable without shifting, progress and settings saving, level-select unlocks, font/sprite/music/SFX data, **fairness** (≥ 200/100 ms slack per required input by act, no respawn in a patrol, no freak over an exit), checkpoint-over-pit, level-definition validation |
| `npm run check` | Every module parses; every level validates |
| `npm run audit` | Per level: the slack of every required shift and jump (fails under the act floor), input-lag tolerance 0–150 ms, and a random search for wins below par or without shifting (`scripts/audit-levels.mjs`). |
| `npm run media` | Real browser (headless Edge/Chrome, no dependencies): plays level 1 with key presses, fails on page errors, a wrong outcome, audio clipping or a slow frame; saves the cover, screenshots and gallery. |

Test style: build tiny ASCII levels with `level(day, night, extra)` and assert on state. Policies for `play()` read state like a player would (position, layer, `freakClock`), so they survive small tuning changes better than frame-exact scripts.

**Gotcha:** `play()` turns a held `shift` into one press. A policy must release Shift between two shifts (S-05 working as intended).

## 8. CI

`.github/workflows/ci.yml` runs on every push and pull request:

```yaml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with: { node-version: 22 }
      - run: npm run check
      - run: npm test
```

GitHub Pages serves `main` (root) at <https://fishraposo.github.io/double-shift/>; `.nojekyll` disables Jekyll processing. Every push to `main` updates the public build, so anything pushed must be playable.

## 9. Debug

- `?level=<id>` start at a level by id (`?level=offset`), or `?level=N` by 1-based position (`levelIndex` in `src/layout.js`; an id survives level insertions, a position doesn't); `?autostart` skip the title; `?debug` overlay (hitbox, position, velocity, grounding, coyote, layer, pending shift). Toggle overlay with `` ` ``.
- `globalThis.__doubleShift` exposes the game object (screen, state, results) for smoke tests and console poking.
- `M` mutes.

## 10. Build for itch

`npm run zip` → `double-shift-web.zip` with `index.html` and `src/` at the archive root (Windows uses `Compress-Archive`). Smoke-test the unzipped folder before uploading. Rebuild after any change to `index.html` or `src/`.

## 11. Known limitations

- No camera: levels are single-screen (open decision, PRODUCTION.md §5).
- No gamepad or touch.
- `structuredClone` per tick is fine at this state size; revisit only if levels grow a lot.
- Browsers can't suppress OS shortcuts (Sticky Keys).
