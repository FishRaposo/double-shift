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

**Identity (decided 2026-11-03):** *A workplace comedy in two lights: warm paper-and-brick days, cool cyan-panel nights. Everything official is paper (timecards, notes, stamps). The freaks are glowing eyes and lumpy silhouettes in the dark, more present every act.* Every art change serves that sentence and the reading order in §3.1. The identity and readability pass that applies it is BUILD.md T20–T21 (✅ built Nov 3; CONTENT.md ART-20, ART-21).

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
| Solid fill | `#6e5a45`; staggered brick courses in mortar `#5d4b39`, the odd highlight `#7d6852` |
| Solid edge (top/sides) | `#fbecc9`, 1 art px (2 px), with a `#c9ad84` shade under the top edge; `#4a3b2c` shadow on open bottoms |
| Echo of night geometry | dashed `rgba(52,96,230,1)`, 2.5 px, dash 8/5 |
| HUD text / soft / halo | `#3b2d1f` / `rgba(59,45,31,0.85)` / `rgba(246,231,200,0.9)` |
| Sun icon | `#f2a516` |

### Night shift
| Role | Value |
|---|---|
| Sky gradient top → bottom | `#0b1029` → `#1d2a56` in 8 flat bands; 70 stars, each a fixed `rgba(255,255,255,0.10–0.40)` (the background is drawn once per act, so they don't twinkle in game; the cover draws them at another moment) |
| Lit windows / dark windows / frames | `rgba(255,214,110,0.12)` (two of the six) / `rgba(120,150,255,0.05)` / `rgba(120,150,255,0.05)` |
| Solid fill | `#2e4173`; riveted panels, seams `#24345e`, rivets `rgba(95,242,255,0.3)` |
| Solid edge | `#5ff2ff`, 1 art px (2 px), with a `#3aa8bd` shade under the top edge; `#1a2647` shadow on open bottoms |
| Echo of day geometry | dashed `rgba(255,170,80,0.95)`, 2.5 px, dash 8/5 |
| HUD text / soft / halo | `#d9f6ff` / `rgba(217,246,255,0.85)` / `rgba(11,16,41,0.9)` |
| Moon icon | `#d9f6ff` crescent |

*Note:* each echo uses the **other** shift's echo color (day view shows night geometry in blue, night view shows day geometry in orange), so the echo's color says which shift it belongs to.

### Shared colors
| Element | Value |
|---|---|
| Rebar (day hazard) | spikes `#b04a20` / `#8f3a18` in alternating rows on a `#6a2c12` base (`HAZARD` in `src/art.js`; darkened Nov 3 to hold 3:1 on the low sky band) |
| Laser (night hazard) | beam `#ff3b5c` (dimmer `#e8324f` as it flickers) with a `rgba(255,59,92,0.14–0.28)` glow, emitters `#ff9db0` with white tips |
| Exit door day / night | `#3d7a4a` / `#1f6b47`, 1 art px frame and knob `#9dffb8`; lit sign box `#2bdc6a` above the door with `EXIT` in `#06210f` (pixel font, scale 1) |
| Checkpoint (punch clock) | box `#3a4048` with a `#9aa3ad` front, card slot `#1b1209`; clock face `#d6dbe0` off / `#ffd23f` on, rim and hands `#2a2018`; once taken, a timecard `#f7efdc` with a `#c0392b` stripe in the top; post `#6b5a48`, foot `#4a3b2c` |
| Freak body | `#05060f` with a `#5ff2ff` rim drawn into the sprite (cream `#fbecc9` for the day-walker); the supervisor's visor `#2bdc6a`; the day-walker's hard hat `#ff8a1c` (orange: it's out on the worker's shift, so it wears none of the worker's colors, tested) and shades `#3a4048` with white glints |
| Freak eyes | `#ffec5a`; decor and tell eyes add a glow `rgba(255,236,90,0.25)` |
| Sticky note | `#ffe96b` sized to its text, text `#5a3d10` in the pixel font, a strip of tape on top |
| Timecard paper / ink / stamp | `#f7efdc` / `#3b2d1f` / `#c0392b` (on/under par), `#7f6a50` (overtime) |
| Debug | `#ff00ff` hitbox, `#0f0` text |

### Backdrops (`BACKDROP` in `src/art.js`, Nov 3)
Behind everything, one motif per act (§6). Every color stays ≤ 1.35:1 against the sky it's drawn on, overlaps included (§3.1).

| Role | Day | Night |
|---|---|---|
| `line`: poles, pipes, shelves, blind slats, fixtures, the wall clock | `rgba(110,80,45,0.13)` | `rgba(120,150,255,0.1)` |
| `fill`: tarps, boxes | `rgba(110,80,45,0.07)` | `rgba(120,150,255,0.05)` |
| `light`: tubes, bulbs and their cones | `rgba(255,255,240,0.5)`; fixture glow `rgba(255,255,240,0.25)` | `rgba(255,214,110,0.1)` |
| Finale | dawn: the low sky in three steps of `rgba(255,200,200,0.12 / 0.22 / 0.32)` (lighter, never darker, so echoes and rebar keep 3:1); sun `rgba(255,248,225,0.6)` | moon `rgba(217,246,255,0.1)` |
| Act 4 night | — | emergency lights `rgba(230,240,255,0.1)` (white: red at night means a laser), their glow `rgba(230,240,255,0.03)`; EXIT pictograms `rgba(43,220,106,0.14)` (an arrow, no text: only the real exit reads EXIT) |

## 3. Readability system

| Thing | How it's shown | Non-color cue |
|---|---|---|
| Solid in current shift | Filled tile + bright top/side edge | Fill vs outline |
| Solid in other shift (echo) | Dashed outline of the region's outer edges, never filled | Dashed line |
| Exists **only** in current shift | Fill + diagonal hatch on the region's rim (one tile deep; not along the screen edge). None in levels with a generated night (offset, upside down), where the echoes carry it (`shouldHatch` in `art.js`, tested) | Hatch pattern |
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
| Day-walker | Day: dark silhouette with a cream rim, an orange hard hat and shades. Night: dashed outline in the day echo orange | Silhouette (hard hat) / dashed |
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
| "Only in this shift" shows on both palettes | Hatch `rgba(255,232,170,0.6)` by day, `rgba(95,242,255,0.35)` by night, on the rim of the region only (Nov 3), so big one-shift walls read as solids with a hatched edge, not fields of stripes |
| HUD text never disappears into a wall | Every HUD line sits on a plate (`PLATE`: the shift's sky at 85 %) instead of a halo (Nov 3: halos smeared over brick); the level note sits on a paper strip (`NOTE_STRIP`) |
| Score state at a glance | `CLOCK-INS n · PAR p` turns red once over par (`overPar`: `#a82317` by day, `#ff7a6b` by night, Nov 3; the old `#e0473c` fell to 2.7:1 on the day plate over brick). The numbers carry it too |
| Prank warnings are noticeable | Night tell and decor eyes at 4×8 px each with a soft glow `rgba(255,236,90,0.25)`, blinking (`drawGlowEyes`, Nov 3: 2×); day MINE note 42×30 |
| Pixels stay square | The canvas snaps to a whole number of device pixels per canvas pixel (CSS px × `devicePixelRatio`, so 125 % and Retina screens count right), unless that wastes more than 15 % of the window; then it fits the window (`canvasScale` in `src/layout.js`, tested) |

**These rules are tests** (`test/palette.test.mjs`, 2026-11-03): WCAG contrast between the colors that actually meet on screen, rgba composited over what it's drawn on, checked against both sky bands of each shift (by day also the finale's dawn-tinted low sky).

| Pair | Minimum | Measured (Nov 3) |
|---|---|---|
| Worker outline vs sky | ≥ 3:1 | 11.3–16.6 |
| Solid vs sky, by fill or edge (day: the brick fill; night: the cyan edge) | ≥ 3:1 | day 4.0–5.4, night 10.3–14.0 |
| Night solid fill vs night sky | ≥ 1.3:1 (lighter than the sky) | 1.4–1.9 |
| HUD text vs its plate (`PLATE`, the sky at 85 %), over sky or any solid | ≥ 7:1 | passes |
| Secondary HUD text (`hudSoft`) and the over-par red on the plate | ≥ 4.5:1 | hudSoft day 6.1–7.2, night 8.9–12.1; over par day 4.8–5.9, night 5.2–7.4 |
| Note strip ink vs paper; sticky note ink vs note | ≥ 7:1; ≥ 4.5:1 | 11.6; 8.1 |
| The other shift's echo vs this sky | ≥ 3:1 | 3.2–9.0 |
| Hazards vs sky, in every color they flicker through (`HAZARD`) | ≥ 3:1 | passes since the identity pass (rebar spikes `#b04a20` / `#8f3a18`, dim laser `#e8324f`); before it, the rebar was 1.8–3.6 and the dim laser 2.4 |
| Freak eyes vs freak body | ≥ 4.5:1 | 16.7 |
| Background windows and frames vs sky (the quiet layer) | ≤ 1.35:1 | 1.05–1.33 |
| Every act's backdrop vs the sky behind it, pixel by pixel with overlaps (the test rasterizes each backdrop; it may only draw rects) | ≤ 1.35:1 | day 1.14–1.32, night 1.18–1.33 |
| Every act looks different from every other | ≥ 3 % of the screen differs | passes |

## 4. The worker

- Hitbox 18×26 px (9×13 art px); sprite 11×16 art px with a built-in outline (`#1b1209` by day, `#d9f6ff` by night). Blue overalls (`#2f6fdc` / shade `#2558b8` day, `#3f86ff` / `#2f6fdc` night), face `#f2c79a`, eye on the facing side, yellow hard hat `#ffcc33`, hi-vis stripe (`#ffe680` day, `#c6ff4d` night), brown boots `#5a3d10`.
- ✅ Frames: `idle0/1` (bob), `run0–3`, `jump` (legs tucked), `fall` (legs apart), `land` (squash, 0.1 s), `spookBody` + `boots` (the spooked gag: the body pops up while the boots stay put for 0.35 s). `workerFrame(player, t, fx)` picks the frame (tested).
- Failed-shift feedback: red pixel frame around the worker (0.25 s). No camera shake.
- Jump and landing kick up dust; a hazard or fall death bursts into a white puff.

## 5. The freaks

- **Nature undefined** (GDD §4.8). Draw attitude (nosy, grabby, smug), never a recognizable animal or creature type.
- **Attitude reference: Sableye (Pokémon)**: gleeful, lurking in the dark, delighted with its own tricks. Take the *energy* only. Never take its look: no gem eyes, no chest gem, no purple goblin body, no toothy grin. Our freaks stay black lumps with plain square eyes, and expression comes from timing (blinks, narrowing, jitter, peeking).
- **Never fully shown.** No faces beyond eyes, no full-light view, no close-up.
- ✅ Sprites (12×13 art px, body `#05060f`, rim `#5ff2ff`), one silhouette per kind so a frozen outline still says which kind it is (`test/art.test.mjs`: every pair ≥ 12 art px apart; every silhouette fills ≥ 75 % of its hitbox, so a touch looks like a touch): **lurker** (pointed ears, wide body, 2-frame walk), **peeker** (narrow, fingers gripping above its head), **squatter** (wide and smug, low on its hoard: a plank end and a hard hat), **supervisor** (a green visor `#2bdc6a` and its clipboard), **day-walker** (a hard hat, since it clocked in for the day shift, in orange `#ff8a1c`, never the worker's yellow; shades `#3a4048` with white glints instead of eyes). Jitter ±1 art px while active.
- ✅ Eyes: two 1×2 art-px eyes in `#ffec5a`, blink (shut ~0.12 s every ~3.1 s, offset per freak); lurker eyes glance; eyes **squint** smugly for 0.8 s after a prank.
- ✅ Peeker hidden: a dark slot with eyes.
- ✅ By day: dotted outline of the silhouette in the night echo blue, eyes at 60%. On every shift to day the outlines **flash** white once (freeze cue, 0.15 s).
- ✅ Prank sparkle: plus-shaped twinkles in the freak-eye yellow over the changed tiles (0.5 s). Off with reduced effects.
- ✅ Upside Down (Nov 3): a freak of a flipped shift hangs from the solid above its cell (`hang` on its box, rules.js) and draws upside down (`vflip`), outline and eyes included; a ducked peeker's slot sits on the ceiling side. The day-walker belongs to the day, which never flips.
- *(post-jam)* Scatterer: scurry pose.

### 5.1 New freaks *(built 2026-11-02; used in `supervisor` and `daywalker`)*

| Freak | Look | Facing / state cue | Colors (existing only) |
|---|---|---|---|
| **Supervisor** (`supervisor`) | The usual lump, a bit taller, holding a clipboard (a paper rectangle with three ink lines). Sits on a perch. | The head bump and clipboard sit on the watched side; eyes are drawn only on that side; it snaps (no tween) when it turns, with 0.3 s of anticipation (the eyes slide across first). | Body `#05060f`, rim `rgba(95,242,255,0.6)`; clipboard paper `#f7efdc`, ink `#3b2d1f`; eyes freak yellow |
| **Slacking freaks** (unwatched) | Same silhouette, no jitter | Eyes closed to 1 px lines; a tiny "z" in `hudSoft` above (optional) | Existing |
| **Day-walker** (`daywalker`) | A lump in an orange hard hat and shades (Nov 3: its own silhouette), readable in daylight: dark body against the warm sky, with a cream rim instead of cyan | By night: dashed outline in the **day echo orange** (it belongs to the day shift), dim shades | Body `#05060f`, rim `#fbecc9`, hat `#ff8a1c`, shades `#3a4048`; night outline `rgba(255,170,80,0.95)` |

## 6. Environment

- Background: the sky in 8 flat bands (dim stars at night), then the backdrop. The back wall has six big windows (40 px margin, 160 px spacing, 4 panes each), kept faint so they never read as platforms; the frame is drawn around and between the panes, never under them. Day: pale panes. Night: two windows faintly lit warm, the rest dark (`windowDark`, Nov 3: four lit windows read as grey boxes). The menus use this plain wall.
- Per-act backdrops (Nov 3, `drawBackdrop`; colors in §2), so each act has its own look at a glance:

  | Act | Day | Night |
  |---|---|---|
  | 1 Renovation | Scaffolding in front of the wall: poles in the gaps between the windows, three ledgers, two braces, two tarps (strips with fold gaps and a sagging hem), a ladder | The same |
  | 2 Overtime | Blinds half drawn in every window (slats with the pane between them), a wall clock at five | The clock reads three in the morning; the two lit windows glow through their blinds |
  | 3 Graveyard Shift | No windows: three warehouse shelving units full of boxes, two pipes along the ceiling with flanges, a drop pipe on the right | The same |
  | 4 Lights Out | No windows: three rows of fluorescent fixtures with dim tubes and light cones | The fixtures are dead; three twin-head emergency lights glow down the wall, and two EXIT pictogram signs |
  | 5 Upside Down | Lamps hanging between the windows, light cones under them | The whole backdrop upside down |
  | Finale | Dawn: the low sky warms to pink in three steps, the sun's rim on the horizon | The moon, low |
- Checkpoint (Nov 3): a punch clock on a post, a metal box with a clock face and a card slot (`checkpointRect`, always on screen, tested). Grey face when unset; once taken the face lights `#ffd23f` and a timecard sticks out of the top. The face swells on the ping.
- Exit (Nov 3): the lit EXIT sign sits above the door, or beside it when there's no room above, and never leaves the screen (`exitRects`, tested).
- Barrier tape (Nov 3): a cordon of two stanchions standing on the floor with striped tape sagging between their tops, never a line across a gap at floor height (it read as a bridge).
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
| Upside Down night ✅ (Nov 3) | act 5 | Everything with a floor side turns over on the flipped night: the worker (`vflip`; `spriteRect` keeps the hitbox rows, so the hat hangs below), freaks, lasers and hazard echoes (the band at the top of the tile, matching the rules), the checkpoint (mirrored inside its cell) and the exit (the door hangs from its cell top; the sign goes under it, or beside it with no room). Dust kicks from the feet side, the spook gag pops away from the floor, tells hang under their target, and a prop with `flip: true` is mirrored inside its cell. The HUD, notes, signs and the EXIT text stay upright | Existing colors |

### 6.2 Props per level *(prop drawings built; the 12 built levels have their props via the `props` field; planned levels add theirs when built)*

| Level | Props |
|---|---|
| `clock` | Barrier tape at the shaft, a RENOVATION sign |
| `scaff` | Pallets on the delivery stack, a crate label |
| `closing` | CLOSING TIME sign, laser warning stickers |
| `midair` | Eyes in the dark (built), a vent |
| `inventory` | Notice board with the plank memo, footprints to the second pit |
| `watch` | A vent, a mug by the spawn (the squatter's hoard is part of its sprite) |
| `stairs` ✅ | The proud sign OUR STARES! over the top step and eyes under the stairs (night); a notice board and barrier tape (day) |
| `doors` ✅ | Three doors that leave empty frames when stolen, the pile (night), the LOST & FOUND box, a notice board (day), a vent (night) |
| `wet` | A WET FLOOR sign, footprints on the wax |
| `pillar` ✅ | The pillar skin at each place it stands, a crack and dust outline where it stood (night), a notice board, a LOAD BEARING sign and a pallet (day) |
| `supervisor` | A STAFF ONLY sign, a vent, footprints |
| `stacked` | Three tells in view from the spawn, a notice board, chalk circles and footprints on the middle floor (night) |
| `offset` | Floor signs 3 / 3.5 |
| `audit` ✅ | An INSPECTION sign and a notice board (day); a mop bucket and a WET FLOOR sign by the wax (night) |
| `daywalker` | A DAY SHIFT sign, a mug, footprints in the day-walker's tunnel |
| `portrait` ✅ | The portrait skin wherever it hangs (night), a nail and unfaded patch at each of its spots (`PROPS.nail`, night), the EMPLOYEE OF THE MONTH plaque and a notice board (day) |
| `upside` ✅ | A MIND YOUR HEAD sign and a notice board (day); a coffee mug stuck upside down under the walkway (night, `flip`) |
| `clockout` | The time clock on the ledge, a coat rack, a vent, a LAST SHIFT sign, eyes everywhere in the dark |

## 7. UI and effects

| Element | Spec |
|---|---|
| Font | The pixel font (§0). Scales: 9 logo, 6 act title, 4 screen titles, 3 headings and tutorial, 2 HUD and body, 1 footnotes and debug |
| HUD | Top-left `n/N LEVEL NAME`; top-right shift label + pixel sun / crescent moon; below it `CLOCK-INS n · PAR p` (red over par); the level note centred near the bottom of the screen for the first 5 s (where it can't cover an exit, a tell or a freak), on a paper strip. All scale 2; HUD lines sit on plates in the shift's sky colour (§3.1) |
| Tutorial | Level 1 until first shift: "Press SHIFT (or K) to change shifts" + "Dashed outlines show the other shift" |
| Shift effect | Screen tint 0.12 s (day: warm `rgba(255,240,200,·0.22)`, night: blue `rgba(40,80,200,·0.18)`), expanding ring 0.3 s from the worker |
| Death effect | Red tint 0.3 s |
| Popups | "SPOOKED!" family over the worker; "hee hee hee" (italic, yellow) under the HUD on a prank; rise 30 px and fade over 0.9 s |
| Timecard | 480×330 paper panel, rows Clock-ins / Par / Time / Incidents, a rubber stamp that slams in 0.45 s after the win (ON PAR / UNDER PAR! / +n OVERTIME), the comment line, NEW BEST |
| Title | Split day/night background with a floor across both, the pixel logo (DOUBLE in day ink, SHIFT in night ink, drop shadows) with the worker between the words, the subtitle "The freaks come out at night." (scale 2, `#ffec5a`, draft in WRITING.md §2), the controls panel, LEVEL SELECT (L) and SETTINGS (O) buttons, a blinking clock-in prompt, Sticky Keys footnote. The night half shows the hook before level 6 does (Nov 3): three pairs of glowing eyes and a lurker on the floor, looking at the worker |

### 7.1 Screens and effects (built 2026-11-02 unless marked)

| Screen / effect | Spec |
|---|---|
| Title + level select ✅ (A7) | Title: a LEVEL SELECT (L) button under the panel. Level select (night background, laid out by `src/layout.js` so six rows fit): one row per act, with a 90-px night tab on the left (ACT n at scale 2 and the act name at scale 1, or FINALE) and up to four 196×56 paper timecards; each card shows the level number (scale 3), the name (scale 1, wrapped), and `PAR p`, NOT YET, or a small rotated stamp (ON PAR / UNDER! in `#c0392b`, `+n` in `#7f6a50`). A paper detail bar at the bottom gives the selected level's full name, best and par at scale 2. Locked cards at 40% opacity. Selection: 3 px `#5ff2ff` frame. Unlock: act starts always open; otherwise after the previous level is cleared. |
| Settings ✅ (A6) | Opened with O from title (button) and pause. Four night panels: MASTER, MUSIC, SOUND (10-block bars + %), REDUCED EFFECTS (ON/OFF). ↑↓ choose, ←→ change (or click the left/right half of a row), Esc back. Saved. |
| Act cards ✅ (A10) | 1.6 s split day/night card: ACT n (scale 3, yellow), the act name (scale 6, haloed), one line (WRITING.md §2.1); for the finale (act 6): FINALE, then the level's name. Any key or click skips; a two-chord sting. Shown the first time an act starts in a run. |
| Timecard comment ✅ (A8) | One line under the stamp, scale 2 when it fits, else 1 (`timecardComment` in `src/copy.js`, WRITING.md §7). |
| End screen totals ✅ (A8) | Paper panel with one row per act (clock-ins / par over the levels played) and total clock-ins vs. total par. The ending: a dozen pairs of eyes open one by one in the margins, then a lurker rises out of the bottom margin (scale 3) and waves an 8×10-art-px hand with a cyan rim (the `hand` sprite), then "See you tonight." |
| Credits ✅ | Three lines in the pixel font (scale 2, soft ink) on the end screen's paper panel, under the totals (WRITING.md §8). |
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
