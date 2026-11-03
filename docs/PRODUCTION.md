# Production Plan

Companion to [GDD.md](GDD.md) §16–17. Status as of **2026-11-03**.

**At a glance**
- **Next milestone:** M0 Feel check (Nov 2–3): play all 12 levels, Sticky Keys test, tuning. Repo + CI are done.
- **The build plan (Nov 3):** seven milestone PRs: foundations, a quality and identity pass, Upside Down, tier B, act 5 and the finale, copy and stretch, release ([BUILD.md](BUILD.md) §3).
- **The game:** 21 levels, five acts of four plus the finale; 12 built (tier A), tier B = 17, tier C = 21 ([CONTENT.md](CONTENT.md), LEVELS.md §5.0).
- **Level audit (Nov 2):** every level beatable at par, fair timing (≥ 200/100 ms), no skips, no respawn loops; `npm run audit` keeps it that way.
- **Key P0 items:** tuning, level select, music, freaks in the first minutes, freak art, media, itch page (§4). `stacked` + `clockout` done.
- **Cut dates:** Upside Down proven (`upside` at par) Nov 18; content freeze Nov 22 (§2). The four earlier mechanics shipped.

## 1. Where we are

| Area | State |
|---|---|
| Core rules (move, jump, shift, buffer/nudge, coyote, jump buffer) | Built, tested |
| Pranks (Nth night entry, tells, checkpoint restore) | Built, tested |
| Freaks: lurker, peeker, squatter, supervisor (frozen by day), day-walker (frozen by night) | Built, tested |
| Levels | **<!-- n:levels -->16<!-- /n --> built** (act 1: 4, act 2: 4, act 3: 4, act 4: 2, act 5: 1, finale: 1), all proven solvable at par and fair; **tier A (jam minimum) complete** with `stacked` and `clockout`. Tier-C mechanics shipped. 5 tier-B levels planned (CONTENT.md) |
| Rendering | **Pixel art** (Nov 2): sprites, animated worker and freaks, pixel tiles and props, pixel font, effects; every asset in `/tools/gallery.html` |
| Audio | Mix bus, 25 SFX (incl. planned-level sounds), **music** (day/night arrangements crossfading on every shift) |
| Menus | Title, level select + saved bests, settings (volumes, reduced effects), act cards, pause, timecard with comment, end screen with totals |
| Tests | <!-- n:tests -->251<!-- /n --> passing (`npm test`), including fairness; `npm run audit` clean |
| Repo / CI / itch | Public repo [FishRaposo/double-shift](https://github.com/FishRaposo/double-shift), CI green, playable on [GitHub Pages](https://fishraposo.github.io/double-shift/). **No itch page** |

## 2. Milestones

The whole game is listed in [CONTENT.md](CONTENT.md): **21 levels, five acts of four plus the finale**, in tiers (A = the 12 built, B = 17, C = 21) with dated cut lines.

| Date | Milestone | Exit criterion (must be true to move on) |
|---|---|---|
| **Nov 2–3** | **M0: Feel check** | Fish has played all 12 built levels on Windows. Sticky Keys result recorded. Movement tuning pass done. ~~Public GitHub repo with CI green~~ (done). |
| **Nov 8** | **M1: Core locked** | Shift, freeze and prank feel good to Fish. One cold playtest, on the build with the quality and identity pass (PR 2). `PARAMS` frozen except small tweaks. |
| **Nov 11** | **Upside Down in** | PR 3: the gravity flip (rules, tests, drawing) works, `upside` is proven at par, act 5 and finale cards are in. Fish's feel check decides whether act 5 stays. |
| **Nov 15** | **M2: Tier B complete** | 18 levels playable: + `stairs`, `doors`, `pillar`, `portrait`, `audit`, all fair (`npm run audit`). |
| **Nov 18** | **Cut date: Upside Down** | If the flip isn't readable and proven by now, act 5 and the finale rework move to post-jam (the game ships 17 levels with today's Clock Out). |
| **Nov 22** | **M3: Content freeze** | 21 levels (or the tier that held), all proven at par and fair; finale rework in; all copy in. Second playtest round. **No new levels, copy or art after this date.** Stretch features that don't touch levels may land until Nov 26 if every gate passes (decided Nov 3; flagged for Fish). |
| **Nov 26** | **M4: Release candidate** | Bug-free on Chrome/Firefox/Edge. itch draft with fresh cover, screenshots, GIF. |
| **Nov 30** | **M5: Submitted** | itch page public, submitted to the jam, repo linked, played from the itch page itself. |
| Dec 1 18:37 BRT | Jam deadline | — (buffer day; only emergency fixes) |

**Jam scoring** (GDD §1.8): Overall, Gameplay, Graphics, Audio, Innovation and Theme are rated by other entrants. Priorities below keep every category covered.

**Cut line (tiers).** Tier A (the 12 built) is a complete game today. Tier B ships if M2 holds. Tier C ships only if the gravity flip made its date. Cut levels move to post-jam; the remaining levels keep their order, and today's Clock Out is always the fallback finale. A polished shorter game beats an unfinished long one.

## 3. Weekly plan

### Week 1 (Nov 2–8): foundations and the quality and identity pass
- Fish plays everything on Windows; record the Sticky Keys result in GDD §3.2.
- Tuning pass on `PARAMS` (TECH.md §4), then re-prove pars and fairness (`npm test`, `npm run audit`).
- PR 1 (Nov 5): levels by id, cloud-ready media, doc counts, the 6-act shell and credits, skins and sound hooks (BUILD.md T17, T18, T14, T1, T15).
- PR 2 (Nov 8): the quality audit, readability tests, the visual identity pass and per-act backdrops (BUILD.md T19–T21).
- First cold playtest on the PR 2 build, with the 5-second test (PLAYTEST.md).

### Week 2 (Nov 9–15): Upside Down and tier B
- PR 3 (Nov 11): the gravity flip (tests first), `upside`, act 5 and finale cards (BUILD.md T7, T8, T13).
- PR 4 (Nov 15): `stairs`, `doors`, `pillar`, `portrait`, `audit` (LEVELS.md §5).
- → **M2 Nov 15: 18 levels.**

### Week 3 (Nov 16–22): act 5, the finale, copy and stretch
- PR 5 (Nov 20): `fallup`, `ceiling`, `heels`, the finale rework with today's Clock Out kept as the fallback (LEVELS.md §5.2–5.3).
- PR 6 (Nov 22): memos, tells and the Sticky Keys memo; the stretch features (music layers, rebinding, gamepad, timer).
- Second playtest round on the full run.
- → **M3 content freeze Nov 22: 21 levels.**

### Week 4 (Nov 23–30): polish and ship
- Bug fixing from playtests; GDD §13.7 edge cases in the browser.
- PR 7 (Nov 27): `npm run gif` and `npm run media` for a fresh cover, screenshots and GIFs (A9); the release refresh (BUILD.md T16, T25).
- itch page from [itch/page.md](../itch/page.md): update the level count and description to what shipped, draft → play on the page → Public → submit.
- Devlog #1; X posts (Fish writes the final words).
- First-60-seconds check from the itch embed (RELEASE.md §5).

### Voting (Dec 1 – Jan 1)
- Build freeze: critical fixes only, each with a note (RELEASE.md §6).
- Ratings campaign: rate 30+ entries in week 1 with real comments; reply to every comment; goal ≥ 25 ratings.

## 4. Backlog

Priority: **P0** = the game doesn't ship without it. **P1** = expected in the jam build. **P2** = only if ahead of schedule. **Post** = after the jam.

### Gameplay and rules
| ID | Item | Pri | Notes |
|---|---|---|---|
| G1 | Movement tuning pass | P0 | TECH.md §4; play-feel, not tests |
| G2 | Sticky Keys test + primary bind decision | P0 | GDD §3.2 |
| G3 | Checkpoints used in longer levels | P0 | Used in Mid-Air, Wet Floor, Night Management, Broad Daylight; a checkpoint saves only in a shift with floor under it (fixed 2026-11-02) |
| G4 | ~~Wet floor tile `~`~~ Done | Tier C, cut Nov 12 | TECH.md §6.5; level `wet` |
| G5 | Multiple pranks per level, ordering puzzles | P0 | System supports it; used by `stacked` (tier A), `doors`, `pillar`, `portrait` |
| G6 | Prank types beyond tile swaps (e.g. move a freak, flip a hazard) | P2 | Keep deterministic |
| G7 | Scatterer freak (real-time geometry change) | Post | GDD §4.10 |
| G8 | ~~Day-walker freak + day-only clock~~ Done | Tier C, cut Nov 12 | TECH.md §6.5; level `daywalker` |
| G9 | ~~Offset layer~~ Done | Tier C, cut Nov 17 | TECH.md §6.5; level `offset` |
| G10 | Shared-state objects (levers/doors) | Post | GDD §8.2 |
| G11 | Gamepad support | P2, planned (Fish approved the stretch features Nov 3) | `src/pad.js` turns Gamepad API polling into key events (BUILD.md T24) |
| G12 | Rebindable controls | P2, planned | `src/keys.js`, a CONTROLS screen (BUILD.md T24); GDD §12.5 |
| G13 | Speedrun timer display | P2, planned | A TIMER setting; `state.time` already tracked (BUILD.md T24) |
| G14 | Sticky Keys in-joke (memo from the freaks on title/pause, practical advice kept) | P1 | GDD §1.7; the jam page jokes about it too |
| G16 | Upside Down: night = map flipped, gravity up (act 5's four levels + the finale rework) | Tier C, cut Nov 18 | TECH.md §6.5; LEVELS.md §5.2 |
| G15 | ~~Supervisor freak (facing decides which freaks work)~~ Done | Tier C, cut Nov 17 | TECH.md §6.5; level `supervisor` |

### Levels
| ID | Item | Pri |
|---|---|---|
| L1 | Polish pass on the built levels after playtest | P0 |
| L2 | ~~`stairs` *Under Renovation*~~ done Nov 3, par 2 | Tier B |
| L3 | ~~`doors` *Lost & Found*~~ done Nov 3, par 5 | Tier B |
| L4 | ~~`stacked` *Stacked*~~ Done Nov 2, par 5 | **Tier A** (jam minimum) |
| L5 | ~~`clockout` *Clock Out*~~ Done Nov 2, par 7, with the ending | **Tier A** (jam minimum) |
| L6 | ~~`pillar` *Structural Integrity*~~ done Nov 3, par 3; `portrait` *Employee of the Month* | Tier B |
| L12 | `audit` *Night Audit* (act 4 exam, #16) | Tier B |
| L13 | ~~`upside` *Mind Your Head*~~ done Nov 3, par 2; `fallup` *Falling Up*, `ceiling` *Ceiling Walker* (act 5) | Tier C, cut Nov 18 |
| L14 | `heels` *Head Over Heels* (act 5 combination, #20) | Tier C |
| L15 | Finale rework: Clock Out upside down, one room per act (LEVELS.md §5.3) | Tier C (fallback: today's Clock Out) |
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
| A3 | ~~Background props~~ Done Nov 2 for all 12 built levels; new levels add theirs | P1 |
| A4 | Camera or room decision implemented | P0 |
| A5 | ~~Music: day + night arrangement with crossfade~~ Done Nov 2 | P0 |
| A6 | ~~Settings menu~~ Done Nov 2 | P1 |
| A7 | ~~Level select + save, reachable from the title screen so raters can jump to the freak levels~~ Done Nov 2: act starts always open, saved bests | **P0** (was P1; GDD §1.8) |
| A8 | ~~Timecard comments, end-screen totals~~ Done Nov 2 | P1 |
| A9 | Cover 1260×1000, screenshots, demo GIF (`npm run media`; GIF planned) | P0 |
| A10 | ~~Act title cards~~ Done Nov 2 | P1 |

### Infrastructure and release
| ID | Item | Pri |
|---|---|---|
| R1 | Public GitHub repo, MIT license, README | P0 |
| R2 | CI workflow (`.github/workflows/ci.yml`) | P0 |
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
| Primary shift bind | Shift vs K | Decided by the Sticky Keys test | Nov 3 |
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
