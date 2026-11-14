# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Double Shift** is a day/night puzzle-platformer for GitHub Game Off 2026 (theme: SHIFT), due **Dec 1, 2026 13:37 PST** (internal target: Nov 30). Plain JavaScript ES modules on one 960×540 canvas. No engine, no dependencies, no asset files; sound is synthesized with WebAudio.

## Commands

```sh
npm test                                   # node --test test/*.test.mjs
node --test --test-name-pattern="peeker" test/rules.test.mjs   # single test / subset
npm run check                              # syntax-check src/*.js + validate every level via parseLevel
npm run audit [-- <id>]                    # per-level fairness: input slack, lag tolerance, a below-par random search in both directions
npm run counts                             # every <!-- n:KEY --> count in the docs matches the code; -- --write fixes them
npm start                                  # local server + opens the browser (play.bat does the same on Windows)
npm run serve                              # http://localhost:8080, no browser; next free port if busy (scripts/serve.mjs)
npm run zip                                # double-shift-web.zip (index.html + src/) for itch.io
npm run media                              # headless Edge/Chrome: real-key level-1 run, cover/screenshots/gallery, audio clipping + draw-cost checks
npm run media -- --review clock,watch --gray --cvd   # day + night shots per level (+ grayscale, color-blind; --memo: memo panel open) in media/review/
npm run media -- --root <dir>              # smoke-test another folder, e.g. the unzipped itch build
npm run gif -- upside                      # media/demo-upside.gif: the level's scripted run, 480×270 (--full: 960×540), same bytes every time
```

Tests and scripts target Node 22. URL flags for manual play: `?level=<id>` (or a 1-based position, `?level=3`), `?autostart`, `?debug` (overlay, toggle with `` ` ``). `globalThis.__doubleShift` exposes the game object in the browser. In a cloud session, `npm run media` uses `/opt/pw-browsers/chromium` and adds `--no-sandbox` as root.

## Architecture

**The one rule: the screen only draws what `src/rules.js` decided.** Anything affecting whether the player lives, dies, wins, or where they are belongs in `rules.js` and gets a test.

- `src/rules.js` — all gameplay, pure (no DOM, no clock). `step(level, state, input)` returns a new state at a fixed `DT = 1/120`; it `structuredClone`s the previous state, so states are immutable snapshots and everything is deterministic. Per-tick `state.events` (`shift`, `prank`, `death`, `win`, …) are how `main.js` learns what to animate and play.
- Order inside `step()` matters: shift resolves **first** (after any due prank), so a shift and a jump on the same tick see the new world. A blocked shift tries a ≤4 px nudge, then buffers 80 ms, then fails without touching the player.
- Gravity has a sign per shift, `gravitySign(level, layer)`: −1 only on the night of an `upsideDown` level, whose night grid is the day grid turned over. Every vertical rule (jump, cut, gravity, grounding, nudge order, hazard band, grid edges, fall-out, spawn/checkpoint spot via `standableSpot`) reads it, so the flipped night is the day's rules mirrored (TECH §6.5).
- `src/levels.js` — each level is two equal-size ASCII grids (`day`, `night`, currently 32×18 = one screen) plus optional `pranks`, `freaks`, `decor`, `props`, `skins`, `rev`; `offset` or `upsideDown` (+ `nightPatch`) generate the night grid instead. `S`/`E`/`C` are shared across layers; `#`/`^`/`~` are per layer. A checkpoint saves only in a shift with floor under it.
- **Pranks** fire on the Nth entry into night (`onNight`) and write tile overrides into `state.overrides` (`'layer,tx,ty' → ch`); checkpoints snapshot and restore them. `every` makes a prank repeat; `pendingPranks()` is what the tells show (a countdown and the tiles that will change).
- **Freaks** have no mutable per-freak state: their position/`active` is a pure function of a clock that only runs on their own shift (`freakClock` by night, `dayClock` for the day-walker; the supervisor's workers use `watchedClock`). Add a kind in `freakBoxes()`, then draw it in `drawFreak()` in `src/art.js`.
- `src/skins.js` — pure: which object art covers which tiles (`skinPlan`), checkpoint and exit poses. `src/layout.js` — pure shell logic: level select, end summary, memos, canvas scale. `src/keys.js`, `src/pad.js` — bindings and gamepad.
- `src/input.js` — DOM-free key events → one input frame per tick. One shift per physical key-down; OS key-repeat ignored; presses between ticks are queued. Which keys drive which action comes from the player's bindings in `src/keys.js` (stored with the settings, edited in SETTINGS > CONTROLS; the menus' keys are reserved). A gamepad comes in through `src/pad.js` (edge-only pad codes with a fixed mapping; `main.js` polls it each frame and routes menu presses through `handleKey`).
- `src/main.js` — fixed-step loop (accumulator, ≤12 steps/frame), screens, draw order, event → sfx/fx; caches each level's static layer per shift × prank state. Shell math that can be tested lives in `src/layout.js` (`levelIndex` for `?level=`, the level select grid for six act rows, the end screen's per-act summary).
- Art is all code on a 2-px grid: `src/sprites.js` (string-grid sprites + pure `workerFrame`), `src/art.js` (tiles, props, effects, UI), `src/font.js` (pixel font; every printed character needs a glyph — a test checks the source). Review every asset at `/tools/gallery.html`.
- Sound: `src/audio.js` (mix bus, every SFX as data in `SOUNDS`) and `src/music.js` (note data + scheduler; day/night arrangements crossfade on shift). `src/save.js` also holds settings; `src/copy.js` holds result-based lines.

## Tests

- Edge-case tests build tiny ASCII levels with `level(day, night, extra)` from `test/helpers.mjs` and assert on state (`stepN`, `place`).
- `test/solutions.mjs` has a `SOLUTIONS` map keyed by level `id`: every level must have a scripted policy that wins at ≤ par with zero deaths, and must be unwinnable without shifting. **A new level needs a `SOLUTIONS` entry or the suite fails.** The fallback finale `CLOCKOUT_CLASSIC` (not in `LEVELS`) keeps its policy in `SOLUTIONS_EXTRA`; a reworked level takes `rev: N` so saved bests from the old one are ignored. `test/fairness.test.mjs` then requires ≥ 200 ms of slack on every required input in acts 1–2 (≥ 100 ms in acts 3–6), no respawn point in a patrol, no freak over an exit; `npm run audit` shows the numbers. Policies read state like a player (position, layer, `freakClock`) rather than frame-exact scripts.
- Gotcha: `play()` turns a held shift into one press — a policy must release shift between two shifts.
- Changing `PARAMS` (tuning) re-proves every par via `npm test`; also update the metrics table in `docs/LEVELS.md` §1.

## Jam constraints

The jam rules and how they apply are in `docs/RELEASE.md` §0, and the category-by-category scoring plan is in `docs/GDD.md` §1.8. GitHub Pages serves `main`, so every push is the public build and must be playable. After Dec 1, 13:37 PST, the voting-period freeze applies: critical bug fixes only, each with a note explaining what changed.

## Docs

`docs/INDEX.md` maps the doc set. **To change or add anything, start with `docs/BUILD.md`** (protocol, recipes, and the record of how each part was built). `docs/GDD.md` is the design source of truth (rule IDs S-01…S-08, §13.7 edge cases referenced in tests); `docs/TECH.md` is the detailed code reference (state shape, event table, `PARAMS`, how to add a level/prank/freak/tile); `docs/LEVELS.md` has movement metrics and the level authoring format. `docs/DESIGN.md` is the one-page portfolio write-up. `docs/CONTENT.md` is the manifest of the full **21-level game** (five acts of four plus the finale; sequence and ladder in `docs/LEVELS.md` §5.0; tiers kept as history); the five added mechanics (wet floor, day-walker, supervisor, offset layer, Upside Down) are built and documented in `docs/TECH.md` §6.5.

Doc rules from `docs/INDEX.md`:
- GDD decides *what*, other docs decide *how*; if they disagree, the GDD wins and the other doc gets fixed.
- Every number in a doc (tuning values, sizes, test counts, pars) must match the code — update docs in the same change as the code. Test counts, level counts and source line counts are wrapped in `<!-- n:KEY -->N<!-- /n -->` markers: run `npm run counts -- --write` before committing (CI runs `npm run counts`).
- Mark unbuilt things *(planned)* or *(stretch)*; never describe a planned feature as existing.
- In-game copy lives in `docs/WRITING.md` as drafts for Fish (the designer) to edit.

## Model routing and delegation

This session is the orchestrator (Opus by default). Plan, delegate, integrate
and review. Do a step yourself only when writing the brief would take longer
than doing it, or the step can't be specified without the whole picture.

Delegate by default (agent files in `.claude/agents/`):
- `scout` (Haiku, read-only): search, file triage, reading and summarising,
  extraction, classification, fan-out across independent files or cases,
  mechanical steps with an exact spec. Not code changes.
- `builder` (Sonnet): code changes and bug fixes against a written spec, docs,
  analysis, drafting, first-pass review. Anything that must run `npm test`.
- `consultant` (Fable): not active yet. Do not use until this line is removed.
  Until then, raise the orchestrator's effort (`high`, then `xhigh`) instead.

Every brief stands alone: goal, exact inputs (files, paths, data), constraints,
output format, how to verify, when to stop. Run independent steps in parallel
and dependent steps in order; don't fan out a single dependent chain.

Review every sub-agent result before using it. On failure: re-delegate with a
sharper brief, then at one effort level higher, then move it up a model
(scout -> builder -> do it yourself).

Never spawn an agent without a pinned model; an unpinned agent inherits the
session's model. Stay at `high` effort or below unless a measured test shows a
gain.

When you change code that can be run, built, or type-checked, run a real
check that exercises the change before reporting it done: the project's
tests, type-checker, or build, or the changed command itself. A syntax-only
check, or a check command that failed to start, does not count; if all
that is missing is the project's declared dependencies, install them with
its own package manager and lockfile (e.g. npm install, pip
install -r requirements.txt), never via sudo or the system package manager,
unless told not to. Only if no real check can run here, say which one you
did not run and why instead of reporting the change as done.

Here the real check is `npm test`; `npm run check` is syntax-only and does not
count on its own. Add `npm run audit` after any change to a level or to
`PARAMS`, and `npm run counts` after any change to docs or a counted number.
