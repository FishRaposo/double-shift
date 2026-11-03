# Content Manifest

Everything the finished jam game contains, in one place. Each row has an ID, its tier, its status and where its full spec lives. Planned 2026-11-02, starting from the 6-level build; the tier-C mechanics and their levels shipped since.

**At a glance**
- **21 levels: five acts of four plus the finale**, about 35–50 minutes. <!-- n:levels -->20<!-- /n --> built (the 12 of tier A, today's Clock Out finale included, are a complete game; act 5 has three of its four); tiers B (17) and C (21) on top, so any cut still ships complete (§1).
- **5 new mechanics, one per act from act 3:** wet floor, supervisor and day-walker freaks, offset layer (all shipped), and Upside Down (act 5, cut date Nov 18).
- This doc says *what* is in the game. *When* and *in what order* is [PRODUCTION.md](PRODUCTION.md); *how* is in the linked specs, and the build task for each planned item is in [BUILD.md](BUILD.md) §4.
- Status: ✅ built · **planned** (in the jam plan) · *stretch* (only if ahead) · *post-jam*.
- **2026-11-02:** every art and audio asset is built, including those for planned levels (review them in `/tools/gallery.html`). What's left is mostly levels and their mechanics.

## 1. Scope and tiers

**The jam game is 21 levels: five acts of four plus the finale** (Fish, 2026-11-02). It starts almost normal, introduces the freaks and one new rule per act from act 3, grows into the Upside Down levels, and ends on a finale that pays everything off. Sequence and ladder: [LEVELS.md](LEVELS.md) §5.0.

| Tier | Levels | What it adds | Ships if |
|---|---|---|---|
| **A** (jam minimum) | the 12 built, including today's Clock Out finale | A complete game | ✅ already |
| **B** | 17: + `stairs`, `doors`, `pillar`, `portrait`, `audit` | Five levels on existing systems | On schedule at M2 (Nov 15) |
| **C** | 21: + `upside`, `fallup`, `ceiling`, `heels`, and the finale rework | Act 5 (Upside Down) and the full finale | The gravity flip is working and `upside` is proven by Nov 18 |

**Cut dates.** A new mechanic is "done" when its rules, tests and drawing are in and its first level is proven at par. If it misses its date, its levels move to post-jam and the rest keep their order. Today's Clock Out is always the fallback finale.

| Mechanic | Levels | Cut date |
|---|---|---|
| Wet floor `~`, day-walker, supervisor, offset layer | `wet`, `daywalker`, `supervisor`, `offset` | ✅ shipped |
| Upside Down (night flipped, gravity up) | `upside`, `fallup`, `ceiling`, `heels`, finale rework | Nov 18 |
| Content freeze (everything) | — | Nov 22 |

Levels are referred to by `id` everywhere, never by number, so a cut never renumbers anything. The `#` in §2 is the position in the finished 21-level game; the build numbers levels by their position in `src/levels.js` (the HUD shows `n/N`), so today's build runs 1–12 in the same order with the unbuilt levels left out.

## 2. Levels

Full specs: [LEVELS.md](LEVELS.md) §4 (built), §5 (acts 2–4 to build), §5.2 (act 5), §5.3 (finale rework).

| # | Act | Level | id | New element | Tier | Status |
|---|---|---|---|---|---|---|
| 1 | 1 · Renovation | Clock In | `clock` | Shift changes the world | A | ✅ |
| 2 | 1 | Scaffolding | `scaff` | Use the other shift's geometry | A | ✅ |
| 3 | 1 | Closing Time | `closing` | Per-shift hazards and walls; first frozen outline | A | ✅ |
| 4 | 1 | Mid-Air | `midair` | Shift during a jump | A | ✅ |
| 5 | 2 · Overtime | Inventory | `inventory` | First prank | A | ✅ |
| 6 | 2 | Night Watch | `watch` | First visible freaks; day freezes them | A | ✅ |
| 7 | 2 | Under Renovation | `stairs` | Night staircase to nowhere → mid-air shift onto a day ledge | B | ✅ |
| 8 | 2 | Lost & Found | `doors` | You *need* the pranks: the stolen-door pile grows each night | B | ✅ |
| 9 | 3 · Graveyard Shift | Wet Floor | `wet` | Wet floor `~`: slide at night, grip by day | C | ✅ |
| 10 | 3 | Structural Integrity | `pillar` | A pillar moves each night clock-in | B | ✅ |
| 11 | 3 | Night Management | `supervisor` | Supervisor freak: watched freaks work, the rest slack off | C | ✅ |
| 12 | 3 | Stacked | `stacked` | Several queued pranks; the order of clock-ins | A | ✅ |
| 13 | 4 · Lights Out | Employee of the Month | `portrait` | The portrait blocks the exit and is rehung each clock-in | B | ✅ |
| 14 | 4 | Broad Daylight | `daywalker` | Day-walker freak: you must freeze it | C | ✅ |
| 15 | 4 | Floor 3.5 | `offset` | Offset layer: night is the day map half a storey up | C | ✅ |
| 16 | 4 | Night Audit | `audit` | Acts 1–4 exam on one screen; no new rules | B | ✅ |
| 17 | 5 · Upside Down | Mind Your Head | `upside` | At night the map is upside down and gravity points up | C | ✅ |
| 18 | 5 | Falling Up | `fallup` | Shift mid-fall to reverse it; climb a shaft by flipping | C | ✅ |
| 19 | 5 | Ceiling Walker | `ceiling` | A freak on the ceiling, a prank on the flipped map | C | ✅ |
| 20 | 5 | Head Over Heels | `heels` | Every shift freezes one freak and flips gravity | C | planned |
| 21 | Finale | Clock Out | `clockout` | Pays everything off, then the ending | A (built) / C (rework) | ✅ built; rework planned |

*Post-jam pool:* Freight (crates restack on a cycle). It's covered by `doors` and `stacked`, so it's not needed for the jam.

## 3. Systems

Specs: [TECH.md](TECH.md) §6 (mechanics), [GDD.md](GDD.md) §12 (UI).

| ID | System | Needed by | Tier / priority | Backlog | Status |
|---|---|---|---|---|---|
| SYS-1 | Wet floor tile `~` (low friction when grounded on it) | `wet` | C, cut Nov 12 | G4 | ✅ built |
| SYS-2 | Day-walker freak + day-only clock | `daywalker` | C, cut Nov 12 | G8 | ✅ built |
| SYS-3 | Supervisor freak (facing decides which freaks work) | `supervisor` | C, cut Nov 17 | G15 | ✅ built |
| SYS-4 | Offset layer (`offset` field generates the night grid) | `offset` | C, cut Nov 17 | G9 | ✅ built |
| SYS-16 | Upside Down: `upsideDown: true` generates the night as the day grid flipped vertically (+ `nightPatch`); gravity, jump, coyote, grounding and max fall follow a per-shift gravity sign | act 5, finale rework | C, cut Nov 18 | G16 | planned |
| SYS-17 | Finale act card (FINALE · CLOCK OUT) before #21 | finale | C | A10 | planned |
| SYS-5 | Level select + save progress (localStorage, try/catch) | Raters reaching act 2+ | P0 | A7 | ✅ (act starts always open) |
| SYS-6 | Music engine (step sequencer, two synced arrangements, crossfade on shift) | Audio score | P0 | A5 | ✅ |
| SYS-7 | Settings: master / music / SFX volume, reduced effects | Accessibility | P1 | A6 | ✅ |
| SYS-8 | Act title cards between acts | Structure, pacing | P1 | A10 | ✅ |
| SYS-9 | Timecard comments; end screen with totals for every level | Replay hook | P1 | A8 | ✅ |
| SYS-10 | Freak evidence from the first night shift | Raters seeing the freaks early | P0 | L8 | ✅ built |
| SYS-11 | Sticky Keys in-joke | Theme | P1 | G14 | planned |
| SYS-12 | Demo GIF capture (extend `scripts/media.mjs`) | itch page | P1 | A9 | planned |
| SYS-13 | Rebindable controls | Accessibility | *stretch*, approved Nov 3 | G12 | planned (BUILD.md T24) |
| SYS-14 | Gamepad | Reach | *stretch*, approved Nov 3 | G11 | planned (BUILD.md T24) |
| SYS-18 | Speedrun timer (a TIMER setting) | Replay | *stretch*, approved Nov 3 | G13 | planned (BUILD.md T24) |
| SYS-15 | Scatterer freak, shared-state objects | — | *post-jam* | G7, G10 | — |

## 4. Art (all drawn in code)

Specs: [ART.md](ART.md). Palette rule: existing colors only, unless a color gets a row in ART.md §2 first.

| ID | Item | Needed by | Tier / priority | Spec | Status |
|---|---|---|---|---|---|
| ART-1 | Worker animation: idle bob, 4-frame run, jump, fall, spooked boots gag, respawn pop | Every level | P1 | ART §4 | ✅ |
| ART-2 | Freak art pass: lurker, peeker, squatter personality touches (hands, hoard, smug eyes) | Act 2+ | P0 | ART §5 | ✅ |
| ART-3 | Supervisor freak: clipboard, head that turns, a readable facing cue | `supervisor` | C | ART §5.1 | ✅ |
| ART-4 | Day-walker freak: dark against the warm day sky; dashed outline by night | `daywalker` | C | ART §5.1 | ✅ |
| ART-5 | Wet floor `~`, both shifts (sheen lines + WET FLOOR sign; non-color cue: wavy top edge) | `wet` | C | ART §6.1 | ✅ |
| ART-6 | Doors (closed, missing frame) and the door pile | `doors` | B | ART §6.1 | ✅ built, level pending |
| ART-7 | Pillar (and the ceiling crack where it used to be) | `pillar` | B | ART §6.1 | ✅ built, level pending |
| ART-8 | Staircase to nowhere + the freaks' proud sign | `stairs` | B | ART §6.1 | ✅ built, level pending |
| ART-9 | Portrait ("just eyes") | `portrait` | B | ART §6.1 | ✅ built, level pending |
| ART-10 | Offset-layer echo treatment (floor label "3.5") | `offset` | C | ART §6.1 | ✅ |
| ART-18 | Upside Down: worker sprite flipped vertically at night in act 5, upside-down freak outlines, tells hanging from the ceiling | act 5 | C | ART §5, §6.1 | ✅ (Nov 3; first used in `upside`) |
| ART-19 | Props for `audit` (clipboard memo, INSPECTION sign) and `heels` (a hard hat stuck to the ceiling) | `audit`, `heels` | B / C | ART §6.2 | planned |
| ART-11 | Props per level: notice board, vents, barrier tape, pallets, signage, footprints, chalk circles | Every level | P1 | ART §6, §6.2 | ✅ |
| ART-12 | Effects: prank sparkle, freeze cue on shift to day, checkpoint ping | Every level | P1 | ART §5, §7 | ✅ |
| ART-13 | UI screens: title with level select ✅, level select ✅, settings, act cards, timecard with comment, end screen with totals, credits | Shell | P0–P1 | ART §7.1 | ✅ (credits Nov 3; level select laid out for six rows) |
| ART-14 | Cover image 1260×1000 | itch | P0 | ART §8 | ✅ (`npm run media`) |
| ART-15 | Screenshots 960×540 | itch | P0 | ART §8 | ✅ (refresh when new levels ship) |
| ART-16 | Demo GIF ≤ 10 s | itch | P1 | ART §8 | planned |
| ART-17 | Devlog images (before/after readability, a prank GIF) | Devlogs | P2 | ART §8 | gallery capture ✅; devlog images planned |
| ART-20 | Identity and readability pass: text on plates and paper strips, hatched rims, one silhouette per freak kind, glowing eyes, freaks and the subtitle on the title, punch-clock checkpoint, exit sign always on screen, barrier-tape cordon, the ending's wave, whole-pixel scaling | Every level, shell | P0 | ART §3, §3.1, §5–§7 | ✅ (Nov 3) |
| ART-21 | Per-act backdrops: one quiet motif per act behind everything | Every level | P1 | ART §2, §6 | ✅ (Nov 3; acts 5 and the finale show once their levels move there) |

## 5. Audio (all synthesized)

Specs: [AUDIO.md](AUDIO.md).

| ID | Item | Needed by | Tier / priority | Spec | Status |
|---|---|---|---|---|---|
| SND-1 | 11 core SFX (shift ×2, rejected, jump, land, death, spooked, prank giggle, checkpoint, win, stamp) | Everything | — | AUDIO §2 | ✅ |
| SND-2 | Music: one theme, day + night arrangements in sync, crossfade on shift | Audio score | P0 | AUDIO §3 | ✅ |
| SND-3 | Act layers: an extra part added to the music per act | Pacing | *stretch*, approved Nov 3 | AUDIO §3.1 | planned (BUILD.md T24) |
| SND-4 | Peeker boing, lurker steps, freeze scratch, prank shimmer, peeker scratch | Act 2+ | P1 | AUDIO §4 | ✅ |
| SND-5 | UI move/select clicks | Menus | P1 | AUDIO §4 | ✅ |
| SND-6 | Wet-floor squeak (hard stop) | `wet` | C | AUDIO §4.1 | ✅ |
| SND-7 | Door-steal thunk (layered on the prank giggle) | `doors` | B | AUDIO §4.1 | ✅ built, level pending |
| SND-8 | Pillar scrape | `pillar` | B | AUDIO §4.1 | ✅ built, level pending |
| SND-9 | Supervisor clipboard tick + turn whoosh | `supervisor` | C | AUDIO §4.1 | ✅ |
| SND-10 | Offset rumble (on every shift in `offset`) | `offset` | C | AUDIO §4.1 | ✅ |
| SND-11 | Day-walker giggle (by day) | `daywalker` | C | AUDIO §4.1 | ✅ |
| SND-12 | Act-card sting | SYS-8 | P1 | AUDIO §4.1 | ✅ |
| SND-13 | Gravity flip "whoomp" layered on the shift sound in act 5 | act 5 | C | AUDIO §4.1 | ✅ (Nov 3, `flip`; first heard in `upside`) |

## 6. Text

Specs and drafts: [WRITING.md](WRITING.md). Fish writes the final words.

| ID | Item | Spec | Status |
|---|---|---|---|
| TXT-1 | Level notes for all 21 (from Fish's idea-pool lines, trimmed to one line) | WRITING §3 | 12 ✅, 9 drafted |
| TXT-10 | Act 5 card: ACT 5 · UPSIDE DOWN · "The night shift turned the building over."; finale card: FINALE · CLOCK OUT · "One more shift." | WRITING §2.1 | drafted |
| TXT-2 | One notice-board memo per level | WRITING §6 | drafts |
| TXT-3 | Prank tell variants (MINE and friends) | WRITING §5 | drafts |
| TXT-4 | Act card titles and one-line subtitles | WRITING §2.1 | ✅ |
| TXT-5 | Timecard comments | WRITING §7 | ✅ |
| TXT-6 | UI strings: level select, settings, credits, Sticky Keys joke | WRITING §2.1 | drafted |
| TXT-7 | Ending (`clockout`) | WRITING §8 | ✅ (credits built Nov 3) |
| TXT-8 | itch description refresh when levels ship | [itch/page.md](../itch/page.md) §4 | ✅ for 12 levels |
| TXT-9 | Devlog #1 (launch), #2 (post-jam) | RELEASE §5–6 | planned |

## 7. Schedule (summary; details in PRODUCTION.md §2–3)

| Week | Dates | Content goal |
|---|---|---|
| 1 | Nov 2–8 | Feel and tuning (Fish's playtest); `stairs`, `doors` |
| 2 | Nov 9–15 | `pillar`, `portrait`, `audit`; gravity-flip rules and tests → **M2: tier B, 17 levels** |
| 3 | Nov 16–22 | `upside` proven by **Nov 18**; `fallup`, `ceiling`, `heels`; finale rework → **M3: content freeze Nov 22, 21 levels** |
| 4 | Nov 23–30 | Polish, playtests, GIF and screenshots, itch page, submit Nov 30 |
