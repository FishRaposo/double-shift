# Design Notes

How *Double Shift* was designed and built, and why. The full design is in [GDD.md](GDD.md) and the code reference is [TECH.md](TECH.md). Numbers are from the repo on 2026-11-02.

## The constraint

One month (GitHub Game Off, Nov 1 – Dec 1, 2026, theme SHIFT), one designer, no artist, no composer. Designed by Vinícius Raposo and built with AI assistance (Claude) to his design document. That meant three rules from day one:

- **No engine, no dependencies, no asset files.** Plain JavaScript modules on one 960×540 canvas. Everything on screen is drawn by code and every sound is synthesized with WebAudio. Nothing to license, nothing to load, and it runs in any browser.
- **The game must be provable, not just playable.** With AI writing code, "it seemed to work" isn't enough. Every rule that decides whether you live, die or win has a test.
- **Scope to the deadline.** 10 levels exist; 16 are planned in tiers, with a cut line at 8 so any cut still ships a complete game (CONTENT.md).

## The decisions

**Rules are a pure function.** `src/rules.js` has no DOM and no clock: `step(level, state, input)` returns the next state at a fixed 120 Hz. The renderer only draws what the rules decided. So the test suite plays the real game headless, and two runs with the same inputs always produce the same result.

**Shifting has strict rules.** You keep your position and momentum, there's no cooldown, and each key press gives exactly one shift. If a shift would put you inside geometry, it tries a ≤ 4 px corner nudge, then waits up to 80 ms for space, then is refused without touching the player. That's the difference between "the game ate my input" and "I shifted a frame early and it still worked". The shift resolves first in every step, so a shift and a jump on the same frame both see the new world.

**The other shift is frozen.** Nothing moves on the shift you're not in. That removed a whole class of bugs, and then it became a mechanic: the freaks only move at night, so stepping into the day shift freezes them mid-stride.

**Pranks make clock-ins a resource.** Each entry into the night shift can fire a prank that changes the building (the plank you crossed on moves over the next pit). The timecard counts clock-ins against a par, so the puzzle becomes *when* to shift, not only *where*. Every prank has a visible tell, and dying restores the prank state saved at your last checkpoint, so a prank can never make a level impossible to finish.

**Freaks have no AI.** Each one is a fixed pattern computed from a clock that only runs at night: a patrol, a peek cycle, a sit. That keeps them predictable, makes "freeze by day" free, and makes them testable.

**Every level is proven.** Each level has a scripted solution in the tests that must win at par or better with no deaths, and a check that running and jumping without shifting can't win. Change a tuning value and the suite re-checks every par.

## The numbers

- 60 automated tests (`npm test`): shift and collision edge cases, nudge/buffer, pranks, freaks, checkpoint restore, input rules, determinism, a 6000-tick fuzz for getting stuck in walls, every level at par, progress and settings saving (including blocked or corrupt storage), and the art and music data (every glyph and sprite well-formed, every sound short).
- `src/rules.js` is 404 lines. The shell (`src/main.js`) is 706; the art is `src/art.js` (529), `src/sprites.js` (248) and `src/font.js` (192); sound is `src/audio.js` (189) and `src/music.js` (232).
- Drawing a frame costs about 0.4 ms (the static layer is cached), measured headless by `npm run media`.
- CI runs the syntax check, level validation and the tests on every push.

## What would change with more time

- A camera and larger levels (single-screen rooms were chosen so every puzzle reads at a glance; GDD §21).
- Gamepad support and rebindable keys (Shift can trigger Windows Sticky Keys; K is the workaround today).
- Shared-state objects (levers, doors that exist in both shifts) and "offset" levels where the freaks move the whole floor.
- A task pack of bugs and features with automated checks, like the ones for Fish's earlier games.

## Sixty seconds, out loud

> *Double Shift* is a puzzle-platformer for GitHub Game Off. You work the day and night shift in the same building at once, and the Shift key moves you between them, even mid-jump. The twist is the freaks: every time you clock into the night they move something, and they freeze when you go back to day. So your clock-ins are a resource, and each level has a par.
>
> I designed it and built it with AI assistance, so I made it provable. The game rules are a pure function with no DOM and no clock, which means the tests play the real game headless: every collision edge case, every prank, and a scripted solution proving each level can be won at par. No engine, no assets. Everything is drawn and synthesized in code, and it runs in the browser.
