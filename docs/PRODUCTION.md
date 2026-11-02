# Production Plan

Companion to [GDD.md](GDD.md) §16–17. Status as of **2026-11-01** (night of day 1).

## 1. Where we are

| Area | State |
|---|---|
| Core rules (move, jump, shift, buffer/nudge, coyote, jump buffer) | Built, tested |
| Pranks (Nth night entry, tells, checkpoint restore) | Built, tested |
| Freaks: lurker, peeker, squatter (frozen by day) | Built, tested |
| Levels | 6 built (act 1: 4, act 2: 2), all proven solvable at par |
| Rendering | Code-drawn placeholder-plus: palettes, echoes, hatching, freaks, timecard |
| Audio | Synthesized SFX only; **no music yet** |
| Menus | Title, pause, timecard, end screen. **No settings, no level select, no save** |
| Tests | 42 passing (`npm test`) |
| Repo / CI / itch | Local git repo with CI workflow committed. **Not on GitHub yet, no itch page** |

## 2. Milestones

| Date | Milestone | Exit criterion (must be true to move on) |
|---|---|---|
| **Nov 2–3** | **M0: Feel check** | Fish has played all 6 levels on Windows. Sticky Keys result recorded. Movement tuning pass done. Public GitHub repo exists with CI green. |
| **Nov 8** | **M1: Core locked** | Shift, freeze and prank all feel good to Fish. One cold playtest done (PLAYTEST.md). Movement/shift constants frozen except for small tweaks. |
| **Nov 15** | **M2: Act 2 complete** | Levels 1–8 built and at par. Music v1 (day + night arrangement, crossfade). Freak art pass. Settings menu (volume, reduced effects). |
| **Nov 22** | **M3: Content complete** | Levels 1–12 (or the jam-minimum cut) playable start to finish. All copy in. Save/level select. Second playtest round. **No new features after this date.** |
| **Nov 26** | **M4: Release candidate** | Bug-free on Chrome/Firefox/Edge. itch page drafted with cover, screenshots, GIF. AI disclosure filled. |
| **Nov 30** | **M5: Submitted** | itch page public, submitted to the jam, repo linked, play-tested from the itch page itself. |
| Dec 1 18:37 BRT | Jam deadline | — (buffer day; only emergency fixes) |

**Cut line:** if M2 slips past Nov 17, cut to the jam minimum (GDD §8.2: levels 1–6 + 9 + 12) and drop all *(stretch)* items. A polished short game beats an unfinished long one.

## 3. Weekly plan

### Week 1 (Nov 2–8): make it feel right
- Play everything on Windows; record Sticky Keys result in GDD §3.2 (decides Shift vs K as primary bind).
- Tuning pass on `PARAMS` (TECH.md §4): run speed, jump height, air control, coyote, shift buffer.
- Create the public GitHub repo and push (CI workflow already committed, TECH.md §8).
- Decide **camera vs single-screen rooms** (see §5, open decisions).
- Freak readability: test freak size (currently 20×22 vs worker 18×26). Bump if testers miss them.
- First cold playtest on levels 1–6.

### Week 2 (Nov 9–15): act 2 and the game's voice
- Levels 7 (*Freight*) and 8 (*Wet Floor*); wet floor needs the low-friction tile (new rule, tests first).
- Music v1 (AUDIO.md §3).
- Freak art pass (ART.md §5): silhouettes, eyes, idle jitter, peek animation.
- Notice-board memos and sticky notes in levels (WRITING.md).
- Settings: master/music/sfx volume, reduced screen effects.

### Week 3 (Nov 16–22): act 3 and content complete
- Levels 9 (*Stacked*) and 12 (*Clock Out*); 10 and 11 only if on schedule.
- Save progress + level select (localStorage, wrapped in try/catch).
- Timecard comments; end screen with totals.
- Second playtest round on the full run.
- Content freeze Nov 22.

### Week 4 (Nov 23–30): polish and ship
- Bug fixing from playtests. Edge-case pass on GDD §13.7 list in the browser.
- Cover art, screenshots, demo GIF (ART.md §8).
- itch page (RELEASE.md), draft → play on page → public → submit.
- Devlog #1 on itch; X posts (Fish writes the final words).

## 4. Backlog

Priority: **P0** = the game doesn't ship without it. **P1** = expected in the jam build. **P2** = only if ahead of schedule. **Post** = after the jam.

### Gameplay and rules
| ID | Item | Pri | Notes |
|---|---|---|---|
| G1 | Movement tuning pass | P0 | TECH.md §4; play-feel, not tests |
| G2 | Sticky Keys test + primary bind decision | P0 | GDD §3.2 |
| G3 | Checkpoints used in longer levels | P0 | System exists (`C` tile); no built level uses one yet except Mid-Air |
| G4 | Low-friction "wet floor" tile | P1 | New tile char, e.g. `~`; tests first |
| G5 | Multiple pranks per level, ordering puzzles | P1 | System supports it; needs level 9 |
| G6 | Prank types beyond tile swaps (e.g. move a freak, flip a hazard) | P2 | Keep deterministic |
| G7 | Scatterer freak (real-time geometry change) | P2 | GDD §4.10 |
| G8 | Day-walker freak | P2 | GDD §4.10 |
| G9 | Offset layer levels | P2 | GDD §8.2 |
| G10 | Shared-state objects (levers/doors) | Post | GDD §8.2 |
| G11 | Gamepad support | P2 | Gamepad API polling into `input.js` frames |
| G12 | Rebindable controls | P2 | Stretch in GDD §12.5 |
| G13 | Speedrun timer display | P2 | `state.time` already tracked |

### Levels
| ID | Item | Pri |
|---|---|---|
| L1 | Polish pass on levels 1–6 after playtest | P0 |
| L2 | Level 7 *Freight* | P1 |
| L3 | Level 8 *Wet Floor* | P1 |
| L4 | Level 9 *Stacked* | P0 (jam minimum) |
| L5 | Level 12 *Clock Out* | P0 (jam minimum) |
| L6 | Levels 10 *Moved Floor*, 11 *Broad Daylight* | P2 |
| L7 | Re-verify every par with scripted solutions after any tuning change | P0 |

### Presentation
| ID | Item | Pri |
|---|---|---|
| A1 | Freak art pass (size, silhouette, eyes, peek) | P0 |
| A2 | Worker animation: run cycle, jump, fall, spooked boots gag | P1 |
| A3 | Background props: notice board, vents, signage per level | P1 |
| A4 | Camera or room decision implemented | P0 |
| A5 | Music: day + night arrangement with crossfade | P0 |
| A6 | Settings menu (volumes, reduced effects) | P1 |
| A7 | Level select + save | P1 |
| A8 | Timecard comments, end-screen totals | P1 |
| A9 | Cover 1260×1000, 3–5 screenshots, demo GIF | P0 |

### Infrastructure and release
| ID | Item | Pri |
|---|---|---|
| R1 | Public GitHub repo, MIT license, README | P0 |
| R2 | CI workflow (`.github/workflows/ci.yml`) | P0 |
| R3 | GitHub Pages build (secondary play link) | P1 |
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
| Design partner involvement | Art pass by partner vs code-drawn only | Fish's call; credit as they choose | Nov 9 |

## 6. Definition of done (jam build)

All of GDD §17.1, plus:

- [ ] Every level solvable at par by a scripted run (`npm test`).
- [ ] No level winnable without shifting.
- [ ] No console errors in Chrome, Firefox, Edge.
- [ ] Playable from the itch page in a fresh browser profile.
- [ ] README, GDD and these docs match the shipped build (counts, levels, controls).
- [ ] Public repo pushed before 13:37 PST Dec 1.
