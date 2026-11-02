# Content Manifest

Everything the finished jam game contains, in one place. Each row has an ID, its tier, its status and where its full spec lives. Planned 2026-11-02, starting from the 6-level build; the tier-C mechanics and their levels shipped since.

**At a glance**
- **16 levels in four acts**, about 25–40 minutes. Built in three tiers so any cut still ships a complete game (§1).
- **4 new mechanics:** wet floor, supervisor freak, offset layer, day-walker freak. Each has a cut date (§1).
- This doc says *what* is in the game. *When* and *in what order* is [PRODUCTION.md](PRODUCTION.md); *how* is in the linked specs.
- Status: ✅ built · **planned** (in the jam plan) · *stretch* (only if ahead) · *post-jam*.
- **2026-11-02:** every art and audio asset is built, including those for planned levels (review them in `/tools/gallery.html`). What's left is mostly levels and their mechanics.

## 1. Scope and tiers

| Tier | Levels | What it adds | Ships if |
|---|---|---|---|
| **A** (jam minimum) | 8: the six originals + `stacked` + `clockout` | A complete game with a finale | Always |
| **B** | 12: + `stairs`, `doors`, `pillar`, `portrait` | Four levels using only existing systems | On schedule at M2 (Nov 15) |
| **C** | 16: + `wet`, `supervisor`, `offset`, `daywalker` | The four new mechanics | Each mechanic is done by its cut date |

**Cut dates.** A new mechanic is "done" when its rules, tests and drawing are in and its level is proven at par. If it misses its date, its level moves to post-jam and the remaining levels keep their order.

| Mechanic | Level | Cut date |
|---|---|---|
| Wet floor `~` | `wet` | Nov 12 |
| Day-walker freak | `daywalker` | Nov 12 |
| Supervisor freak | `supervisor` | Nov 17 |
| Offset layer | `offset` | Nov 17 |
| Content freeze (everything) | — | Nov 22 |

Levels are referred to by `id` everywhere, never by number, so a cut never renumbers anything.

## 2. Levels

Full specs: [LEVELS.md](LEVELS.md) §4 (built) and §5 (planned).

| # | Act | Level | id | New element | Tier | Status |
|---|---|---|---|---|---|---|
| 1 | 1 · Renovation | Clock In | `clock` | Shift changes the world | A | ✅ |
| 2 | 1 | Scaffolding | `scaff` | Use the other shift's geometry | A | ✅ |
| 3 | 1 | Closing Time | `closing` | Per-shift hazards and walls | A | ✅ |
| 4 | 1 | Mid-Air | `midair` | Shift during a jump | A | ✅ |
| 5 | 2 · Overtime | Inventory | `inventory` | First prank | A | ✅ |
| 6 | 2 | Night Watch | `watch` | Freaks freeze by day | A | ✅ |
| 7 | 2 | Under Renovation | `stairs` | Night staircase to nowhere → mid-air shift onto a day ledge | B | planned |
| 8 | 2 | Lost & Found | `doors` | You *need* the pranks: the stolen-door pile grows each night | B | planned |
| 9 | 3 · Graveyard Shift | Wet Floor | `wet` | Wet floor `~`: slide at night, grip by day | C | ✅ built |
| 10 | 3 | Structural Integrity | `pillar` | A pillar moves each night clock-in | B | planned |
| 11 | 3 | Night Management | `supervisor` | Supervisor freak: watched freaks work, the rest slack off | C | ✅ built |
| 12 | 3 | Stacked | `stacked` | Several queued pranks; the order of clock-ins | A | planned |
| 13 | 4 · Lights Out | Floor 3.5 | `offset` | Offset layer: night is the day map half a storey up | C | ✅ built |
| 14 | 4 | Broad Daylight | `daywalker` | Day-walker freak: active by day, frozen by night | C | ✅ built |
| 15 | 4 | Employee of the Month | `portrait` | The portrait blocks the exit and is rehung each clock-in | B | planned |
| 16 | 4 | Clock Out | `clockout` | Finale: everything from tiers A–B, final timecard | A | planned |

*Post-jam pool:* Freight (crates restack on a cycle). It's covered by `doors` and `stacked`, so it's not needed for the jam.

## 3. Systems

Specs: [TECH.md](TECH.md) §6 (mechanics), [GDD.md](GDD.md) §12 (UI).

| ID | System | Needed by | Tier / priority | Backlog | Status |
|---|---|---|---|---|---|
| SYS-1 | Wet floor tile `~` (low friction when grounded on it) | `wet` | C, cut Nov 12 | G4 | ✅ built |
| SYS-2 | Day-walker freak + day-only clock | `daywalker` | C, cut Nov 12 | G8 | ✅ built |
| SYS-3 | Supervisor freak (facing decides which freaks work) | `supervisor` | C, cut Nov 17 | G15 | ✅ built |
| SYS-4 | Offset layer (`offset` field generates the night grid) | `offset` | C, cut Nov 17 | G9 | ✅ built |
| SYS-5 | Level select + save progress (localStorage, try/catch) | Raters reaching act 2+ | P0 | A7 | ✅ (act starts always open) |
| SYS-6 | Music engine (step sequencer, two synced arrangements, crossfade on shift) | Audio score | P0 | A5 | ✅ |
| SYS-7 | Settings: master / music / SFX volume, reduced effects | Accessibility | P1 | A6 | ✅ |
| SYS-8 | Act title cards between acts | Structure, pacing | P1 | A10 | ✅ |
| SYS-9 | Timecard comments; end screen with totals for every level | Replay hook | P1 | A8 | ✅ |
| SYS-10 | Freak evidence from the first night shift | Raters seeing the freaks early | P0 | L8 | ✅ built |
| SYS-11 | Sticky Keys in-joke | Theme | P1 | G14 | planned |
| SYS-12 | Demo GIF capture (extend `scripts/media.mjs`) | itch page | P1 | A9 | planned |
| SYS-13 | Rebindable controls | Accessibility | *stretch* | G12 | — |
| SYS-14 | Gamepad | Reach | *stretch* | G11 | — |
| SYS-15 | Scatterer freak, shared-state objects | — | *post-jam* | G7, G10 | — |

## 4. Art (all drawn in code)

Specs: [ART.md](ART.md). Palette rule: existing colors only, unless a color gets a row in ART.md §2 first.

| ID | Item | Needed by | Tier / priority | Spec | Status |
|---|---|---|---|---|---|
| ART-1 | Worker animation: idle bob, 4-frame run, jump, fall, spooked boots gag, respawn pop | Every level | P1 | ART §4 | ✅ |
| ART-2 | Freak art pass: lurker, peeker, squatter personality touches (hands, hoard, smug eyes) | Act 2+ | P0 | ART §5 | ✅ |
| ART-3 | Supervisor freak: clipboard, head that turns, a readable facing cue | `supervisor` | C | ART §5.1 | ✅ built, level pending |
| ART-4 | Day-walker freak: dark against the warm day sky; dashed outline by night | `daywalker` | C | ART §5.1 | ✅ built, level pending |
| ART-5 | Wet floor `~`, both shifts (sheen lines + WET FLOOR sign; non-color cue: wavy top edge) | `wet` | C | ART §6.1 | ✅ built, level pending |
| ART-6 | Doors (closed, missing frame) and the door pile | `doors` | B | ART §6.1 | ✅ built, level pending |
| ART-7 | Pillar (and the ceiling crack where it used to be) | `pillar` | B | ART §6.1 | ✅ built, level pending |
| ART-8 | Staircase to nowhere + the freaks' proud sign | `stairs` | B | ART §6.1 | ✅ built, level pending |
| ART-9 | Portrait ("just eyes") | `portrait` | B | ART §6.1 | ✅ built, level pending |
| ART-10 | Offset-layer echo treatment (floor label "3.5") | `offset` | C | ART §6.1 | ✅ built, level pending |
| ART-11 | Props per level: notice board, vents, barrier tape, pallets, signage, footprints, chalk circles | Every level | P1 | ART §6, §6.2 | ✅ |
| ART-12 | Effects: prank sparkle, freeze cue on shift to day, checkpoint ping | Every level | P1 | ART §5, §7 | ✅ |
| ART-13 | UI screens: title with level select ✅, level select ✅, settings, act cards, timecard with comment, end screen with totals, credits | Shell | P0–P1 | ART §7.1 | ✅ except credits |
| ART-14 | Cover image 1260×1000 | itch | P0 | ART §8 | ✅ (`npm run media`) |
| ART-15 | Screenshots 960×540 | itch | P0 | ART §8 | ✅ (refresh when new levels ship) |
| ART-16 | Demo GIF ≤ 10 s | itch | P1 | ART §8 | planned |
| ART-17 | Devlog images (before/after readability, a prank GIF) | Devlogs | P2 | ART §8 | gallery capture ✅; devlog images planned |

## 5. Audio (all synthesized)

Specs: [AUDIO.md](AUDIO.md).

| ID | Item | Needed by | Tier / priority | Spec | Status |
|---|---|---|---|---|---|
| SND-1 | 11 core SFX (shift ×2, rejected, jump, land, death, spooked, prank giggle, checkpoint, win, stamp) | Everything | — | AUDIO §2 | ✅ |
| SND-2 | Music: one theme, day + night arrangements in sync, crossfade on shift | Audio score | P0 | AUDIO §3 | ✅ |
| SND-3 | Act layers: an extra part added to the music per act | Pacing | *stretch* | AUDIO §3.1 | — |
| SND-4 | Peeker boing, lurker steps, freeze scratch, prank shimmer, peeker scratch | Act 2+ | P1 | AUDIO §4 | ✅ |
| SND-5 | UI move/select clicks | Menus | P1 | AUDIO §4 | ✅ |
| SND-6 | Wet-floor squeak (hard stop) | `wet` | C | AUDIO §4.1 | ✅ built, level pending |
| SND-7 | Door-steal thunk (layered on the prank giggle) | `doors` | B | AUDIO §4.1 | ✅ built, level pending |
| SND-8 | Pillar scrape | `pillar` | B | AUDIO §4.1 | ✅ built, level pending |
| SND-9 | Supervisor clipboard tick + turn whoosh | `supervisor` | C | AUDIO §4.1 | ✅ built, level pending |
| SND-10 | Offset rumble (on night entry in `offset`) | `offset` | C | AUDIO §4.1 | ✅ built, level pending |
| SND-11 | Day-walker giggle (by day) | `daywalker` | C | AUDIO §4.1 | ✅ built, level pending |
| SND-12 | Act-card sting | SYS-8 | P1 | AUDIO §4.1 | ✅ |

## 6. Text

Specs and drafts: [WRITING.md](WRITING.md). Fish writes the final words.

| ID | Item | Spec | Status |
|---|---|---|---|
| TXT-1 | Level notes: 6 ✅, 10 new (from Fish's idea-pool lines, trimmed to one line) | WRITING §3 | 6 ✅, 10 drafted |
| TXT-2 | One notice-board memo per level | WRITING §6 | drafts |
| TXT-3 | Prank tell variants (MINE and friends) | WRITING §5 | drafts |
| TXT-4 | Act card titles and one-line subtitles | WRITING §2.1 | drafted |
| TXT-5 | Timecard comments | WRITING §7 | drafts |
| TXT-6 | UI strings: level select, settings, credits, Sticky Keys joke | WRITING §2.1 | drafted |
| TXT-7 | Ending (`clockout`) | WRITING §8 | draft |
| TXT-8 | itch description refresh when levels ship | [itch/page.md](../itch/page.md) §4 | ✅ for 6 levels |
| TXT-9 | Devlog #1 (launch), #2 (post-jam) | RELEASE §5–6 | planned |

## 7. Schedule (summary; details in PRODUCTION.md §2–3)

| Week | Dates | Content goal |
|---|---|---|
| 1 | Nov 2–8 | Feel and tuning; level select + save; freaks early (SYS-10); start music; `stairs`, `doors` |
| 2 | Nov 9–15 | **Wet floor + day-walker by Nov 12**; `wet`, `daywalker`, `pillar`, `portrait`; music v1; freak art pass → **M2: tier B complete** |
| 3 | Nov 16–22 | **Supervisor + offset by Nov 17**; `supervisor`, `offset`, `stacked`, `clockout`; act cards; timecard comments → **M3: content freeze Nov 22** |
| 4 | Nov 23–30 | Polish, playtests, GIF and screenshots, itch page, submit Nov 30 |
