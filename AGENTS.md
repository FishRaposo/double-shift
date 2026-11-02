# Repository guidance

## Commands and verification

- Use Node 22+; there are no package dependencies, install step, or build step. Run commands from the repo root.
- CI runs `npm run check`, then `npm test`. `check` only syntax-checks `src/*.js` and parses all levels; it does not replace tests or browser verification. There is no lint/typecheck script.
- On this Windows PowerShell setup, `npm.ps1` is blocked by execution policy: use `npm.cmd` instead of `npm` (e.g. `npm.cmd test`).
- Focused tests: `node --test test/rules.test.mjs`; filter with `node --test --test-name-pattern="peeker" test/rules.test.mjs` (options precede the file).
- `npm run serve` starts the uncached server; `npm start` also opens the browser. Default port is 8080, but it tries subsequent ports if busy: use the printed URL. Override with `npm run serve -- --port 8090`. Do not open `index.html` via `file://` (ES modules).
- Browser debugging: `?level=3&autostart&debug` selects a 1-based level, skips the title, and enables the overlay; `globalThis.__doubleShift` exposes game state. Use K instead of repeated Shift presses to avoid Windows Sticky Keys.
- `npm run media -- <outdir>` runs a real-key browser smoke test and writes cover/screenshots (default `media/`). It launches its own server/browser; keep ports 8095 and 9333 free. Requires installed Edge/Chrome, not Playwright; set `BROWSER` to the executable path if autodetection fails.
- Alternative smoke test: `node scripts/smoke.mjs http://localhost:8080/ media` requires separately available Playwright + Chromium and an already-running server. Neither browser test runs in CI.
- `npm run zip` packages only `index.html` and `src/` into `double-shift-web.zip` (PowerShell on Windows, system `zip` elsewhere). New runtime files outside those paths will not ship unless packaging changes. ZIPs and generated `media/*.png` are ignored.

## Gameplay boundaries and invariants

- `index.html` loads `src/main.js`: browser input capture, fixed-step accumulator, rendering, and event-driven audio/FX. Gameplay decisions belong in DOM-free `src/rules.js` and must be covered by headless tests, not implemented in the renderer.
- `step(level, state, input)` clones the previous state, advances at `DT = 1/120`, and returns per-tick `state.events` for the browser shell. Preserve deterministic snapshots; do not add wall-clock/random/DOM dependencies to rules.
- Shift resolves before movement/jump, validating the destination against any due prank geometry. A blocked shift tries a <=4 px nudge, buffers for 80 ms, then fails without committing the shift/prank. Simultaneous shift+jump must use the destination world.
- Pranks fire on the Nth successful night entry and write `state.overrides`; collision/rendering must respect those overrides. Death restores checkpoint geometry and night-entry count to prevent softlocks.
- Freak positions/activity derive from `state.freakClock`, which advances only at night. Add gameplay geometry in `freakBoxes()` and matching visuals in `main.js`'s `drawFreaks()`; day freezes them and makes them harmless.
- `src/input.js` is DOM-free: it queues short presses between ticks, ignores OS repeats, and consumes at most one shift press per tick. Preserve that distinction from held input.
- Level definitions in `src/levels.js` have equal-size day/night ASCII grids. `S`/`E`/`C` are shared markers (can appear in either grid); solids/hazards are layer-specific. Save progress uses definition IDs, so renaming an ID disconnects existing records.

## Test and documentation coupling

- Use `test/helpers.mjs` (`level`, `place`, `stepN`, `play`) for tiny collision scenarios and scripted runs. `play()` edge-detects jump/shift: a policy must release shift before requesting another press.
- Every level needs an entry keyed by its ID in `test/levels.test.mjs`'s `SOLUTIONS`. Tests require a zero-death clear at or below par and exercise no-shift running/jumping policies. Changing `PARAMS` can invalidate solutions and pars across all levels: rerun the full suite.
- Preserve the documentation rules in `docs/INDEX.md` and gameplay context in `CLAUDE.md`: GDD defines intended design; verify implemented behavior against code. Mark unbuilt mechanics as planned/stretch rather than describing them as existing.
- Update affected documentation alongside code: tuning/movement metrics in `docs/LEVELS.md`, API/state/events in `docs/TECH.md`, and documented test counts in README/TECH. In-game copy is drafted in `docs/WRITING.md` for Fish to edit.
- `docs/INDEX.md` maps task-specific docs; consult `docs/GDD.md` for rule IDs/edge cases, `docs/TECH.md` for extension recipes, and `docs/RELEASE.md` §0 for jam/release restrictions before publishing.
