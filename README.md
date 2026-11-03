# Double Shift

[![ci](https://github.com/FishRaposo/double-shift/actions/workflows/ci.yml/badge.svg)](https://github.com/FishRaposo/double-shift/actions/workflows/ci.yml)

**Every time you clock into the night shift, the freaks move something.**

A puzzle-platformer for [GitHub Game Off 2026](https://itch.io/jam/game-off-2026) (theme: **SHIFT**). You work the day shift and the night shift in the same building at once. Press Shift to step between them, mid-jump if you like. Things changed between shifts: the day crew's scaffolding catches you, the night's locked gate isn't down yet. But each clock-in gives **the freaks** another chance to prank the building, and each freak only moves on its own shift: step into the other one and it freezes mid-stride. Nobody knows what they are. They giggle. Finish each level clocking in as few times as possible.

*The freaks come out at night.*

**Play in the browser: [fishraposo.github.io/double-shift](https://fishraposo.github.io/double-shift/)** (the itch.io page comes at jam submission).

> Status: **prototype**, <!-- n:levels -->13<!-- /n --> levels from Clock In to the Clock Out finale, act 5 (Upside Down) started: the jam minimum is complete, and all five new mechanics shipped. Design: [`docs/GDD.md`](docs/GDD.md) (v0.6; the full plan is 21 levels in five acts). How and why it was built: [`docs/DESIGN.md`](docs/DESIGN.md). Production docs (schedule, tech, levels, art, audio, writing, playtest, release): [`docs/INDEX.md`](docs/INDEX.md).

## Game Off 2026

- **Jam:** [GitHub Game Off 2026](https://itch.io/jam/game-off-2026), Nov 1 – Dec 1, 2026. Theme: **SHIFT**.
- **The theme, three ways:** the Shift key is the only new verb; the work shift is the story; and the building itself shifts, because the freaks move things between your shifts.
- **Timeline:** design and code started on Nov 1, 2026, after the theme was announced. Everything in this repo was made during the jam.
- **AI use:** the code was written with AI assistance (Claude) to the design document, and in-game text was drafted with AI assistance. Graphics and sound are drawn and synthesized by code; no image or audio models.

## Play locally

Needs [Node.js](https://nodejs.org) 22 or newer; nothing to install.

- **Windows:** double-click `play.bat`.
- **Any OS:** `npm start` serves the game and opens it in your browser.
- `npm run serve` does the same without opening a browser.

The server runs at http://localhost:8080 (it picks the next free port if 8080 is busy). Nothing is cached, so edit a file and reload. Opening `index.html` directly from the folder won't work, because browsers block ES modules on `file://`.

URL options: `?level=offset` start at a level by id (or by position, `?level=3`), `?autostart` skip the title, `?debug` show the collision/state overlay (toggle with `` ` ``).

## Controls

| Action | Keys |
|---|---|
| Move | A / D, ← / → |
| Jump | Space, W, ↑ (hold for higher) |
| Change shift | Shift (either), K |
| Restart level | R |
| Level select | L (title or pause), or click LEVEL SELECT |
| Settings (volumes, reduced effects) | O (title or pause), or click SETTINGS |
| Pause | Esc |
| Mute | M |

On Windows, hammering Shift can open the Sticky Keys prompt. Use K, or turn off the Sticky Keys shortcut.

## How it's built

- Plain JavaScript ES modules on a 2D canvas. No engine, no dependencies, no asset files.
- **Pixel art, a pixel font and music, all made in code.** Sprites are string grids drawn on a 2-px grid; tiles, props and effects are drawn procedurally; the font is hand-made 5×7 glyphs. The music is a 16-bar theme in two arrangements (jaunty by day, a theremin in the minor mode by night) that crossfade on every shift. Every asset is in the gallery: `/tools/gallery.html`.
- **Rules are pure.** `src/rules.js` has no DOM and no clock: `step(level, state, input)` returns the next state at a fixed 120 Hz. The screen only draws what the rules decided, so the tests run the real game headless.
- **Shift rules** (GDD §3.3): same coordinates, momentum kept, no cooldown, one shift per key press. A shift into solid geometry tries a ≤4 px corner nudge, then buffers for 80 ms, then is rejected without touching the player.
- **The freaks** (GDD §4.8–4.10): pranks fire on the Nth entry into night and change tiles; visible freaks (lurker, peeker, squatter, supervisor, day-walker) follow fixed patterns on a clock that only runs on their own shift, so switching shifts freezes them. No AI; everything is deterministic.
- Levels are two ASCII grids (day, night) plus optional pranks, freaks and props in `src/levels.js`; an offset level generates its night grid from the day one.

```
src/rules.js    pure game rules
src/levels.js   level data (grids, pranks, freaks, props)
src/input.js    key events → per-tick input (no DOM)
src/main.js     loop, screens, rendering
src/sprites.js  pixel sprites (worker, freaks) + frame selection
src/art.js      tiles, props, effects, UI pieces
src/font.js     the pixel font
src/audio.js    mix bus + every sound effect as data
src/music.js    the theme and its two arrangements
src/save.js     saved progress and settings
src/copy.js     result-based lines (timecard comments, act cards, credits)
src/layout.js   level addressing, level select and end-screen layout (no DOM)
tools/          asset gallery, itch cover
test/           node --test suites
scripts/        serve, check, zip for itch, media + headless checks
```

## Tests

The suite has <!-- n:tests -->227<!-- /n --> tests.

```sh
npm test         # GDD §13.7 shift/collision edge cases, pranks and freaks, wet floor, day/night
                 # freak clocks, supervisor watched clock, offset layers, input rules, saving,
                 # every level solvable at par and unwinnable without shifting, font/sprite/music data
npm run check    # syntax + level validation
npm run audit    # per-level fairness: timing slack of every required input, input-lag tolerance, below-par search
npm run counts   # every count in the docs matches the code (-- --write fixes them)
```

`npm run media` drives headless Edge/Chrome (no dependencies): it plays level 1 with real key presses, saves the itch cover and screenshots, captures the asset gallery, checks the audio for clipping and measures the draw cost of a frame.

## How it was made

Designed by Vinícius Raposo. Built with AI assistance (Claude) to his design document, and tested like production software.

## License

MIT
