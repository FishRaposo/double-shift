# Art Bible

Companion to [GDD.md](GDD.md) §4.7, §7, §10. Everything is drawn in code on a 960×540 canvas; there are no image files. Values below match `src/art.js` and `src/sprites.js` on 2026-11-02 (after the pixel-art pass, §0). Every asset can be reviewed in the gallery: serve the repo and open `/tools/gallery.html` (`npm run media` also captures it as `media/11-gallery.png`). **Decided 2026-11-01: the jam build stays code-drawn** (GDD §10.1). Post-jam, if a design partner joins, this is their brief; credit them as they choose.

**At a glance**
- Everything is drawn by code; that's the style, not a placeholder (§1.1).
- One line language: **filled** = solid now, **dashed** = the other shift, **hatched** = only in this shift (§3).
- Reading order on screen: worker → solids → hazards/freaks → other shift → exit → HUD → background (§3.1).
- Freaks: black lumps with glowing eyes, never fully shown, nature undefined (§5).
- **Crisp pixel art on a 2-px grid, one hand-made pixel font, motion over detail (§0).**

## 0. Pixel style (built 2026-11-02)

| Rule | Value |
|---|---|
| Grid | 1 art pixel = 2×2 screen pixels (`ART` in `src/sprites.js`). A 30-px tile = 15×15 art px. Everything snaps to the grid; `imageSmoothingEnabled = false` everywhere. |
| Characters | String-grid sprites in `src/sprites.js`, cached per frame and palette. Worker 11×16 art px (hitbox 9×13 inside it), freaks 12×13 (hitbox 10×11). Outline built into the sprite. Eyes drawn on top (blink, glance, squint). |
| Everything else | Drawn procedurally in art pixels by `src/art.js`: tiles, hazards, exit, checkpoint, signs, props, effects, panels, stamps, logo. |
| Type | `src/font.js`: hand-made 5×7 glyphs (9 rows with descenders), A–Z, a–z, 0–9 and every symbol the game prints. Integer scales only: 1 footnotes, 2 body/HUD, 3 headings, 4–6 screen titles, 7–9 the logo. Halo (1 art px all round) for text over the playfield; drop shadow for the logo. Identical on every computer. |
| Motion | 4-frame run, idle bob, jump/fall/land frames, spooked boots gag, freak jitter and 2-frame wobble, blinks, smug squint on a prank, dust, puffs, sparkles, shift rings, stamp slam. |
| Performance | The static layer (echo, solids, hatch, props, exit) is drawn once per level × shift × prank state; a frame costs ≈ 0.4 ms (measured by `npm run media`). |

## 1. Pillars

**Identity (decided 2026-11-03):** *A workplace comedy in two lights: warm paper-and-brick days, cool cyan-panel nights. Everything official is paper (timecards, notes, stamps). The freaks are glowing eyes and lumpy silhouettes in the dark, more present every act.* Every art change serves that sentence and the reading order in §3.1. The identity and readability pass that applies it is BUILD.md T20–T21 *(planned)*.

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
| Window panes / frames | `rgba(255,255,255,0.22)` / `rgba(120,90,50,0.1)` |
| Solid fill | `#6e5a45` (brick courses texture, `rgba(0,0,0,0.12)`) |
| Solid edge (top/sides) | `#fbecc9`, 2 px |
| Echo of night geometry | dashed `rgba(52,96,230,1)`, 2.5 px, dash 8/5 |
| HUD text / soft / halo | `#3b2d1f` / `rgba(59,45,31,0.85)` / `rgba(246,231,200,0.85)` |
| Sun icon | `#f2a516` |

### Night shift
| Role | Value |
|---|---|
| Sky gradient top → bottom | `#0b1029` → `#1d2a56`, stars `rgba(255,255,255,0.35)` |
| Lit windows / frames | `rgba(255,214,110,0.12)` / `rgba(120,150,255,0.05)` (some windows dark) |
| Solid fill | `#2e4173` (panel seams texture, `rgba(95,242,255,0.08)`) |
| Solid edge | `#5ff2ff`, 2 px |
| Echo of day geometry | dashed `rgba(255,170,80,0.95)`, 2.5 px, dash 8/5 |
| HUD text / soft / halo | `#d9f6ff` / `rgba(217,246,255,0.85)` / `rgba(11,16,41,0.85)` |
| Moon icon | `#d9f6ff` crescent |

*Note:* each echo uses the **other** shift's echo color (day view shows night geometry in blue, night view shows day geometry in orange), so the echo's color says which shift it belongs to.

### Shared colors
| Element | Value |
|---|---|
| Rebar (day hazard) | `#c4572a` |
| Laser (night hazard) | `rgba(255,59,92,α)` pulsing, emitters `#ff9db0` |
| Exit door day / night | `#3d7a4a` / `#1f6b47`, 2 px frame and knob `#9dffb8`; lit sign box `#2bdc6a` above the door with `EXIT` in `#06210f` (11 px bold) |
| Checkpoint clock off / on | `#8a8a8a` / `#ffd23f` |
| Freak body | `#05060f`, rim `rgba(95,242,255,0.6)` 1.5 px |
| Freak eyes | `rgba(255,236,90,α)` |
| Sticky note | `#ffe96b` 42×30, text `#5a3d10` 13 px bold |
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
| Freak (day, frozen) | Dashed silhouette outline in the night echo blue, dim eyes | Dashed |
| Peeker hidden | Dark slot + small eyes | Shape |
| Pending prank | Night: two pairs of eyes near the target. Day: yellow MINE note | Eyes / note shape |
| Wet floor `~` | Solid fill + sheen lines; a WET FLOOR sign nearby | **Wavy top edge** instead of a straight one |
| Supervisor facing | Head and clipboard turned to the watched side; eyes only on that side | Shape (head offset, clipboard side) |
| Watched vs. slacking freak | Watched: normal. Slacking: eyes closed to lines, silhouette still | Closed eyes, no jitter |
| Day-walker | Day: dark silhouette with a cream rim. Night: dashed outline in the day echo orange | Silhouette / dashed |
| Moved object *(planned: doors, pillar, portrait)* | Ordinary solids; its future spots carry the usual prank tells | Tell shapes (eyes / notes) |
| Offset layer | No new marks: the echo of the other shift shows the floors half a storey off. Floor signs read 3 and 3.5 | Echo dashes + sign text |

**Rule:** any new element must fit this table before it goes in a level.

### 3.1 At-a-glance hierarchy (readability pass, 2026-11-02)

The screen should read in this order: **worker → what's solid now → hazards and freaks → the other shift → exit → HUD → background.** Rules that keep it that way:

| Rule | How |
|---|---|
| The worker is always the easiest thing to find | 1.5 px outline around every part of the sprite: `#1b1209` by day, `#d9f6ff` by night |
| The background is the quietest layer | Window panes and stars at low alpha (§2); never brighter than a solid's edge |
| Night solids stand out from the night sky | Fill `#2e4173` is lighter than the sky bottom `#1d2a56`, plus the cyan edge |
| The other shift is visible without looking for it | Echoes at full strength, 2.5 px, long dashes; frozen freaks use the same blue |
| "Only in this shift" shows on both palettes | Hatch `rgba(255,232,170,0.6)` by day, `rgba(95,242,255,0.35)` by night |
| HUD text never disappears into a wall | Every HUD line has a 4 px halo in the shift's background colour |
| Score state at a glance | `CLOCK-INS n · PAR p` turns red (`#e0473c`) once over par |
| Prank warnings are noticeable | Night tell eyes at 4 px; day MINE note 42×30 |

## 4. The worker

- Hitbox 18×26 px (9×13 art px); sprite 11×16 art px with a built-in outline (`#1b1209` by day, `#d9f6ff` by night). Blue overalls (`#2f6fdc` / shade `#2558b8` day, `#3f86ff` / `#2f6fdc` night), face `#f2c79a`, eye on the facing side, yellow hard hat `#ffcc33`, hi-vis stripe (`#ffe680` day, `#c6ff4d` night), brown boots `#5a3d10`.
- ✅ Frames: `idle0/1` (bob), `run0–3`, `jump` (legs tucked), `fall` (legs apart), `land` (squash, 0.1 s), `spookBody` + `boots` (the spooked gag: the body pops up while the boots stay put for 0.35 s). `workerFrame(player, t, fx)` picks the frame (tested).
- Failed-shift feedback: red pixel frame around the worker (0.25 s). No camera shake.
- Jump and landing kick up dust; a hazard or fall death bursts into a white puff.

## 5. The freaks

- **Nature undefined** (GDD §4.8). Draw attitude (nosy, grabby, smug), never a recognizable animal or creature type.
- **Attitude reference: Sableye (Pokémon)**: gleeful, lurking in the dark, delighted with its own tricks. Take the *energy* only. Never take its look: no gem eyes, no chest gem, no purple goblin body, no toothy grin. Our freaks stay black lumps with plain square eyes, and expression comes from timing (blinks, narrowing, jitter, peeking).
- **Never fully shown.** No faces beyond eyes, no full-light view, no close-up.
- ✅ Sprites (12×13 art px, body `#05060f`, rim `#5ff2ff`): **lurker** (hunched, tufts, 2-frame wobble), **peeker** (tall and thin, hands on the ledge), **squatter** (wide and smug, sitting on its hoard: a plank end and a hard hat). Jitter ±1 art px while active.
- ✅ Eyes: two 1×2 art-px eyes in `#ffec5a`, blink (shut ~0.12 s every ~3.1 s, offset per freak); lurker eyes glance; eyes **squint** smugly for 0.8 s after a prank.
- ✅ Peeker hidden: a dark slot with eyes.
- ✅ By day: dotted outline of the silhouette in the night echo blue, eyes at 60%. On every shift to day the outlines **flash** white once (freeze cue, 0.15 s).
- ✅ Prank sparkle: plus-shaped twinkles in the freak-eye yellow over the changed tiles (0.5 s). Off with reduced effects.
- *(post-jam)* Scatterer: scurry pose.

### 5.1 New freaks *(built 2026-11-02; used in `supervisor` and `daywalker`)*

| Freak | Look | Facing / state cue | Colors (existing only) |
|---|---|---|---|
| **Supervisor** (`supervisor`) | The usual lump, a bit taller, holding a clipboard (a paper rectangle with three ink lines). Sits on a perch. | The head bump and clipboard sit on the watched side; eyes are drawn only on that side; it snaps (no tween) when it turns, with 0.3 s of anticipation (the eyes slide across first). | Body `#05060f`, rim `rgba(95,242,255,0.6)`; clipboard paper `#f7efdc`, ink `#3b2d1f`; eyes freak yellow |
| **Slacking freaks** (unwatched) | Same silhouette, no jitter | Eyes closed to 1 px lines; a tiny "z" in `hudSoft` above (optional) | Existing |
| **Day-walker** (`daywalker`) | Same lump, readable in daylight: dark body against the warm sky, with a cream rim instead of cyan | By night: dashed outline in the **day echo orange** (it belongs to the day shift), dim eyes | Body `#05060f`, rim `#fbecc9`; night outline `rgba(255,170,80,0.95)` |

## 6. Environment

- Background: six big windows across the back wall (40 px margin, 160 px spacing, 4 panes each), kept faint so they never read as platforms. Day: pale panes. Night: most windows faintly lit warm, some dark; dim stars above.
- Solids: day = brick courses; night = inset panel seams.
- ✅ Props per level, never collidable (§6.2): notice board with memos, vents (where peekers live), barrier tape at shafts, pallets on delivery stacks, signage ("CLOSING TIME", "WET FLOOR"), footprints leading to prank targets.

### 6.1 New tiles and objects *(drawing built 2026-11-02 in `src/art.js`; wet floor and the offset floor signs are in use, the rest wait for their levels)*

| Item | Level | Drawing | Colors |
|---|---|---|---|
| Wet floor `~` | `wet` | Normal solid of its shift + 2–3 short diagonal sheen strokes per tile; the top edge drawn as a gentle wave (2 px amplitude) | Night: fill `#2e4173`, sheen and edge `#5ff2ff`. Day (if ever used): fill `#6e5a45`, sheen and edge `#fbecc9` |
| WET FLOOR sign | `wet` | A-frame sign prop next to the first `~` | Sticky-note yellow `#ffe96b`, ink `#5a3d10` |
| Doors | `doors` | Full-height solid with a frame line and a knob | Shift solid fill; frame = shift edge color; knob `#9dffb8` |
| Empty door frame (stolen) | `doors` | Frame lines only, no fill, non-solid | Shift `hudSoft` |
| Door pile | `doors` | Doors lying flat, stacked, each 1 tile tall | Same as doors |
| LOST & FOUND box | `doors` | Cardboard box prop with a label | Box: day solid `#6e5a45`; label paper/ink |
| Pillar | `pillar` | Solid with vertical fluting (2 lines), capital and base bands | Shift solid fill and edge |
| Ceiling crack / dust outline | `pillar` | Zigzag line where the pillar was; dust rectangle on the floor | Shift `hudSoft` |
| Staircase to nowhere | `stairs` | Ordinary night solids, 1-tile steps | Night solid |
| The freaks' proud sign | `stairs` | Hand-painted board at the top step | Sticky-note yellow, ink |
| Portrait ("just eyes") | `portrait` | Framed rectangle; inside, darkness and two pairs of eyes that blink | Frame ink `#3b2d1f`, canvas `#05060f`, eyes freak yellow |
| Nail / pale square | `portrait` | Where the portrait used to hang | Shift `hudSoft` |
| Floor signs "3" / "3.5" | `offset` | Wall signs at each landing | Timecard paper `#f7efdc`, ink `#3b2d1f` |
| Time clock (the exit) | `clockout` | The exit door with a punch clock beside it | Exit colors + checkpoint clock `#ffd23f` |

### 6.2 Props per level *(prop drawings built; the 12 built levels have their props via the `props` field; planned levels add theirs when built)*

| Level | Props |
|---|---|
| `clock` | Barrier tape at the shaft, a RENOVATION sign |
| `scaff` | Pallets on the delivery stack, a crate label |
| `closing` | CLOSING TIME sign, laser warning stickers |
| `midair` | Eyes in the dark (built), a vent |
| `inventory` | Notice board with the plank memo, footprints to the second pit |
| `watch` | A vent, a mug by the spawn (the squatter's hoard is part of its sprite) |
| `stairs` | The proud sign, eyes under the stairs |
| `doors` | Empty frames, the pile, LOST & FOUND box |
| `wet` | A WET FLOOR sign, footprints on the wax |
| `pillar` | Ceiling crack, dust outline, a memo |
| `supervisor` | A STAFF ONLY sign, a vent, footprints |
| `stacked` | Three tells in view from the spawn, a notice board, chalk circles and footprints on the middle floor (night) |
| `offset` | Floor signs 3 / 3.5 |
| `daywalker` | A DAY SHIFT sign, a mug, footprints in the day-walker's tunnel |
| `portrait` | EMPLOYEE OF THE MONTH plaque, the nail |
| `clockout` | The time clock on the ledge, a coat rack, a vent, a LAST SHIFT sign, eyes everywhere in the dark |

## 7. UI and effects

| Element | Spec |
|---|---|
| Font | The pixel font (§0). Scales: 9 logo, 6 act title, 4 screen titles, 3 headings and tutorial, 2 HUD and body, 1 footnotes and debug |
| HUD | Top-left `n/N LEVEL NAME`; top-right shift label + pixel sun / crescent moon; below it `CLOCK-INS n · PAR p` (red over par); the level note centred near the bottom of the screen for the first 5 s (where it can't cover an exit, a tell or a freak). All scale 2 with a halo (§3.1) |
| Tutorial | Level 1 until first shift: "Press SHIFT (or K) to change shifts" + "Dashed outlines show the other shift" |
| Shift effect | Screen tint 0.12 s (day: warm `rgba(255,240,200,·0.22)`, night: blue `rgba(40,80,200,·0.18)`), expanding ring 0.3 s from the worker |
| Death effect | Red tint 0.3 s |
| Popups | "SPOOKED!" family over the worker; "hee hee hee" (italic, yellow) under the HUD on a prank; rise 30 px and fade over 0.9 s |
| Timecard | 480×330 paper panel, rows Clock-ins / Par / Time / Incidents, a rubber stamp that slams in 0.45 s after the win (ON PAR / UNDER PAR! / +n OVERTIME), the comment line, NEW BEST |
| Title | Split day/night background with a floor across both, the pixel logo (DOUBLE in day ink, SHIFT in night ink, drop shadows) with the worker between the words, the controls panel, LEVEL SELECT (L) and SETTINGS (O) buttons, a blinking clock-in prompt, eyes in the night half, Sticky Keys footnote |

### 7.1 Screens and effects (built 2026-11-02 unless marked)

| Screen / effect | Spec |
|---|---|
| Title + level select ✅ (A7) | Title: a LEVEL SELECT (L) button under the panel. Level select (night background): one row of 200×74 paper timecards per act, act label above each row; each card shows `n. NAME`, `BEST n · PAR p` or `PAR p`, and a small rotated stamp (ON PAR / UNDER! in `#c0392b`, `+n` in `#7f6a50`). Locked cards at 35% opacity reading NOT YET. Selection: 3 px `#5ff2ff` frame. Unlock: act starts always open; otherwise after the previous level is cleared. |
| Settings ✅ (A6) | Opened with O from title (button) and pause. Four night panels: MASTER, MUSIC, SOUND (10-block bars + %), REDUCED EFFECTS (ON/OFF). ↑↓ choose, ←→ change (or click the left/right half of a row), Esc back. Saved. |
| Act cards ✅ (A10) | 1.6 s split day/night card: ACT n (scale 3, yellow), the act name (scale 6, haloed), one line (WRITING.md §2.1); any key or click skips; a two-chord sting. Shown the first time an act starts in a run. |
| Timecard comment ✅ (A8) | One line under the stamp, scale 2 when it fits, else 1 (`timecardComment` in `src/copy.js`, WRITING.md §7). |
| End screen totals ✅ (A8) | Paper panel listing every level with clock-ins / par, and total clock-ins vs. total par. The ending: a dozen pairs of eyes open one by one in the margins, one freak waves (a small hand with a cyan rim), then "See you tonight." |
| Credits *(planned)* | Night panel in the pixel font, from WRITING.md §8. |
| Freeze cue ✅ | On a shift to day, frozen freak outlines flash white once (0.15 s), with a scratch sound. |
| Checkpoint ping ✅ | The clock face grows by 2 art px and settles over 0.2 s when taken. |

Effects must stay readable under rapid shifting: no stacking full-screen flashes (the tint resets, doesn't add), no shake. **Reduced effects** (Settings) turns off the screen tints, shift rings and prank sparkles.

## 8. Marketing media (for itch, RELEASE.md)

| Asset | Size | Content |
|---|---|---|
| Cover image ✅ | **1260×1000** (630×500 ratio) | `tools/cover.html`, drawn with the game's own sprites, tiles and font at 2×: split day/night, the worker mid-jump on the seam (day colours left, night right) inside shift rings, a night-only plank and its echo, a smug lurker and eyes on the night side, a MINE note on the day side, the logo, the tagline |
| Screenshots ✅ | 960×540 (native) | `npm run media`: title, level 1 day/night, timecard, Inventory day/night, Night Watch night/day, level select, act card |
| Demo GIF | ≤ 960 wide, ≤ 10 s, first in the screenshot list | A mid-air shift chain, then a frozen-lurker pass |
| Page theme | Background `#0b1029`, text `#d9f6ff`, links `#5ff2ff` | Matches the night palette; embed background `#0b1029` (same as `index.html`) |

Capture with `npm run media` (headless Edge/Chrome: cover, screenshots, gallery, audio and draw-cost checks); record GIFs from a real play session.
