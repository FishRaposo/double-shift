# Production Plan

Companion to [GDD.md](GDD.md) §16–17. Status as of **2026-11-05**.

**At a glance**
- **Next for Fish:** play the full run (all 21 levels), including the Upside Down feel check, the Sticky Keys test and tuning (M0), then playtest round 1 by Nov 8. Repo + CI are done.
- **The build:** all seven milestone PRs and the cohesion pass (Nov 5) are in ([BUILD.md](BUILD.md) records them). The plan's code is finished; what's left is playing it, tuning, playtests and the itch page.
- **The game:** 21 levels, five acts of four plus the finale, all built ([CONTENT.md](CONTENT.md), LEVELS.md §5.0).
- **Level audit (Nov 5, all 21):** every level beatable at par, fair timing (≥ 200/100 ms), no respawn loops, and a random search in both directions finds no win below par; `npm run audit` keeps it that way.
- **Open P0 items:** tuning (Fish's feel check), the playtest rounds, the itch page (§4). Level select, music, freak art and the media kit are built.
- **Content freeze:** Nov 22 (§2). Nothing is left to cut: every mechanic shipped.

## 1. Where we are

| Area | State |
|---|---|
| Core rules (move, jump, shift, buffer/nudge, coyote, jump buffer) | Built, tested |
| Pranks (Nth night entry, tells, checkpoint restore) | Built, tested |
| Freaks: lurker, peeker, squatter, supervisor (frozen by day), day-walker (frozen by night) | Built, tested |
| Levels | **<!-- n:levels -->21<!-- /n --> built** (act 1: 4, act 2: 4, act 3: 4, act 4: 4, act 5: 4, finale: 1), all proven solvable at par and fair. LEVEls built (Nov 3); act 5's other three levels and the finale rework planned (CONTENT.md) |
| Rendering | **Pixel art** (Nov 2): sprites, animated worker and freaks, pixel tiles and props, pixel font, effects; every asset in `/tools/gallery.html` |
| Audio | Mix bus, 28 SFX (`lurkerStep` left unwired, AUDIO.md §4.1), **music** (day/night arrangements crossfading on every shift; each act adds a layer) |
| Menus | Title, level select + saved bests, settings (volumes, reduced effects, speedrun timer, controls), act cards, pause, timecard with comment, end screen with totals and the run time |
| Input | Keyboard (move, jump and shift rebindable) and gamepad (fixed standard mapping) |
| Release kit | Cover, 20 screenshots and the demo GIF tool (`npm run media`, `npm run gif`); the zipped build passes the browser smoke test |
| Tests | <!-- n:tests -->537<!-- /n --> passing (`npm test`), including fairness; `npm run audit` clean |
| Repo / CI / itch | Public repo [FishRaposo/double-shift](https://github.com/FishRaposo/double-shift), CI green, playable on [GitHub Pages](https://fishraposo.github.io/double-shift/). **No itch page** |

## 2. Milestones

The whole game is listed in [CONTENT.md](CONTENT.md): **21 levels, five acts of four plus the finale**, all built.

| Date | Milestone | Exit criterion (must be true to move on) |
|---|---|---|
| **Nov 3** | ~~Build complete~~ | ~~All 21 levels, Upside Down, the finale rework, copy, stretch features, release kit~~ (done, PR #1) |
| **Nov 5** | ~~Cohesion pass~~ | ~~Every known issue fixed, the route search runs both ways, act 5 rehearses the finale, docs synced~~ (done) |
| **Nov 8** | **M0 + M1: Feel check and core locked** | Fish has played all 21 levels on Windows. Sticky Keys result recorded. Shift, freeze, prank and the flip feel good. One cold playtest. `PARAMS` frozen except small tweaks. |
| **Nov 22** | **M3: Content freeze** | Copy and art final, second playtest round done. **No new levels, copy or art after this date.** |
| **Nov 26** | **M4: Release candidate** | Bug-free on Chrome/Firefox/Edge. itch draft with fresh cover, screenshots, GIF. |
| **Nov 30** | **M5: Submitted** | itch page public, submitted to the jam, repo linked, played from the itch page itself. |
| Dec 1 18:37 BRT | Jam deadline | — (buffer day; only emergency fixes) |

**Jam scoring** (GDD §1.8): Overall, Gameplay, Graphics, Audio, Innovation and Theme are rated by other entrants. Priorities below keep every category covered.

## 3. Weekly plan

### Now to Nov 8: feel
- Fish plays everything on Windows; record the Sticky Keys result in GDD §3.2.
- Tuning pass on `PARAMS` (TECH.md §4), then re-prove pars and fairness (`npm test`, `npm run audit`).
- First cold playtest, with the 5-second test (PLAYTEST.md).

### Nov 9–22: playtest fixes and copy
- Fix what the playtests find; Fish's pass on the copy (WRITING.md) and the "Look first" rulings.
- Second playtest round on the full run.
- → **M3 content freeze Nov 22.**

### Nov 23–30: polish and ship
- Bug fixing from playtests; GDD §13.7 edge cases in the browser.
- `npm run gif` and `npm run media` for a fresh cover, screenshots and GIFs (A9).
- itch page from [itch/page.md](../itch/page.md): draft → play on the page → Public → submit.
- Devlog #1; X posts (Fish writes the final words).
- First-60-seconds check from the itch embed (RELEASE.md §5).

## 4. Backlog

Priority: **P0** = the game doesn't ship without it. **P1** = expected in the jam build. **P2** = only if ahead of schedule. **Post** = after the jam.

### Gameplay and rules
| ID | Item | Pri | Notes |
|---|---|---|---|
| G1 | Movement tuning pass | P0 | TECH.md §4; play-feel, not tests |
| G2 | Sticky Keys test + primary bind decision | P0 | GDD §3.2 |
| G3 | Checkpoints used in longer levels | P0 | Used in `midair`, `doors`, `wet`, `supervisor`, `stacked`, `daywalker`, `audit` and all of act 5 and the finale; a checkpoint saves only in a shift with floor under it (fixed 2026-11-02) |
| G4 | ~~Wet floor tile `~`~~ Done | Done | TECH.md §6.5; level `wet` |
| G5 | Multiple pranks per level, ordering puzzles | P0 | System supports it; used by `stacked` (tier A), `doors`, `pillar`, `portrait` |
| G6 | Prank types beyond tile swaps (e.g. move a freak, flip a hazard) | P2 | Keep deterministic |
| G7 | Scatterer freak (real-time geometry change) | Post | GDD §4.10 |
| G8 | ~~Day-walker freak + day-only clock~~ Done | Done | TECH.md §6.5; level `daywalker` |
| G9 | ~~Offset layer~~ Done | Done | TECH.md §6.5; level `offset` |
| G10 | Shared-state objects (levers/doors) | Post | GDD §8.2 |
| G11 | ~~Gamepad support~~ done Nov 3 | P2 (Fish approved the stretch features Nov 3) | `src/pad.js` turns Gamepad API polling into key events (BUILD.md T24) |
| G12 | ~~Rebindable controls~~ done Nov 3 | P2 | `src/keys.js`, a CONTROLS screen (BUILD.md T24); GDD §12.5 |
| G13 | ~~Speedrun timer display~~ done Nov 3 | P2 | A TIMER setting; `state.time` already tracked (BUILD.md T24) |
| G14 | ~~Sticky Keys in-joke (memo from the freaks on title/pause, practical advice kept)~~ done Nov 3, on the title | P1 | GDD §1.7; the jam page jokes about it too |
| G16 | ~~Upside Down: night = map flipped, gravity up~~ done Nov 3 | Done | TECH.md §6.5; LEVELS.md §5.2 |
| G15 | ~~Supervisor freak (facing decides which freaks work)~~ Done | Done | TECH.md §6.5; level `supervisor` |

### Levels
| ID | Item | Pri |
|---|---|---|
| L1 | Polish pass on the built levels after playtest | P0 |
| L2 | ~~`stairs` *Under Renovation*~~ done Nov 3, par 2 | Tier B |
| L3 | ~~`doors` *Lost & Found*~~ done Nov 3, par 5 | Tier B |
| L4 | ~~`stacked` *Stacked*~~ Done Nov 2, par 5 | **Tier A** (jam minimum) |
| L5 | ~~`clockout` *Clock Out*~~ Done Nov 2, par 7, with the ending | **Tier A** (jam minimum) |
| L6 | ~~`pillar` *Structural Integrity*, `portrait` *Employee of the Month*~~ done Nov 3, par 3 each | Tier B |
| L12 | ~~`audit` *Night Audit* (act 4 exam, #16)~~ done Nov 3, par 5 | Tier B |
| L13 | ~~`upside` *Mind Your Head*, `fallup` *Falling Up*, `ceiling` *Ceiling Walker*~~ done Nov 3, par 2, 4 and 4 | Done |
| L14 | ~~`heels` *Head Over Heels* (act 5 combination, #20)~~ done Nov 3, par 7 | Tier C |
| L15 | ~~Finale rework: Clock Out upside down, one room per act (LEVELS.md §5.3)~~ done Nov 3, par 7, `rev: 2` | Tier C (fallback: `CLOCKOUT_CLASSIC`) |
| L9 | ~~`wet` *Wet Floor*, `daywalker` *Broad Daylight*~~ done | Tier C |
| L10 | ~~`supervisor` *Night Management*, `offset` *Floor 3.5*~~ done | Tier C |
| L11 | *Freight* | Post |
| L7 | Re-verify every par with scripted solutions after any tuning change | P0 |
| L8 | ~~Show the freaks before raters quit: evidence on the first night shift~~ done: peeker behind Clock In's gate, eyes in Scaffolding, frozen peeker by Closing Time's exit | ~~P0~~ |

### Presentation
| ID | Item | Pri |
|---|---|---|
| A1 | ~~Freak art pass~~ Done Nov 2 (pixel sprites, eyes, squint, freeze cue); freak size still to confirm in playtest | P0 |
| A2 | ~~Worker animation~~ Done Nov 2 (run, jump, fall, land, spooked boots gag) | P1 |
| A3 | ~~Background props~~ Done for all 21 levels | P1 |
| A4 | ~~Camera or room decision~~ single-screen rooms, decided Nov 3 | P0 |
| A5 | ~~Music: day + night arrangement with crossfade~~ Done Nov 2 | P0 |
| A6 | ~~Settings menu~~ Done Nov 2 | P1 |
| A7 | ~~Level select + save, reachable from the title screen so raters can jump to the freak levels~~ Done Nov 2: act starts always open, saved bests | **P0** (was P1; GDD §1.8) |
| A8 | ~~Timecard comments, end-screen totals~~ Done Nov 2 | P1 |
| A9 | Cover 1260×1000, screenshots, demo GIF (`npm run media`, `npm run gif`) | P0 |
| A10 | ~~Act title cards~~ Done Nov 2 | P1 |

### Infrastructure and release
| ID | Item | Pri |
|---|---|---|
| R1 | ~~Public GitHub repo, MIT license, README~~ Done | P0 |
| R2 | ~~CI workflow (`.github/workflows/ci.yml`)~~ Done | P0 |
| R3 | ~~GitHub Pages build (secondary play link)~~ Done Nov 2 | P1 |
| R4 | itch page, AI disclosure, tags | P0 |
| R5 | Jam submission + repo link | P0 |
| R6 | Devlog #1 (launch), #2 (post-jam) | P1 |
| R7 | Task pack (bugs/features with checks), like Recall/Wick/Thaw | Post |

## 5. Open decisions (owner: Fish)

| Decision | Options | Recommendation | Deadline |
|---|---|---|---|
| ~~Camera~~ | Single-screen rooms vs scrolling levels with camera | **Decided Nov 3: single-screen rooms.** Every planned level fits 32×18, which keeps puzzles readable at a glance and both maps fully visible. | — |
| Freeze scope | Freeze everything on Nov 22, or let stretch features that don't touch levels land until Nov 26 | Let them land until Nov 26 if every gate passes, else cut them (timer → gamepad → rebinding → music layers). In the plan; Fish can overrule. | Nov 22 |
| ~~Finale in level select~~ | Always open (like every act start) vs locked until act 5 is cleared | **Decided Nov 3 (Fish): always open.** | — |
| Primary shift bind | Shift vs K | Decided by the Sticky Keys test | Nov 8 |
| Subtitle | *The Freaks Come Out at Night* vs none | Keep: it's the tone in one line and helps itch title search | Nov 22 |
| Freak size | 20×22 (current) vs worker-sized or bigger | Decide after first playtest | Nov 8 |
| ~~Design partner involvement~~ | **Decided 2026-11-01: code-drawn only for the jam**, polished as a deliberate style (GDD §10.1, ART.md §1.1) | — | Closed |

## 6. Definition of done (jam build)

All of GDD §17.1, plus:

- [ ] Every level solvable at par by a scripted run (`npm test`).
- [ ] No level winnable without shifting.
- [ ] No console errors in Chrome, Firefox, Edge.
- [ ] Playable from the itch page in a fresh browser profile.
- [ ] README, GDD and these docs match the shipped build (counts, levels, controls).
- [ ] Public repo pushed before 13:37 PST Dec 1.
