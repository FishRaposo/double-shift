# Design Notes

How *Double Shift* was designed and built, and why. The full design is in [GDD.md](GDD.md) and the code reference is [TECH.md](TECH.md). Numbers are from the repo on 2026-11-03.

## The constraint

One month (GitHub Game Off, Nov 1 – Dec 1, 2026, theme SHIFT), one designer, no artist, no composer. Designed by Vinícius Raposo and built with AI assistance (Claude) to his design document. That meant three rules from day one:

- **No engine, no dependencies, no asset files.** Plain JavaScript modules on one 960×540 canvas. Everything on screen is drawn by code and every sound is synthesized with WebAudio. Nothing to license, nothing to load, and it runs in any browser.
- **The game must be provable, not just playable.** With AI writing code, "it seemed to work" isn't enough. Every rule that decides whether you live, die or win has a test.
- **Scope to the deadline.** The plan was 21 levels (five acts of four plus the finale) built in tiers, so any cut would still ship a complete game (CONTENT.md). All <!-- n:levels -->21<!-- /n --> exist.

## The decisions

**Rules are a pure function.** `src/rules.js` has no DOM and no clock: `step(level, state, input)` returns the next state at a fixed 120 Hz. The renderer only draws what the rules decided. So the test suite plays the real game headless, and two runs with the same inputs always produce the same result.

**Shifting has strict rules.** You keep your position and momentum, there's no cooldown, and each key press gives exactly one shift. If a shift would put you inside geometry, it tries a ≤ 4 px corner nudge, then waits up to 80 ms for space, then is refused without touching the player. That's the difference between "the game ate my input" and "I shifted a frame early and it still worked". The shift resolves first in every step, so a shift and a jump on the same frame both see the new world.

**The other shift is frozen.** Nothing moves on the shift you're not in. That removed a whole class of bugs, and then it became a mechanic: each freak only moves on its own shift, so stepping into the other one freezes it mid-stride (later, one of them works days).

**Pranks make clock-ins a resource.** Each entry into the night shift can fire a prank that changes the building (the plank you crossed on moves over the next pit). The timecard counts clock-ins against a par, so the puzzle becomes *when* to shift, not only *where*. Every prank has a visible tell with a countdown and outlined tiles, drawn from pure rule state (`pendingPranks`), and dying restores the prank state saved at your last checkpoint, so a prank can never make a level impossible to finish.

**The night can turn over.** Act 5's night is the day map upside down, with gravity pointing up. Every vertical rule (jump, gravity, grounding, the nudge, hazards, the grid edges, respawn) reads one gravity sign, so the flipped night is the day's rules mirrored rather than a second physics. The 12 levels that existed before it kept identical audit numbers.

**Freaks have no AI.** Each one is a fixed pattern computed from a clock that only runs on its own shift: a patrol, a peek cycle, a sit; the supervisor's workers run on "time spent being watched", which has a closed form. That keeps them predictable, makes freezing free, and makes them testable.

**Every level is proven, and audited for fairness.** Each level has a scripted solution in the tests that must win at par or better with no deaths, and a check that running and jumping without shifting can't win. Change a tuning value and the suite re-checks every par. An audit (`npm run audit`) also measures how much timing slack each required input has; a first pass found a 42 ms shift, two endless respawn loops and three ways to beat a level under par, all fixed and now pinned by tests.

## The numbers

- <!-- n:tests -->441<!-- /n --> automated tests (`npm test`): shift and collision edge cases, nudge/buffer, pranks, freaks, checkpoint restore, input rules, determinism, a 6000-tick fuzz for getting stuck in walls, every level at par, progress and settings saving (including blocked or corrupt storage), the art and music data (every glyph and sprite well-formed, every sound short), and **fairness**: every input a level requires has ≥ 200 ms of slack in acts 1–2 and ≥ 100 ms in acts 3–6, no respawn point sits in a patrol, no freak guards an exit.
- `src/rules.js` is <!-- n:lines:src/rules.js -->667<!-- /n --> lines. The shell (`src/main.js`) is <!-- n:lines:src/main.js -->1166<!-- /n -->; the art is `src/art.js` (<!-- n:lines:src/art.js -->1040<!-- /n -->), `src/sprites.js` (<!-- n:lines:src/sprites.js -->302<!-- /n -->) and `src/font.js` (<!-- n:lines:src/font.js -->209<!-- /n -->); sound is `src/audio.js` (<!-- n:lines:src/audio.js -->201<!-- /n -->) and `src/music.js` (<!-- n:lines:src/music.js -->268<!-- /n -->).
- Drawing a frame costs under 0.5 ms (the static layer is cached), measured headless by `npm run media`.
- CI runs the syntax check, level validation, the tests and the doc-count check on every push, plus the level fairness audit as its own job.
- The demo GIFs are the tests' own scripted runs, played by the game on a fixed clock (`npm run gif`), so a GIF can't show a run the suite doesn't prove.

## What would change with more time

- A camera and larger levels (single-screen rooms were chosen so every puzzle reads at a glance; GDD §21).
- Touch controls (keyboard and gamepad only today).
- Shared-state objects (levers, doors that exist in both shifts).
- A task pack of bugs and features with automated checks, like the ones for Fish's earlier games.

## Sixty seconds, out loud

> *Double Shift* is a puzzle-platformer for GitHub Game Off. You work the day and night shift in the same building at once, and the Shift key moves you between them, even mid-jump. The twist is the freaks: every time you clock into the night they move something, and they freeze when you go back to day. So your clock-ins are a resource, and each level has a par.
>
> I designed it and built it with AI assistance, so I made it provable. The game rules are a pure function with no DOM and no clock, which means the tests play the real game headless: every collision edge case, every prank, and a scripted solution proving each level can be won at par. No engine, no assets. Everything is drawn and synthesized in code, and it runs in the browser.
