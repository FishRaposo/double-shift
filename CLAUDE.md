# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Double Shift** is a day/night puzzle-platformer for GitHub Game Off 2026 (theme: SHIFT), due **Dec 1, 2026 13:37 PST** (internal target: Nov 30). Plain JavaScript ES modules on one 960×540 canvas. No engine, no dependencies, no asset files; sound is synthesized with WebAudio.

## Commands

```sh
npm test                                   # node --test test/*.test.mjs
node --test --test-name-pattern="peeker" test/rules.test.mjs   # single test / subset
npm run check                              # syntax-check src/*.js + validate every level via parseLevel
npm start                                  # local server + opens the browser (play.bat does the same on Windows)
npm run serve                              # http://localhost:8080, no browser; next free port if busy (scripts/serve.mjs)
npm run zip                                # double-shift-web.zip (index.html + src/) for itch.io
node scripts/smoke.mjs http://localhost:8080/ media   # headless Chromium plays level 1; needs Playwright
```

Tests and scripts target Node 22. URL flags for manual play: `?level=N`, `?autostart`, `?debug` (overlay, toggle with `` ` ``). `globalThis.__doubleShift` exposes the game object in the browser.

## Architecture

**The one rule: the screen only draws what `src/rules.js` decided.** Anything affecting whether the player lives, dies, wins, or where they are belongs in `rules.js` and gets a test.

- `src/rules.js` — all gameplay, pure (no DOM, no clock). `step(level, state, input)` returns a new state at a fixed `DT = 1/120`; it `structuredClone`s the previous state, so states are immutable snapshots and everything is deterministic. Per-tick `state.events` (`shift`, `prank`, `death`, `win`, …) are how `main.js` learns what to animate and play.
- Order inside `step()` matters: shift resolves **first** (after any due prank), so a shift and a jump on the same tick see the new world. A blocked shift tries a ≤4 px nudge, then buffers 80 ms, then fails without touching the player.
- `src/levels.js` — each level is two equal-size ASCII grids (`day`, `night`, currently 32×18 = one screen) plus optional `pranks`, `freaks`, `decor`. `S`/`E`/`C` are shared across layers; `#`/`^` are per layer.
- **Pranks** fire on the Nth entry into night (`onNight`) and write tile overrides into `state.overrides` (`'layer,tx,ty' → ch`); checkpoints snapshot and restore them.
- **Freaks** have no mutable per-freak state: their position/`active` is a pure function of `state.freakClock`, which only advances on the night shift (so day freezes them). Add a kind in `freakBoxes()`, then draw it in `drawFreaks()` in `main.js`.
- `src/input.js` — DOM-free key events → one input frame per tick. One shift per physical key-down; OS key-repeat ignored; presses between ticks are queued.
- `src/main.js` — fixed-step loop (accumulator, ≤12 steps/frame), screens, all rendering, event → sfx/fx. `src/audio.js` — WebAudio `sfx.*`.

## Tests

- Edge-case tests build tiny ASCII levels with `level(day, night, extra)` from `test/helpers.mjs` and assert on state (`stepN`, `place`).
- `test/levels.test.mjs` has a `SOLUTIONS` map keyed by level `id`: every level must have a scripted policy that wins at ≤ par with zero deaths, and must be unwinnable without shifting. **A new level needs a `SOLUTIONS` entry or the suite fails.** Policies read state like a player (position, layer, `freakClock`) rather than frame-exact scripts.
- Gotcha: `play()` turns a held shift into one press — a policy must release shift between two shifts.
- Changing `PARAMS` (tuning) re-proves every par via `npm test`; also update the metrics table in `docs/LEVELS.md` §1.

## Jam constraints

The jam rules and how they apply are in `docs/RELEASE.md` §0, and the category-by-category scoring plan is in `docs/GDD.md` §1.8. GitHub Pages serves `main`, so every push is the public build and must be playable. After Dec 1, 13:37 PST, the voting-period freeze applies: critical bug fixes only, each with a note explaining what changed.

## Docs

`docs/INDEX.md` maps the doc set. `docs/GDD.md` is the design source of truth (rule IDs S-01…S-08, §13.7 edge cases referenced in tests); `docs/TECH.md` is the detailed code reference (state shape, event table, `PARAMS`, how to add a level/prank/freak/tile); `docs/LEVELS.md` has movement metrics and the level authoring format. `docs/DESIGN.md` is the one-page portfolio write-up.

Doc rules from `docs/INDEX.md`:
- GDD decides *what*, other docs decide *how*; if they disagree, the GDD wins and the other doc gets fixed.
- Every number in a doc (tuning values, sizes, test counts, pars) must match the code — update docs in the same change as the code (including the test count in README.md and TECH.md).
- Mark unbuilt things *(planned)* or *(stretch)*; never describe a planned feature as existing.
- In-game copy lives in `docs/WRITING.md` as drafts for Fish (the designer) to edit.
