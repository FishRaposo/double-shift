# Double Shift

**One building. Two shifts. One worker.**

A puzzle-platformer for [GitHub Game Off 2026](https://itch.io/jam/game-off-2026) (theme: **SHIFT**). You work the day shift and the night shift in the same building at once. Press Shift to step between them, mid-jump if you like. Things changed between shifts: the day crew's scaffolding catches you, the night's locked gate isn't down yet. And every time you clock into the night shift, **the freaks** have moved something. Nobody knows what they are. They giggle. Finish each level clocking in as few times as possible.

*The freaks come out at night.*

> Status: **prototype**, 6 levels (act 1 + the first two freak levels). Design: [`docs/GDD.md`](docs/GDD.md) (v0.3). Production docs (schedule, tech, levels, art, audio, writing, playtest, release): [`docs/INDEX.md`](docs/INDEX.md).

## Play

Serve the folder over HTTP (ES modules don't load from `file://`):

```sh
npm run serve        # http://localhost:8080
```

URL options: `?level=3` start at a level, `?autostart` skip the title, `?debug` show the collision/state overlay (toggle with `` ` ``).

## Controls

| Action | Keys |
|---|---|
| Move | A / D, ← / → |
| Jump | Space, W, ↑ (hold for higher) |
| Change shift | Shift (either), K |
| Restart level | R |
| Pause | Esc |
| Mute | M |

On Windows, hammering Shift can open the Sticky Keys prompt. Use K, or turn off the Sticky Keys shortcut.

## How it's built

- Plain JavaScript ES modules on a 2D canvas. No engine, no dependencies, no asset files; sound is synthesized with WebAudio.
- **Rules are pure.** `src/rules.js` has no DOM and no clock: `step(level, state, input)` returns the next state at a fixed 120 Hz. The screen only draws what the rules decided, so the tests run the real game headless.
- **Shift rules** (GDD §3.3): same coordinates, momentum kept, no cooldown, one shift per key press. A shift into solid geometry tries a ≤4 px corner nudge, then buffers for 80 ms, then is rejected without touching the player.
- **The freaks** (GDD §4.8–4.10): pranks fire on the Nth entry into night and change tiles; visible freaks (lurker, peeker, squatter) follow fixed patterns on a clock that only runs on the night shift, so switching to day freezes them. No AI; everything is deterministic.
- Levels are two ASCII grids (day, night) plus optional pranks and freaks in `src/levels.js`.

```
src/rules.js    pure game rules
src/levels.js   level data
src/input.js    key events → per-tick input (no DOM)
src/main.js     loop + rendering
src/audio.js    synthesized sfx
test/           node --test suites
scripts/        check, zip for itch, browser smoke test
```

## Tests

```sh
npm test         # 42 tests: GDD §13.7 shift/collision edge cases, pranks and freaks, input rules,
                 # every level solvable at par and unwinnable without shifting
npm run check    # syntax + level validation
```

`scripts/smoke.mjs` plays level 1 in headless Chromium with real key events and saves screenshots; it needs Playwright installed (`node scripts/smoke.mjs http://localhost:8080/ media`).

## How it was made

Designed by Vinícius Raposo. Built with AI assistance (Claude) to his design document, and tested like production software.

## License

MIT
