# Technical Reference

Companion to [GDD.md](GDD.md) §13. Describes the code as built on 2026-11-01.

**At a glance**
- **The one rule:** `src/rules.js` decides everything that matters; the screen only draws it (§2).
- `npm start` to play, `npm test` (42 tests), `npm run check` (§7).
- Add a level: grids in `src/levels.js` + a `SOLUTIONS` entry in `test/levels.test.mjs` (§6).

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
| `src/main.js` | Fixed-step loop, screens, rendering, event → sfx/fx | Yes |
| `src/audio.js` | WebAudio synth, `sfx.*` | Yes (AudioContext) |
| `test/*.test.mjs` | `node --test` suites against the real rules | No |
| `test/helpers.mjs` | `level()`, `stepN()`, `place()`, `play(level, policy)` | No |
| `scripts/serve.mjs` | Zero-dependency local server, no caching (`npm start` opens the browser; `npm run serve` doesn't). `play.bat` wraps it for double-click on Windows. | — |
| `scripts/check.mjs` | Syntax-check modules, validate levels | — |
| `scripts/smoke.mjs` | Headless Chromium plays level 1 with real keys, screenshots | — |
| `scripts/media.mjs` | `npm run media`: drives headless Edge/Chrome over the DevTools protocol (no dependencies). Saves the itch cover (`tools/cover.html`) and screenshots to `media/`, and fails if level 1 can't be cleared with real keys at full speed. | — |
| `tools/cover.html` | Draws the 1260×1000 itch cover in code | — |
| `scripts/zip.mjs` | Builds `double-shift-web.zip` for itch | — |

**The one architectural rule:** the screen only draws what `rules.js` decided. Anything that affects whether the player lives, dies, wins or where they are belongs in `rules.js` and gets a test.

## 3. Rules module

### 3.1 Loop
- Fixed timestep `DT = 1/120` s. `main.js` accumulates real time and calls `step()` up to 12 times per frame.
- `step()` clones the previous state (`structuredClone`), so states are immutable snapshots. That's what makes determinism tests trivial.

### 3.2 Order of operations inside `step()`
1. **Shift** (new press sets a 80 ms buffer; try clean → nudge ≤4 px → keep buffering → reject). Validated against geometry *after* any due prank.
2. **Freak clock** advances by `dt` only if the player is on the night shift.
3. **Horizontal** acceleration/deceleration (ground vs air values, turn-around boost).
4. **Jump**: buffer (100 ms), coyote (80 ms, survives a shift), variable height (release while rising → `vy *= 0.45`).
5. **Gravity**, clamp to max fall.
6. **Move X then Y**, resolve against the active layer's tiles (with prank overrides). Recompute grounding with a 1 px probe.
7. **Death checks**: hazard, freak contact (night only), fell below the level.
8. **Shared objects**: checkpoints (stores position, layer, prank state), exit (sets `won`).

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
  events: [ ... ],              // this tick only
}
```

### 3.4 Events (per tick, consumed by `main.js`)
| `type` | Extra fields | Fired when |
|---|---|---|
| `shift` | `layer`, `nudged` | A shift succeeds |
| `shiftFail` | — | A buffered shift expires |
| `prank` | `id` | A prank fires (always right after its `shift`) |
| `jump` / `land` | — | Takeoff / touchdown |
| `death` | `cause`: `hazard` \| `spooked` \| `fall`, `x`, `y` | Before respawn |
| `respawn` | — | After death, same tick |
| `checkpoint` | `id` | New checkpoint taken |
| `win` | `shifts`, `par` | Exit reached |

### 3.5 Public API
`TILE` (30), `DT`, `PARAMS`, `DAY`, `NIGHT`, `FREAK` ({w:20,h:22}), `parseLevel(def)`, `initState(level)`, `step(level, state, input)`, `NO_INPUT`, `tileAt(level, layer, tx, ty, overrides)`, `overlapsSolid(...)`, `overlapsHazard(...)`, `freakBoxes(level, state)`, `isEmbedded(level, state)`.

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

Derived metrics for level design are in [LEVELS.md](LEVELS.md) §1. **Any change here: re-run `npm test` (par proofs) and update LEVELS.md §1.**

## 5. Level format

See [LEVELS.md](LEVELS.md) §2 for the full format. Summary: `{ id, name, note, par, day: [...], night: [...], pranks?, freaks?, decor?, spawnLayer? }`. Grids must be equal size; the current game uses 32×18 (exactly one screen).

## 6. Extending

### Add a level
1. Write the grids and metadata in `src/levels.js` (or generate with a script; widths must match).
2. Add a scripted solution policy to `SOLUTIONS` in `test/levels.test.mjs`. The test asserts it wins at ≤ par with zero deaths, and that running/jumping without shifting can't win.
3. `npm test`, `npm run check`, play it.

### Add a prank
Add to the level's `pranks`: `{ id, onNight: N, tell: { tx, ty }, set: [{ layer: 'day'|'night', x0, x1, y0, y1, ch }] }`. The engine handles validation, tells, the giggle, and checkpoint restore.

### Add a freak kind
1. In `freakBoxes()` give the kind its position/`active` rule as a pure function of `s.freakClock` (no per-freak mutable state).
2. Add a rules test (frozen by day, spooks on contact at night, any timing behavior).
3. Draw it in `drawFreaks()` in `main.js`.

### Add a tile type (e.g. wet floor `~`)
1. Decide whether it's solid for collision (`overlapsSolid`) and what else it changes (e.g. friction read in step 3).
2. Parse char in `parseLevel` if it needs metadata; otherwise just use it in grids.
3. Tests first: behavior on it, behavior shifting onto/off it.
4. Draw it in `drawSolids`/a new draw function.

## 7. Testing

| Command | What it covers |
|---|---|
| `npm test` | 42 tests: GDD §13.7 cases 1–10, S-rules, nudge/buffer, pranks, freaks, checkpoint restore, input semantics, determinism, a 6000-tick no-embedding fuzz, every level at par + unwinnable without shifting |
| `npm run check` | Every module parses; every level validates |
| `node scripts/smoke.mjs <url> <outdir>` | Real browser: plays level 1 with keyboard events, fails on console errors or wrong outcome, saves screenshots. Needs Playwright. |

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

- `?level=N` start at level N; `?autostart` skip the title; `?debug` overlay (hitbox, position, velocity, grounding, coyote, layer, pending shift). Toggle overlay with `` ` ``.
- `globalThis.__doubleShift` exposes the game object (screen, state, results) for smoke tests and console poking.
- `M` mutes.

## 10. Build for itch

`npm run zip` → `double-shift-web.zip` with `index.html` and `src/` at the archive root (Windows uses `Compress-Archive`). Smoke-test the unzipped folder before uploading. Rebuild after any change to `index.html` or `src/`.

## 11. Known limitations

- No camera: levels are single-screen (open decision, PRODUCTION.md §5).
- No music, no settings, no save, no level select yet.
- No gamepad or touch.
- `structuredClone` per tick is fine at this state size; revisit only if levels grow a lot.
- Browsers can't suppress OS shortcuts (Sticky Keys).
