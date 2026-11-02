# Art Bible

Companion to [GDD.md](GDD.md) §4.7, §7, §10. Everything is drawn in code on a 960×540 canvas; there are no image files. Values below are the ones in `src/main.js` on 2026-11-01. **Decided 2026-11-01: the jam build stays code-drawn** (GDD §10.1). Post-jam, if a design partner joins, this is their brief; credit them as they choose.

## 1. Pillars

1. **Readability beats beauty.** The player must always know: what's solid now, what's solid on the other shift, what kills, where the freaks are, which shift they're in.
2. **Day and night are the same building.** Same architecture, different light. Never make night dark enough to hide geometry.
3. **Mock horror.** The freaks are funny-creepy: lumpy silhouettes and blinking eyes. Never gore, never a jump scare.
4. **Never color alone.** Every distinction also has a shape, line style, pattern or label.

### 1.1 Code-drawn as a style, not a placeholder

Graphics is a rated jam category. Simple shapes score well when they look *chosen*. Rules for every new element:

- **Only the palettes in §2.** No new color unless it gets a row in §2 first.
- **One line language.** Solid edges use the 2 px edge of their shift. "Other shift" is always dashed. "Only in this shift" is always hatched. Don't invent a new line style per element.
- **Motion before detail.** An animated simple shape (§4 animations, freak jitter and blinks, effect rings) reads as finished. A detailed static one reads as a placeholder. Spend art time on animation and effects first (A2, A1).
- **Same building, two lights.** Every room is drawn twice from the same shapes; only light and props change (pillar 2).
- **Consistent type.** Monospace only, at the sizes in §7.
- **Props tell the story** (§6, A3): signage, memos and tape make it a place. They're cheap and they carry the jokes.

## 2. Palettes

### Day shift
| Role | Value |
|---|---|
| Sky gradient top → bottom | `#f6e7c8` → `#e8c58c` |
| Window panes / frames | `rgba(255,255,255,0.35)` / `rgba(120,90,50,0.18)` |
| Solid fill | `#6e5a45` (brick courses texture, `rgba(0,0,0,0.12)`) |
| Solid edge (top/sides) | `#fbecc9`, 2 px |
| Echo of night geometry | dashed `rgba(95,140,255,0.8)` |
| HUD text / soft | `#3b2d1f` / `rgba(59,45,31,0.7)` |
| Sun icon | `#f2a516` |

### Night shift
| Role | Value |
|---|---|
| Sky gradient top → bottom | `#0b1029` → `#1d2a56`, stars `rgba(255,255,255,0.6)` |
| Lit windows / frames | `rgba(255,214,110,0.55)` / `rgba(120,150,255,0.08)` (some windows dark) |
| Solid fill | `#1f2b49` (panel seams texture, `rgba(95,242,255,0.08)`) |
| Solid edge | `#5ff2ff`, 2 px |
| Echo of day geometry | dashed `rgba(244,170,90,0.75)` |
| HUD text / soft | `#d9f6ff` / `rgba(217,246,255,0.7)` |
| Moon icon | `#d9f6ff` crescent |

*Note:* each echo uses the **other** shift's echo color (day view shows night geometry in blue, night view shows day geometry in orange), so the echo's color says which shift it belongs to.

### Shared colors
| Element | Value |
|---|---|
| Rebar (day hazard) | `#c4572a` |
| Laser (night hazard) | `rgba(255,59,92,α)` pulsing, emitters `#ff9db0` |
| Exit door day / night | `#3d7a4a` / `#1f6b47`, sign `#2bdc6a`, knob `#9dffb8` |
| Checkpoint clock off / on | `#8a8a8a` / `#ffd23f` |
| Freak body | `#05060f`, rim `rgba(95,242,255,0.25)` |
| Freak eyes | `rgba(255,236,90,α)` |
| Sticky note | `#ffe96b`, text `#5a3d10` |
| Timecard paper / ink / stamp | `#f7efdc` / `#3b2d1f` / `#c0392b` (on/under par), `#7f6a50` (overtime) |
| Debug | `#ff00ff` hitbox, `#0f0` text |

## 3. Readability system

| Thing | How it's shown | Non-color cue |
|---|---|---|
| Solid in current shift | Filled tile + bright top/side edge | Fill vs outline |
| Solid in other shift (echo) | Dashed outline of the region's outer edges, never filled | Dashed line |
| Exists **only** in current shift | Fill + diagonal hatch | Hatch pattern |
| Hazard in current shift | Rebar spikes (day) / laser beam with emitters (night) | Shape |
| Hazard in other shift | Small dashed box at hazard height | Dashed |
| Current shift | HUD label DAY SHIFT / NIGHT SHIFT + sun/moon icon + background | Text + icon + background pattern (panes vs stars) |
| Freak (night, active) | Black lumpy silhouette + eyes | Silhouette |
| Freak (day, frozen) | Dashed silhouette outline, dim eyes | Dashed |
| Peeker hidden | Dark slot + small eyes | Shape |
| Pending prank | Night: two pairs of eyes near the target. Day: yellow MINE note | Eyes / note shape |

**Rule:** any new element must fit this table before it goes in a level.

## 4. The worker

- Hitbox 18×26 px. Drawn: blue overalls (`#2f6fdc` day, `#3f86ff` night), face `#f2c79a`, eye on the facing side, yellow hard hat `#ffcc33` (wider brim + crown), hi-vis stripe (`#ffe680` day, `#c6ff4d` night).
- Failed-shift feedback: red outline pulse around the worker (0.25 s). No camera shake.
- *(planned)* Animations (GDD §10.3): idle bob, 4-frame run (legs as two rects), jump (arms up), fall, **spooked gag** (worker pops up, boots stay on the ground for a beat), respawn pop.

## 5. The freaks

- **They're raccoons who know dark magic** (GDD §4.8), drawn so the player can work it out and the game never says it.
- **Never fully shown.** No faces beyond eyes, no full-light view, no close-up.
- Silhouette: a 20×22 lumpy shape with 3 fur spikes on top, jittering ±1.2 px (`sin(t·14)`), body `#05060f` with a faint cyan rim so it reads against the night solids.
- Eyes: two 3×3 px squares, `rgba(255,236,90)`, blink (closed ~0.12 s every ~3.1 s, offset per freak). Lurker eyes glance in its travel direction.
- Peeker hidden: a dark 6 px slot with small eyes.
- By day: dashed outline at the frozen position, eyes at 35% opacity.
- *(planned art pass, A1)*: decide size after playtest (they're smaller than the worker now); per-kind silhouette (lurker hunched, peeker tall/thin, squatter wide and smug); a 2-frame walk wobble for lurkers; peeker pop-up squash.
- *(planned, A1)* **Raccoon clues**, all inside the existing silhouette language (black body, cyan rim, yellow eyes):
  - a darker **mask band** behind the eyes (a slightly lighter body tone so the band reads);
  - two **round ears** replacing the middle fur spike;
  - a **ringed tail** on the lurker (alternating body/rim bands);
  - tiny **hands** gripping the ledge on the peeker;
  - the squatter sits on a small **hoard** (a plank end, a hard hat, something shiny).
- *(planned, A1)* **Magic clues:** when a prank fires, a brief **sparkle** (a few 2 px squares in the freak-eye yellow, about 0.4 s) on the changed tiles. Prank tells get a faint **glyph** (simple strokes, never a real-world symbol) next to the eyes or the MINE note. Both reuse existing colors, so no new palette rows. Keep it subtle: the sparkle must never hide geometry.
- *(planned)* Scatterer: scurry pose; Day-walker: same silhouette, readable in daylight (dark against warm sky, eyes still glow).

## 6. Environment

- Background: six big windows across the back wall (40 px margin, 160 px spacing, 4 panes each). Day: bright panes. Night: most windows lit warm, some dark; stars above.
- Solids: day = brick courses; night = inset panel seams.
- *(planned, A3)* Props per level, never collidable: notice board with memos, vents (where peekers live), barrier tape at shafts, pallets on delivery stacks, signage ("CLOSING TIME", "WET FLOOR"), footprints leading to prank targets.

## 7. UI and effects

| Element | Spec |
|---|---|
| Font | System `monospace`. Sizes: 72 bold (title), 22 bold (timecard title), 16–20 (HUD), 14 (notes), 12 (footnotes) |
| HUD | Top-left `n/6 LEVEL NAME` (16 bold); top-right shift label + icon; below it `CLOCK-INS n · PAR p` (14); level note for the first 5 s |
| Tutorial | Level 1 until first shift: "Press SHIFT (or K) to change shifts" + "Dashed outlines show the other shift" |
| Shift effect | Screen tint 0.12 s (day: warm `rgba(255,240,200,·0.22)`, night: blue `rgba(40,80,200,·0.18)`), expanding ring 0.3 s from the worker |
| Death effect | Red tint 0.3 s |
| Popups | "SPOOKED!" family over the worker; "hee hee hee" (italic, yellow) under the HUD on a prank; rise 30 px and fade over 0.9 s |
| Timecard | 400×300 paper card, rows Clock-ins / Par / Time / Incidents, rotated stamp ON PAR / UNDER PAR! / +n OVERTIME |
| Title | Split screen day/night, DOUBLE (day ink) SHIFT (night ink), controls box, Sticky Keys footnote |

Effects must stay readable under rapid shifting: no stacking full-screen flashes (the tint resets, doesn't add), no shake. *(planned)* "Reduced effects" setting disables tint and rings.

## 8. Marketing media (for itch, RELEASE.md)

| Asset | Size | Content |
|---|---|---|
| Cover image | **1260×1000** (630×500 ratio) | Split day/night building, worker mid-jump at the seam, eyes in the night half, title lockup |
| Screenshots | 960×540 (native), 3–5 | Day + night of the same level; a prank tell; Night Watch with freaks; the timecard |
| Demo GIF | ≤ 960 wide, ≤ 10 s, first in the screenshot list | A mid-air shift chain, then a frozen-lurker pass |
| Page theme | Background `#0b1029`, text `#d9f6ff`, links `#5ff2ff` | Matches the night palette; embed background `#0b1029` (same as `index.html`) |

Capture with `scripts/smoke.mjs` (screenshots) or the browser; record GIFs from a real play session.
