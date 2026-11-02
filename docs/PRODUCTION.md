# Production Plan

Companion to [GDD.md](GDD.md) §16–17. Status as of **2026-11-02**.

**At a glance**
- **Next milestone:** M0 Feel check (Nov 2–3): play all 6 levels, Sticky Keys test, tuning. Repo + CI are done.
- **The game:** 16 levels in four acts, in tiers A = 8 / B = 12 / C = 16 ([CONTENT.md](CONTENT.md)).
- **Key P0 items:** tuning, level select, music, freaks in the first minutes, freak art, `stacked` + `clockout`, media, itch page (§4).
- **Cut dates:** wet floor + day-walker Nov 12; supervisor + offset Nov 17; content freeze Nov 22 (§2).

## 1. Where we are

| Area | State |
|---|---|
| Core rules (move, jump, shift, buffer/nudge, coyote, jump buffer) | Built, tested |
| Pranks (Nth night entry, tells, checkpoint restore) | Built, tested |
| Freaks: lurker, peeker, squatter (frozen by day) | Built, tested |
| Levels | 6 built (act 1: 4, act 2: 2), all proven solvable at par; 10 more planned (CONTENT.md) |
| Rendering | **Pixel art** (Nov 2): sprites, animated worker and freaks, pixel tiles and props, pixel font, effects; every asset in `/tools/gallery.html` |
| Audio | Mix bus, 26 SFX (incl. planned-level sounds), **music** (day/night arrangements crossfading on every shift) |
| Menus | Title, level select + saved bests, settings (volumes, reduced effects), act cards, pause, timecard with comment, end screen with totals |
| Tests | 60 passing (`npm test`) |
| Repo / CI / itch | Public repo [FishRaposo/double-shift](https://github.com/FishRaposo/double-shift), CI green, playable on [GitHub Pages](https://fishraposo.github.io/double-shift/). **No itch page** |

## 2. Milestones

The whole game is listed in [CONTENT.md](CONTENT.md): **16 levels in tiers** (A = 8, B = 12, C = 16) with dated cut lines.

| Date | Milestone | Exit criterion (must be true to move on) |
|---|---|---|
| **Nov 2–3** | **M0: Feel check** | Fish has played all 6 levels on Windows. Sticky Keys result recorded. Movement tuning pass done. ~~Public GitHub repo with CI green~~ (done). |
| **Nov 8** | **M1: Core locked** | Shift, freeze and prank feel good to Fish. One cold playtest. `PARAMS` frozen except small tweaks. Level select + save in. `stairs` and `doors` built and at par. |
| **Nov 12** | **Cut date 1** | Wet floor and day-walker done (rules, tests, drawing), or `wet` / `daywalker` move to post-jam. |
| **Nov 15** | **M2: Tier B complete** | 12-level path playable (6 built + `stairs`, `doors`, `pillar`, `portrait`), plus `wet` and `daywalker` if they made cut 1. Music v1. Freak art pass. |
| **Nov 17** | **Cut date 2** | Supervisor and offset layer done, or `supervisor` / `offset` move to post-jam. If M2 itself slipped, drop to tier A now. |
| **Nov 22** | **M3: Content freeze** | Every level that's still in is built and proven at par, including `stacked` and `clockout`. Act cards, timecard comments, settings, all copy in. Second playtest round. **No new features after this date.** |
| **Nov 26** | **M4: Release candidate** | Bug-free on Chrome/Firefox/Edge. itch draft with fresh cover, screenshots, GIF. |
| **Nov 30** | **M5: Submitted** | itch page public, submitted to the jam, repo linked, played from the itch page itself. |
| Dec 1 18:37 BRT | Jam deadline | — (buffer day; only emergency fixes) |

**Jam scoring** (GDD §1.8): Overall, Gameplay, Graphics, Audio, Innovation and Theme are rated by other entrants. Priorities below keep every category covered: that's why music, level select and showing the freaks early are P0.

**Cut line (tiers).** Tier A always ships: the 6 built levels + `stacked` + `clockout`. Tier B ships if M2 holds. Each tier-C level ships only if its mechanic made its cut date. Cut levels move to post-jam; the remaining levels keep their order. A polished shorter game beats an unfinished long one.

## 3. Weekly plan

### Week 1 (Nov 2–8): feel, shell, first new levels
- Play everything on Windows; record the Sticky Keys result in GDD §3.2 (decides Shift vs K as the primary bind).
- Tuning pass on `PARAMS` (TECH.md §4), then re-prove pars (`npm test`).
- ~~Level select + save (A7)~~ done Nov 2. Freak evidence from the first night shift (L8).
- Build `stairs` and `doors` (LEVELS.md §5).
- Start music (A5): sequencer + day arrangement.
- Start wet floor and day-walker **tests** (TECH.md §6.5).
- First cold playtest on what exists.

### Week 2 (Nov 9–15): mechanics batch 1 and tier B
- Finish **wet floor + day-walker by Nov 12** (cut date 1); build `wet`, `daywalker`.
- Build `pillar`, `portrait`.
- Music v1: night arrangement + crossfade.
- Freak art pass (A1) and worker animation (A2).
- Start supervisor and offset **tests**.
- → **M2 Nov 15.**

### Week 3 (Nov 16–22): mechanics batch 2 and content freeze
- Finish **supervisor + offset layer by Nov 17** (cut date 2); build `supervisor`, `offset`.
- Build `stacked` and `clockout` (tier A: these never slip).
- Act cards (A10), timecard comments and end-screen totals (A8), settings (A6), props (A3), memos.
- Second playtest round on the full run.
- → **M3 content freeze Nov 22.**

### Week 4 (Nov 23–30): polish and ship
- Bug fixing from playtests; GDD §13.7 edge cases in the browser.
- `npm run media` for a fresh cover and screenshots; GIF (A9).
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
| G3 | Checkpoints used in longer levels | P0 | System exists (`C` tile); no built level uses one yet except Mid-Air |
| G4 | Wet floor tile `~` | Tier C, cut Nov 12 | TECH.md §6.5; level `wet` |
| G5 | Multiple pranks per level, ordering puzzles | P0 | System supports it; used by `stacked` (tier A), `doors`, `pillar`, `portrait` |
| G6 | Prank types beyond tile swaps (e.g. move a freak, flip a hazard) | P2 | Keep deterministic |
| G7 | Scatterer freak (real-time geometry change) | Post | GDD §4.10 |
| G8 | Day-walker freak + day-only clock | Tier C, cut Nov 12 | TECH.md §6.5; level `daywalker` |
| G9 | Offset layer | Tier C, cut Nov 17 | TECH.md §6.5; level `offset` |
| G10 | Shared-state objects (levers/doors) | Post | GDD §8.2 |
| G11 | Gamepad support | P2 | Gamepad API polling into `input.js` frames |
| G12 | Rebindable controls | P2 | Stretch in GDD §12.5 |
| G13 | Speedrun timer display | P2 | `state.time` already tracked |
| G14 | Sticky Keys in-joke (memo from the freaks on title/pause, practical advice kept) | P1 | GDD §1.7; the jam page jokes about it too |
| G15 | Supervisor freak (facing decides which freaks work) | Tier C, cut Nov 17 | TECH.md §6.5; level `supervisor` |

### Levels
| ID | Item | Pri |
|---|---|---|
| L1 | Polish pass on the 6 built levels after playtest | P0 |
| L2 | `stairs` *Under Renovation* | Tier B |
| L3 | `doors` *Lost & Found* | Tier B |
| L4 | `stacked` *Stacked* | **Tier A** (jam minimum) |
| L5 | `clockout` *Clock Out* | **Tier A** (jam minimum) |
| L6 | `pillar` *Structural Integrity*, `portrait` *Employee of the Month* | Tier B |
| L9 | `wet` *Wet Floor*, `daywalker` *Broad Daylight* | Tier C (cut Nov 12) |
| L10 | `supervisor` *Night Management*, `offset` *Floor 3.5* | Tier C (cut Nov 17) |
| L11 | *Freight* | Post |
| L7 | Re-verify every par with scripted solutions after any tuning change | P0 |
| L8 | Show the freaks before raters quit: evidence on the first night shift (eyes, a giggle) and a prank tell visible in act 1 | P0 (jam scoring, GDD §1.8) |

### Presentation
| ID | Item | Pri |
|---|---|---|
| A1 | ~~Freak art pass~~ Done Nov 2 (pixel sprites, eyes, squint, freeze cue); freak size still to confirm in playtest | P0 |
| A2 | ~~Worker animation~~ Done Nov 2 (run, jump, fall, land, spooked boots gag) | P1 |
| A3 | ~~Background props~~ Done Nov 2 for the 6 built levels; new levels add theirs | P1 |
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
| Camera | Single-screen rooms (current) vs scrolling levels with camera | Single-screen rooms: every level fits 32×18, which keeps puzzles readable at a glance and both maps fully visible. Add a camera only if a level needs it. | Nov 8 |
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
