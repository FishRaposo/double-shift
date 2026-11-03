# DOUBLE SHIFT
## Game Design Document

**Version:** 0.6.0  
**Status:** Prototype  
**Project:** Game Off 2026  
**Theme:** SHIFT  
**Genre:** 2D Puzzle-Platformer  
**Platform:** Browser (HTML5), desktop keyboard first  
**Development Window:** November 1–December 1, 2026  
**Engine:** Plain JavaScript (ES modules) on a 2D canvas, no engine, no dependencies  
**Developer:** Vinícius Raposo  
**Title:** Double Shift (working title "SHIFT" retired in v0.2). Subtitle candidate: *The Freaks Come Out at Night* (provisional)


---

# At a Glance

**Pitch.** A 2D puzzle-platformer where you work the day shift and the night shift in the same building at once. Press Shift to step between them, even mid-jump. Every time you clock into night, the freaks may prank the building, and when you're on the day shift they freeze. Finish each level in as few clock-ins as possible.

| Topic | The short version | Details |
|---|---|---|
| Verbs | Move, jump, shift. Nothing else. | §3 |
| Shift rules | Same spot, momentum kept, instant, no cooldown, one shift per key press, separate geometry per shift, a blocked shift nudges ≤ 4 px → waits 80 ms → is refused | §3.3 (S-01…S-08) |
| The other shift | Shown as dashed outlines; geometry that exists only in your current shift is hatched; nothing on the other shift moves | §4.6, §7 |
| The freaks | Undefined, nocturnal, out to annoy you. Pranks fire on the Nth night clock-in; visible freaks (lurker, peeker, squatter, supervisor) freeze by day, and the day-walker freezes by night. Never chase, always telegraphed. | §4.8–4.10 |
| Score | Timecard: clock-ins vs. par (fewest shifts the designer found, proven by tests) | §15.3 |
| Tone | Mock horror: petty monsters, deadpan worker, no gore, no jump scares | §10.5 |
| Look and sound | Crisp pixel art on a 2-px grid, a hand-made pixel font, a spooky-goofy theme whose day/night arrangements crossfade on every shift; all made in code (built 2026-11-02) | §10, §11, ART.md, AUDIO.md |
| Levels | **21: five acts of four plus the finale.** <!-- n:levels -->21<!-- /n --> built (tier A, the 12 built on Nov 2, is a complete game); tier B = 17, tier C = 21 with act 5 Upside Down (night flipped, gravity up) and the finale rework. All five new mechanics shipped, Upside Down last | §8.2, [CONTENT.md](CONTENT.md) |
| Jam | Game Off 2026, theme SHIFT, due Dec 1 13:37 PST. Lead with the pranks and freezing freaks: two overlapping worlds alone is one of the jam page's example ideas. | §1.8 |

**Living sections** (kept current): §0, §1, §3, §4, §8.2, §10.5, §15.3, §18, §21. **Historical sections** (the original pre-v0.2 plan, kept for the record): §13.1–13.8, §16, §22. Their banners say what replaced them.

---

# Companion documents

This GDD decides *what* the game is. The production docs in this folder decide *how* it gets made and shipped; see [INDEX.md](INDEX.md): PRODUCTION (schedule, backlog), TECH, LEVELS, ART, AUDIO, WRITING, PLAYTEST, RELEASE.

---

# 0. Changes

## v0.6

| Change | Why |
|---|---|
| **21 levels: five acts of four plus the finale** (§8.2), with a freak-and-mechanic ladder | Fish, 2026-11-02: start almost normal, introduce everything gradually, grow into the Upside Down levels, end on a finale that pays it all off |
| **Act 5: Upside Down**: at night the map is flipped and gravity points up (LEVELS.md §5.2) | Fish's idea; the other shift becomes the same building turned over |
| Two new levels: **Night Audit** (act 4 exam) and **Head Over Heels** (act 5 combination) | Each late act ends on a combination level |
| **Clock Out reworked** as an upside-down finale, one room per act; today's version is the fallback | The finale should pay off every act |

## v0.5

| Change | Why |
|---|---|
| **16 levels in four acts** (§8.2), built in tiers A/B/C with dated cut lines; all six idea-pool levels slotted | Fish's call, 2026-11-02, after the 6-level build played well. Tiers keep any cut shippable. |
| Four new mechanics in jam scope: **wet floor, supervisor freak, offset layer, day-walker** (§4.10, §8.2) | Each gets its own level and a cut date |
| Act 3 renamed **Graveyard Shift**; new Act 4 **Lights Out** | Four acts of four |
| New manifest [CONTENT.md](CONTENT.md): every level, asset, sound and text item with an ID | One place to see the whole game |

## v0.4

| Change | Why |
|---|---|
| Added **§1.8 Jam fit and scoring**: the six rated categories, the overlap with the jam page's example idea, the rating-count rule | Read the jam page and the host's FAQ (2026-11-02). Our core premise is one of the host's own example ideas, so Innovation depends on the freaks and pranks leading everywhere. |
| §1.7 Theme: added the readings the jam page itself lists (night shift, Sticky Keys) | Theme interpretation is a rated category |
| §10.1: art stays **code-drawn, as a deliberate style**; no outside artist for the jam | Fish's decision 2026-11-01. Graphics is rated, so "placeholder" has to become a style (ART.md §1.1). |
| §18: three jam risks added | Innovation overlap, raters quitting before the freaks, a low rating count |
| Added **At a Glance** (top of this doc); marked §13.1–13.8, §16 and §22 as historical | Readability: the whole design should fit on one screen, and stale plans shouldn't read as current |
| **Freak personality** (§4.8): nocturnal little menaces who exist to annoy you. References: *they act like raccoons who know dark magic*, and Sableye (Pokémon) as the model prankster. Both describe behavior only; **what they actually are stays undefined.** | Fish's direction, 2026-11-02. Gives art, audio and writing one shared attitude to draw from, without answering the mystery. |

## v0.3

| Change | Why |
|---|---|
| Added **the freaks** (§4.8): a joke antagonist that is never fully shown | Gives the changes between shifts a culprit and the game a comedic spine. |
| Tone locked as **mock horror** (§10.5) | Ridiculous real monsters messing with you; no gore, no jump scares, death is a gag. |
| Added **pranks** (§4.9): the freaks change geometry on the Nth entry into night | The signature mechanic. Shift count becomes a resource, not just a score. |
| Added **visible freak behaviors** (§4.10): lurker, peeker, squatter; scatterer for act 3 | Night hazards that use the frozen-layer rule: switch to day and they freeze. |
| Death restores prank state to the checkpoint (§9.3) | A prank can never softlock a run. |
| Level plan revised (§8.2); prototype now has 6 levels including *Inventory* (pranks) and *Night Watch* (freaks) | Act 2 introduces the freaks. |
| Audio direction: spooky-goofy night arrangement, spooked yelp, giggle on prank (§11) | Comedy is carried by sound as much as by art. |

## v0.2

| Change | Why |
|---|---|
| Title SHIFT → **Double Shift** | "Shift" is a single common word (near-unfindable in itch title search), collides with the 2008 *Shift* series, and will be shared by many jam entries. |
| Added the **day shift / night shift fiction** (§1.6, §4.7) | Gives every difference between layers a diegetic reason ("things changed between shifts"), improving readability and Theme Interpretation (Shift key + work shift + the building shifted). |
| Added **per-shift hazard grammar** (§9.1) | Players learn what is dangerous by time of day. |
| Added **shift par** as the replay hook (§15.3) | Fewest clock-ins becomes a second puzzle on every level at the cost of one counter. |
| Added **shift buffering and corner nudge** to S-08 (§3.3) | A flat rejection mid-air reads as an eaten input. |
| Locked **inactive layers are frozen** (§4.6) | Removes a class of bugs; nothing simulates off-shift. |
| Locked **engine**: plain JS + pure rules module (§13) | Deterministic, headless-testable, native browser delivery. |
| Restructured levels into **three acts** (§8.2) with **offset levels** and **shared state** as act-3 stretch | Escalating fiction: mundane changes → wrong changes → the building itself moved. |
| Sticky Keys promoted from a note to a **week-1 test** with a secondary bind (§3.2) | The mechanic rewards hammering Shift. |

---

# 1. Executive Summary

## 1.1 High Concept

**Double Shift is a 2D puzzle-platformer in which the player works the day shift and the night shift in the same building at once, pressing the Shift key to instantly switch between them, while something called the freaks messes with the building every time they clock in.**

Both shifts occupy the same coordinate space, but things changed between shifts: scaffolding went up, crates were moved, doors were locked, and as the nights go on, things that shouldn't change start changing. Each shift has different terrain, platforms, obstacles, and hazards.

The player's position and momentum persist between dimensions.

By shifting between worlds during movement, the player can access otherwise unreachable locations, bypass obstacles, solve environmental puzzles, and execute increasingly complex platforming sequences.

Shifting is instantaneous, unrestricted by cooldowns, and central to all gameplay.

The challenge comes from understanding and navigating the relationship between two overlapping worlds.

## 1.2 Elevator Pitch

*Press Shift to change shifts.*

One building. Two shifts. One worker.

Clock between day and night in the middle of a jump: the day crew's scaffolding catches you, the night's locked gate doesn't exist yet. But every time you clock into the night shift, the freaks have moved something. Finish the level clocking in as few times as possible.

*The freaks come out at night.*

## 1.3 Design Philosophy

SHIFT follows five principles:

1. **Simple controls, deep mechanics.** A small input vocabulary should support substantial gameplay complexity.
2. **Player skill over artificial restrictions.** Shifting has no cooldown, charge system, or resource cost.
3. **Platforming is the puzzle.** Challenges should emerge from geometry, timing, momentum, and switching dimensions.
4. **Predictable rules.** Identical actions under identical conditions should produce identical results.
5. **Depth before breadth.** The jam version prioritizes polished movement and clever level design over feature count.

## 1.4 Primary Design Goal

Create a game that is immediately understandable but rewards increasing mastery.

The player should be able to understand the central mechanic within seconds while continuing to discover sophisticated ways to use it throughout the game.

## 1.5 Target Experience

The intended experience combines:

- The satisfaction of solving spatial puzzles.
- The precision and responsiveness of traditional platformers.
- The discovery of routes across overlapping environments.
- The flow of executing rapid movement and shifting sequences.
- The satisfaction of improving execution through repetition.

The game should reward both deliberate problem-solving and fast, skillful execution.

## 1.6 Fiction

The player is a maintenance worker covering a double shift in an old building. In this building, day and night happen at the same time, and the worker can step between them.

Something lives in the building at night. Nobody calls them anything but **the freaks**. They are real monsters, but ridiculous ones: petty, giggling pranksters who steal planks, restack crates and jam gates for reasons of their own. They are never fully revealed. The player sees eyes in the dark, a lumpy silhouette ducking behind a crate, a sticky note that says MINE, and, mostly, the results.

What the freaks actually are is **deliberately undefined**, in the docs as well as in the game. All we know: they're nocturnal, and they live to annoy you (§4.8).

The fiction does three jobs:

1. **Explains differences.** Every difference between the day map and the night map is either the building's ordinary life (renovation, deliveries, closing time) or the freaks' doing.
2. **Carries the arc.** Act 1 has only evidence. Act 2 the freaks appear. Act 3 they bring new tricks (wax, management). Act 4 they bend the rules: the floor moves, one of them works days.
3. **Frames the score.** The shift counter is a timecard. Fewer clock-ins is better, and every clock-in gives the freaks another chance.

Narrative remains environmental: signage, notes, memos, the state of the rooms, timecard comments. No dialogue system.

## 1.7 Theme Interpretation

SHIFT is read three ways at once:

- **The Shift key** is the only new verb.
- **The work shift** is the fiction.
- **Things shifted** is the antagonist: the freaks move things around between shifts, up to whole floors in act 3.

The jam page's own theme text mentions "work the night shift" and jokes that Shift is the key that "accidentally enable[s] sticky keys". We already have both: the night shift is the fiction, and the Sticky Keys warning is a real design constraint (§3.2). *(built Nov 3, on the title)* Turn the warning into an in-joke: a memo on the title or pause screen from the freaks, written as if they set off Sticky Keys on purpose. Keep the practical advice next to it.

## 1.8 Jam Fit and Scoring

Game Off is rated by other participants in six categories (RELEASE.md §0). What earns each:

| Category | What earns it here | Gap today |
|---|---|---|
| Overall | A complete, polished run with a satisfying final timecard | Tier B is built (17 levels), and so are act 5 and the reworked finale (Nov 3; §8.2); the finale and its ending are built |
| Gameplay | Tight movement (§5), mid-air shifting, par as a second puzzle per level | Tuning pass (G1), playtests |
| Graphics | A deliberate code-drawn style: two palettes of one building, echoes, readable freaks (ART.md §1.1) | — |
| Audio | Theme in two arrangements crossfaded on shift (§11.3); yelp, giggle, stamp | — |
| Innovation | **Pranks**: each night clock-in can change the building, so clock-ins are a resource. **Freaks freeze by day**: the other shift is a pause button for the monsters. Timecard par. | — (evidence from level 1; first encounter level 3) |
| Theme | The Shift key, the work shift, and the building that shifts, all at once (§1.7) | Sticky Keys joke (planned) |

**Overlap warning.** The jam page's list of example ideas includes a puzzle-platformer where you shift between two overlapping realities and a monster might be standing on the bridge in the other one. That is our core premise, so many entries will look like ours at first glance. Everywhere a rater forms a first impression (the itch hook, cover, GIF, the first two minutes of play), lead with what only this game does: the freaks prank the building every time you clock in, and freeze when you leave the night.

**Raters play dozens of entries**, often for a minute or two each. The pranks and the freezing freaks have to show up before they quit. Two ways to make sure: show freak evidence from the very first night shift, and add a level select so anyone can reach act 2 (PRODUCTION.md A7, L8).

**Rating count.** Itch lowers the score of entries rated fewer times than the jam's median (in 2025 the median was 16). Being easy to play in the browser and rating other entries actively are part of the plan (RELEASE.md §6).

---

# 2. Project Scope

## 2.1 Jam Version

The initial release will contain two dimensions.

The Shift key toggles between them:

- Dimension A → Dimension B
- Dimension B → Dimension A

There is no dimension selection interface.

There is no cooldown.

There is no resource cost.

Each valid key press attempts exactly one dimension change.

The player retains their position and movement state.

## 2.2 Target Scope

| Component | Target |
|---|---|
| Playable dimensions | 2 |
| Core mechanics | Move, jump, shift |
| Main levels | 21 compact levels: five acts of four plus the finale (tiers: 12 built / 17 / 21) |
| Estimated completion | 35–50 minutes |
| Difficulty | Progressive |
| Checkpoints | Yes, where appropriate |
| Combat | Not planned |
| Bosses | Not planned |
| Narrative | Minimal / environmental |
| Leaderboards | Stretch goal |
| Speedrun timer | Stretch goal; built Nov 3 (SETTINGS > SPEEDRUN TIMER: the level time on the HUD, the run total on the end screen) |
| Gamepad support | Stretch goal; built Nov 3 (`src/pad.js`: a fixed standard mapping, menus included) |
| Delivery | itch.io |
| Repository | Public GitHub repository |

These are production targets, not requirements for a successful minimum viable game.

A polished five-level game is preferable to a poorly balanced twelve-level game.

## 2.3 Out of Scope

The jam release does not require:

- More than two dimensions.
- Combat systems.
- Character upgrades.
- Inventory.
- Complex dialogue.
- Procedural level generation.
- Multiplayer.
- Online infrastructure.
- An elaborate narrative campaign.
- Multiple playable characters.

These features may be reconsidered after the jam.

---

# 3. Core Gameplay

## 3.1 Player Abilities

The initial player has three fundamental abilities:

### Movement

The player can move horizontally through the environment.

Movement should feel immediate and precise while preserving enough inertia for expressive platforming.

### Jumping

The player can jump from supported surfaces.

Jumping must interact naturally with horizontal movement and shifting.

### Shifting

The player instantly changes the active dimension.

Shifting does not inherently:

- Move the player's coordinates.
- Reset velocity.
- Change gravity.
- Interrupt an existing jump.
- Apply a movement penalty.
- Consume resources.
- Trigger a cooldown.

The primary consequence of shifting is that the player's surrounding physical environment changes.

## 3.2 Basic Control Scheme

| Action | Default |
|---|---|
| Move left | A / Left Arrow |
| Move right | D / Right Arrow |
| Jump | Space / W / Up Arrow |
| Change shift | Shift (either) / K |
| Restart level | R |
| Pause | Escape |

Controls should be rebindable if feasible.

**Important:** Pressing Shift five times in a row can trigger Windows Sticky Keys, and a browser cannot suppress it. **Week-1 test:** play the prototype on Windows and see whether normal play triggers it (other key presses in between should reset the count; held arrow keys may not). If it triggers, K becomes the advertised primary bind and Shift the thematic alternative, and the title screen carries a one-line note on disabling the OS shortcut.

## 3.3 Shifting Rules

Shifting is the defining mechanic and must behave consistently.

### Rule S-01: Shared Coordinates

Both dimensions use the same world coordinate system.

When shifting, the player's position remains unchanged.

### Rule S-02: Persistent Momentum

Horizontal and vertical velocities persist through shifts.

A player traveling upward continues traveling upward after shifting.

A player falling continues falling unless the new dimension provides a surface that arrests the fall.

### Rule S-03: Instantaneous Transition

The gameplay state changes immediately when the shift input is accepted.

Visual effects may accompany the transition but must not delay collision changes or player control.

### Rule S-04: No Cooldown

The player may shift again immediately after completing a shift.

The game must not introduce a hidden delay between valid shifts.

### Rule S-05: Distinct Key Presses

Each physical key-down event generates one shift attempt.

Holding Shift does not repeatedly toggle dimensions.

Operating-system key-repeat events do not trigger additional shifts.

### Rule S-06: Dimension-Specific Geometry

Each dimension has its own collision geometry.

Platforms, walls, and hazards may exist in one dimension without existing in the other.

### Rule S-07: Shared Player State

The player's movement-related state is independent of the active dimension.

Changing dimensions does not create a separate player character or position.

### Rule S-08: Invalid Shifts

**Decision (v0.2):** A shift that would overlap solid geometry in the destination is resolved in this order:

1. **Corner nudge.** If moving the player by up to 4 px (configurable) in any single direction clears the overlap, nudge the player and shift. Nudges prefer up, then the direction of travel.
2. **Shift buffer.** Otherwise the request stays pending for 80 ms (configurable). On every physics tick inside the window, the shift is re-attempted; it fires on the first tick the destination clears.
3. **Rejection.** If the window expires, the shift is rejected.

A rejected shift:

- Leaves the player in the current dimension.
- Does not move or damage the player.
- Does not alter velocity.
- Provides immediate, readable feedback.
- Does not impose a cooldown.

The player can attempt another shift immediately. A new key press while a buffered shift is pending replaces it (it does not queue a double toggle).

This rule prevents the player from becoming embedded in terrain while preserving predictable behavior. Nudge distance and buffer window are tuning values, validated through prototyping.

---

# 4. Dimensional World System

## 4.1 World Structure

Each playable level consists of two overlapping maps.

Both maps share:

- World dimensions.
- Coordinate origin.
- Camera coordinate system.
- Player coordinate system.
- Level boundaries.

Each map may independently define:

- Solid terrain.
- Platforms.
- Hazards.
- Decorations.
- Interactive objects.
- Dimension-specific environmental elements.

## 4.2 Dimension A

The initial active dimension.

Working visual identity:

- Brighter environment.
- Stable or conventional architecture.
- Clear, familiar platforming geometry.
- More natural environmental presentation.

## 4.3 Dimension B

The alternate dimension.

Working visual identity:

- Contrasting colors.
- Altered or fragmented architecture.
- Different terrain configurations.
- Surreal or otherworldly environmental presentation.

These aesthetics are placeholders.

The core gameplay must function independently of the final art direction.

## 4.4 Shared Objects

Some objects may exist in both dimensions.

Examples include:

- Checkpoints.
- Exit locations.
- Certain structural elements.
- Level boundaries.
- Selected interactive objects.

Shared objects should retain their identity regardless of dimension.

A shared checkpoint should not become a separate checkpoint simply because the player shifts.

## 4.5 Dimension-Specific Objects

Other objects exist in only one dimension.

Examples:

- Platforms.
- Walls.
- Spikes.
- Moving obstacles.
- Optional collectibles.
- Dimension-specific environmental mechanisms.

These objects are physically relevant only when their dimension is active.

## 4.6 Object State

The initial implementation should distinguish between:

**Shared state:** Player progress, checkpoints, completed objectives, and global level state.

**Layer-local state:** Objects and environmental behavior belonging to an individual dimension.

**Decision (v0.2): inactive layers are frozen.** Nothing simulates in the shift the player is not in. A moving object in the night layer resumes where it was when the player returns. This is consistent with the fiction (the other shift waits for you) and removes off-screen simulation bugs.

For the initial prototype, static geometry is sufficient.

## 4.7 Day and Night

| | Day shift (layer 0) | Night shift (layer 1) |
|---|---|---|
| Palette | Warm, high-key, daylight through windows | Cool, low-key, lit by emergency strips and lit windows |
| Readability rule | Solid geometry has filled bodies with a light edge | Solid geometry has filled bodies with a bright cyan edge |
| Typical changes | Scaffolding up, doors open, deliveries stacked, forklifts working | Gates down, scaffolding struck, floors waxed, security active |
| Echo (inactive layer) | Night geometry shown as dashed cool outlines | Day geometry shown as dashed warm outlines |

**Night must stay readable.** No darkness radius, no flashlight. Night is a palette and lighting change, never reduced visibility.

Layer differentiation never relies on color alone: solid vs. echo is filled vs. dashed outline; geometry that exists only in the current shift is hatched ("won't be here on the other shift"); day vs. night also changes the background pattern (window panes vs. stars and lit windows) and the solid texture (brick courses vs. panel seams).

## 4.8 The Freaks

**Principles**

1. **Pranksters, not hunters.** The freaks never chase the player. They rearrange, steal, block, and bail.
2. **Never fully shown.** Silhouettes, eyes, sounds, notes. No close-up, no reveal, no name beyond "the freaks."
3. **Deterministic.** Fixed patterns only, no AI. Same inputs, same freaks: predictable, testable, par-proof.
4. **Night creatures.** Visible freaks exist only on the night shift and obey S-06/§4.6: when the player is on day shift, every freak freezes mid-stride. By day they are drawn as dashed outlines where they will be on return.
5. **Fair.** Every prank and every freak is telegraphed before it can hurt (§6.3 rule 2).

**Personality (decided 2026-11-02)**

**What the freaks are stays undefined.** The only facts: they're nocturnal, and they're little menaces who exist to annoy you. Don't give them a species, an origin or an explanation in any doc or in the game.

**How they act.** Fish's references, both about behavior, not what they are:

- *They act like raccoons who know dark magic.*
- **Sableye (Pokémon) is the model prankster:** a gleeful little menace that lurks in the dark, giggles, grabs shiny things, and plays tricks with dark powers purely for fun. That's the energy: mischievous, delighted with itself, a bit unsettling, never evil.

**Use it for attitude only, never for looks or names.** Sableye is someone else's character. Don't borrow anything that identifies it: no gem eyes, no gem on the chest, no purple goblin body, no toothy grin. Don't mention it in the game, on the itch page or in marketing either. The freaks keep their own look (ART.md §5): lumpy black silhouettes with plain glowing eyes. This matches the "original jokes only" rule (§10.5).

What that means in play:

- **Nosy, grabby, territorial.** They take what isn't theirs (planks, doors, snacks), hoard it, rearrange it, and claim it with sticky notes. They scatter the moment they're noticed.
- **Impossible pranks for petty reasons.** They pull off things that shouldn't be possible (a plank somehow over the other pit, a pillar moved without the building falling down), and it's always just to mess with you. Nobody sees how. Pranks happen at the instant of a shift (§4.9).
- **Smug about it.** Grand gestures, tiny stakes. The comedy is the gap between how impressive the prank is and how pointless it is.
- **Never cute enough to cuddle, never scary.** Rubber-suit-monster energy: lumpy, jittering, glowing eyes, but petty.

Specs: ART.md §5 (look), AUDIO.md §4 (sound), WRITING.md §1 (voice).

Specs: ART.md §5 (look), AUDIO.md §2 and §4 (sound), WRITING.md §1 (voice).

## 4.9 Pranks (signature mechanic)

The freaks act **when the player shifts, not over time**: in the moment of transition, the one moment the player can't see.

- Each level may define pranks. A prank fires on the **Nth successful entry into the night shift** and overrides tiles in either layer (remove a plank, add a crate, move a gate).
- The destination of a shift is validated against the geometry *as it will be after the prank*. If the prank would bury the player, the shift is buffered/rejected per S-08 and the prank waits.
- Pranks are permanent for the run, except that **death restores the prank state of the active checkpoint** (§9.3).
- **Tells:** before a prank fires, its target is marked: eyes watching from the dark at night, a sticky note (MINE) by day. When it fires, the player hears a giggle.
- Consequence: shift count is a resource. Players plan *when* to clock in and how many times, because each entry changes the night.

Example (*Inventory*): the night plank spans the first pit on the first visit. On the second clock-in, the freaks move it to the second pit. The level is solved by stepping out to day between the pits and back in.

## 4.10 Visible Freaks

| Freak | Behavior | Puzzle role | Introduced |
|---|---|---|---|
| Lurker | Patrols a fixed span at fixed speed | Pass it by freezing it (go to day, walk past its outline, come back) | Act 2 |
| Peeker | Pops out of a hole on a timer, ducks back in | Timing | Act 2 |
| Squatter | Sits in a doorway, never moves | Route through the other shift | Act 2 |
| Supervisor | Holds a clipboard, turns left/right on a fixed cycle. Freaks on the side it faces work; the others slack off (frozen, harmless). Never moves, never spooks. | Timing by reading its facing | Act 3 (`supervisor`) |
| Day-walker | Patrols like a lurker, but on the **day** shift; frozen by night | Each shift now freezes the other's freaks | Act 4 (`daywalker`) |
| Scatterer *(post-jam)* | Flees when approached, knocking things over (real-time geometry change) | — | — |

Touching an active freak on its own shift (night for most, day for the day-walker): the worker is **spooked** (yelp, leaps out of their boots, respawn at checkpoint). Overlapping a freak's frozen outline on the other shift is safe; shifting into an active freak is a spook.


---

# 5. Platforming System

## 5.1 Movement Model

The player uses a conventional 2D platforming controller.

Core parameters include:

- Horizontal acceleration.
- Maximum horizontal speed.
- Ground deceleration.
- Air control.
- Jump impulse.
- Gravity.
- Maximum fall speed.

These parameters should be configurable rather than embedded as constants throughout the codebase.

## 5.2 Movement Quality

Movement should be:

- Responsive.
- Predictable.
- Consistent across dimensions.
- Fast enough to support flowing traversal.
- Precise enough for deliberate positioning.

A character with overly sluggish movement would undermine the shifting mechanic.

## 5.3 Jump Assistance

The following features are recommended for testing:

### Coyote Time

Allow jumping for a brief period after leaving a platform.

Suggested initial tuning range: 60–100 milliseconds.

### Jump Buffering

Accept jump input shortly before landing, executing the jump when a valid landing occurs.

Suggested initial tuning range: 80–120 milliseconds.

### Variable Jump Height

Holding Jump produces a higher jump than tapping it.

This is recommended but should be implemented only if it improves movement precision.

### Air Control

Allow horizontal adjustment while airborne.

Air control must remain consistent during and after shifting.

All values are provisional and should be tuned through playtesting.

## 5.4 Momentum Preservation

Shifting should preserve continuous movement.

Example:

1. Player runs toward a gap in Dimension A.
2. Player jumps.
3. Player shifts into Dimension B.
4. Player passes through a route unavailable in A.
5. Player shifts back into A.
6. Player lands on an A-exclusive platform.

No stage should require the player to stop moving merely to perform a shift.

## 5.5 Grounding After a Shift

Ground contact must be recalculated immediately when the active dimension changes.

If the supporting platform disappears after shifting, the player begins falling normally.

If the destination dimension contains a valid supporting surface, the player may land on it using ordinary collision resolution.

If the destination contains overlapping solid geometry, the invalid-shift rule applies.

Shifting alone never generates a jump or upward impulse.

---

# 6. Puzzle Design

## 6.1 Core Puzzle Principle

Every puzzle should exploit a meaningful relationship between the two dimensions.

The goal is not simply to hide a route in one world.

The best puzzles require players to reason about how both worlds interact.

## 6.2 Puzzle Categories

### Category A: Missing Geometry

An obstacle exists in one dimension but not the other.

Example:

A bridge is destroyed in Dimension A but intact in Dimension B.

The player shifts to cross.

**Purpose:** Introduce dimensional differences.

### Category B: Complementary Geometry

Each dimension contains platforms required to complete a route.

Example:

A platform in Dimension A provides the launch point, while the landing platform exists only in Dimension B.

**Purpose:** Teach midair shifting.

### Category C: Obstacle Bypassing

A solid wall blocks the player in one dimension.

The corresponding area is empty in the other.

The player must shift, travel past the obstruction, and potentially shift back.

**Purpose:** Establish shifting as spatial navigation rather than simple platform swapping.

### Category D: Sequential Traversal

The player must alternate dimensions several times to navigate a series of platforms.

Example:

A → B → A → B.

**Purpose:** Develop shifting fluency and coordination.

### Category E: Momentum-Based Traversal

A route requires retaining movement speed across dimensional transitions.

Example:

The player accelerates in one dimension, shifts to bypass an obstacle, and returns to land on a distant platform.

**Purpose:** Reward integrated movement mastery.

### Category F: Timed Traversal

The player must shift during a restricted movement window.

Example:

A narrow passage is accessible only during a particular section of a jump.

**Purpose:** Test precision without introducing artificial input cooldowns.

### Category G: Recovery and Improvisation

An alternate dimension contains a possible landing route when the player misses the intended platform.

**Purpose:** Reward awareness and quick decision-making.

### Category H: Multi-Step Spatial Reasoning

A level presents several possible routes, but successful traversal requires understanding the geometry of both maps.

**Purpose:** Combine planning with execution.

## 6.3 Puzzle Design Rules

Every mainline puzzle should satisfy the following:

1. The intended solution follows established mechanics.
2. Necessary information can be discovered through observation or safe experimentation.
3. Failure has a comprehensible cause.
4. The player does not need to exploit unpredictable physics.
5. Shifting meaningfully contributes to the solution.
6. Execution difficulty is appropriate to the level's position in the progression.

Optional shortcuts and advanced routes may exceed the intended difficulty.

---

# 7. Information and Readability

## 7.1 Core Problem

The player must reason about two maps while occupying only one.

If inactive geometry is completely invisible, players may be forced into blind experimentation.

The game should provide sufficient information for meaningful decisions without eliminating discovery.

## 7.2 Proposed Solution: Dimensional Echoes

Inactive geometry may appear as faint, non-solid outlines.

These outlines indicate where platforms or obstacles exist in the alternate dimension.

Potential presentation:

- Low-opacity silhouettes.
- Distinct outline colors.
- Subtle animated edges.
- Reduced-detail ghost geometry.

The exact solution requires playtesting.

## 7.3 Readability Priorities

The player must clearly distinguish:

- Currently solid geometry.
- Inactive geometry.
- Hazards.
- Safe traversal space.
- Player position.
- Current dimension.

Color should never be the only distinguishing feature.

Use differences in shapes, outlines, patterns, contrast, or animation as well.

## 7.4 Visual Feedback on Shift

A successful shift should produce immediate audiovisual feedback.

Possible effects:

- Brief environment transition flash.
- Palette change.
- Layer-specific particle effects.
- Short camera or screen distortion.
- Distinct shift sound.

Effects must not obscure the player during rapid shifting.

At high shift frequencies, effects should remain readable and avoid accumulating into excessive visual noise.

## 7.5 Invalid Shift Feedback

If a shift is rejected, show a brief localized indication.

Examples:

- Player outline pulse.
- Small collision spark.
- Distinct muted sound.
- Brief highlight of obstructing geometry.

Avoid camera shake or intrusive error messages.

---

# 8. Level Design

## 8.1 Structure

The jam version should use a series of handcrafted levels.

Each level introduces or combines specific applications of the central mechanic.

A linear progression is sufficient.

## 8.2 Proposed Level Sequence

**Decision (v0.6): 21 levels, five acts of four plus the finale** (Fish, 2026-11-02). The game starts almost normal and grows into the full Upside Down levels; each act introduces one idea, practises it, and ends on a level that combines it with what came before; the finale pays everything off. Manifest: [CONTENT.md](CONTENT.md) §2. Specs: [LEVELS.md](LEVELS.md) §4–5.3. ✅ = built. Tiers: **A** = built today (a complete game), **B** = existing systems, **C** = act 5 (Upside Down) and the finale rework.

**Act 1: Renovation** (it's just a job; only evidence of the freaks)

| Level | Focus | Intended Lesson | Fiction | Tier |
|---|---|---|---|---|
| 1. Clock In ✅ | Basic toggle | Shift changes world geometry | Gap in the floor by day; night planks, night gate | A |
| 2. Scaffolding ✅ | Missing platforms | Use the other shift to cross | Day crew's scaffolding and deliveries | A |
| 3. Closing Time ✅ | Obstacle bypass | Geometry differs spatially; first frozen outline | Gates, rebar by day, lasers by night | A |
| 4. Mid-Air ✅ | Midair shifting | Shift during a jump | Eyes blink in the dark. Nobody mentions it. | A |

**Act 2: Overtime** (the freaks show up)

| Level | Focus | Intended Lesson | Fiction | Tier |
|---|---|---|---|---|
| 5. Inventory ✅ | First prank | Each clock-in changes the night | The plank keeps moving | A |
| 6. Night Watch ✅ | Lurker, peeker, squatter | Freaks freeze when you go to day | Something is in the tunnel | A |
| 7. Under Renovation ✅ | Height from one shift | Climb a night staircase, shift mid-air onto a day ledge | A staircase to nowhere; they're very proud | B |
| 8. Lost & Found ✅ | Wanted pranks (act 2 combination) | Spend clock-ins on purpose | They stole every door | B |

**Act 3: Graveyard Shift** (they get organized; first new rule)

| Level | Focus | Intended Lesson | Fiction | Tier |
|---|---|---|---|---|
| 9. Wet Floor ✅ | Wet floor `~` | Slide at night, grip by day | Floors waxed at night (by whom?) | C |
| 10. Structural Integrity ✅ | Moving object | Count your night entries: the pillar is a wall, then a step | The load-bearing pillar moved | B |
| 11. Night Management ✅ | Supervisor freak | Cross on the side it isn't watching | One of them has a clipboard | C |
| 12. Stacked ✅ | Multiple pranks (act 3 combination) | Order your clock-ins | They've been busy | A |

**Act 4: Lights Out** (the rules bend)

| Level | Focus | Intended Lesson | Fiction | Tier |
|---|---|---|---|---|
| 13. Employee of the Month ✅ | Obstacle as tool | The portrait blocks the exit, then becomes the step | Their portrait. It's just eyes. | B |
| 14. Broad Daylight ✅ | Day-walker freak | Each shift freezes the other shift's freaks; you must freeze it | One of them works days now | C |
| 15. Floor 3.5 ✅ | Offset layer | Shift at the apex to climb between floors | Night is half a storey up | C |
| 16. Night Audit ✅ | Acts 1–4 exam | Everything so far, one screen, no new rules | Management's walkthrough; so is theirs | B |

**Act 5: Upside Down** (the building turns over)

| Level | Focus | Intended Lesson | Fiction | Tier |
|---|---|---|---|---|
| 17. Mind Your Head ✅ | Night flipped, gravity up | At night you fall up; the ceiling is the floor | They flipped the night shift | C |
| 18. Falling Up ✅ | Mid-fall flips | Shift mid-fall to reverse it; climb a shaft by flipping | The floor is up there now | C |
| 19. Ceiling Walker ✅ | Flip + freak + prank | Freeze a ceiling lurker; read a prank on the flipped map | Something walks on the ceiling | C |
| 20. Head Over Heels ✅ | Act 5 combination | Every shift freezes one freak and flips gravity | Up is a matter of opinion now | C |

**Finale**

| Level | Focus | Intended Lesson | Fiction | Tier |
|---|---|---|---|---|
| 21. Clock Out ✅ (reworked Nov 3) | Everything | One room per act, then the time clock; the ending | Get out. Final timecard. They wave from the dark. | A built / C rework |

**Ladder.** Freak evidence in act 1; pranks single (5), wanted (8), moving an object (10), queued (12); visible freaks (6), the supervisor (11), the day-walker (14), a freak on the ceiling (19); one new rule per act from act 3: wax (9), offset (15), upside down (17). Floor 3.5 previews act 5: the building stops being where it was before it turns over.

**Tiers and cut dates.** A = the 12 built; B = 17 (M2, Nov 15); C = 21, which needs the gravity flip working and `upside` proven by **Nov 18**. Content freeze **Nov 22**. If a tier slips, its levels go post-jam and the rest keep their order; today's Clock Out is always the fallback finale. Levels are referred to by id, so cuts never renumber anything.

**Shared state and Freight** (crates restacking on a cycle) are post-jam (LEVELS.md §5.1).

## 8.3 Tutorial Philosophy

Tutorials should be primarily environmental.

The introductory level should establish the main mechanic without extensive text.

Suggested sequence:

1. Player enters a simple platforming environment.
2. A clear obstacle blocks progression.
3. A visible alternate platform arrangement suggests a solution.
4. A prompt displays: **Press SHIFT to change shifts.**
5. Player shifts and crosses.
6. The prompt disappears.

Subsequent lessons should emerge from increasingly sophisticated level geometry.

## 8.4 Level Design Workflow

Each level should be designed as a paired system.

**Recommended process:**

1. Define the intended player challenge.
2. Sketch the required route.
3. Determine the necessary shift points.
4. Build Dimension A.
5. Build complementary Dimension B.
6. Test the route using actual movement physics.
7. Check for unintended shortcuts.
8. Preserve interesting alternate solutions where appropriate.
9. Playtest without developer explanation.
10. Refine readability and difficulty.

## 8.5 Difficulty Progression

Difficulty should increase through combinations of previously learned concepts.

Avoid escalating difficulty exclusively by shrinking platforms or increasing hazard density.

Progression can arise from:

- More frequent shifts.
- More complex geometry.
- More demanding movement sequences.
- Reduced execution margins.
- Increased route-planning complexity.
- Combining multiple earlier challenges.

## 8.6 Shortcuts and Advanced Routes

Unexpected routes should not automatically be treated as bugs.

A route that obeys game physics and rewards skill may be a desirable speedrunning shortcut.

Fix unintended solutions primarily when they:

- Trivialize important teaching sections.
- Cause softlocks.
- Break progression.
- Exploit inconsistent collision behavior.
- Undermine the intended experience without providing meaningful skill expression.

---

# 9. Hazards, Failure, and Checkpoints

## 9.1 Hazards

The initial version may contain simple hazards:

- Spikes (rebar, broken glass).
- Bottomless gaps (open shafts).
- Static environmental obstacles.

Hazards are shift-specific and follow a **hazard grammar** so players learn danger by time of day:

| Day hazards | Night hazards |
|---|---|
| Rebar and construction debris | Security lasers |
| Forklifts *(moving, post-prototype)* | Wet floor (low friction, not lethal) |
| Open shafts during renovation | **The freaks** (§4.10) |

A hazard belongs to exactly one shift. Being inside an active hazard after a shift is a death, like touching it.

Moving hazards and enemies are not required for the first playable build.

## 9.2 Failure Conditions

The player fails when:

- They contact a lethal hazard in the active dimension.
- They touch an active freak on the night shift ("spooked").
- They fall outside valid level boundaries.
- A defined environmental failure condition is met.

An invalid shift into solid geometry should not automatically cause death.

## 9.3 Respawning

Upon death:

- Restore player position to the active checkpoint.
- Restore the intended checkpoint dimension.
- Reset movement velocity.
- Restore level objects to the checkpoint's defined state, **including prank state** (pranks fired after the checkpoint are undone).
- Resume control quickly.

Respawning should minimize interruption.

## 9.4 Checkpoints

Checkpoints should be placed before challenges that demand substantial repetition.

The goal is to test mastery of the current challenge, not force repeated completion of unrelated earlier sections.

## 9.5 Failure Philosophy

Failure should be fast, readable, and recoverable.

The player should be encouraged to experiment.

Long death animations or lengthy restart sequences are inconsistent with the intended gameplay loop.

---

# 10. Visual Direction

## 10.1 Initial Art Strategy

**Decision (v0.4): the jam build stays code-drawn, as a deliberate style rather than placeholder.** No outside artist and no image or audio models. Graphics is a rated category, so the style rules are in ART.md §1.1.

The original prototype guidance, still true for anything new: use simple shapes until the movement and shifting systems are validated.

Recommended prototype visuals:

- Flat-color terrain.
- Simple geometric player.
- Two contrasting layer palettes.
- Minimal particles.
- Clearly differentiated hazards.

Final art direction is not a prerequisite for the first playable prototype.

## 10.2 Aesthetic Goal

The dimensions should feel related but meaningfully different.

The player should understand that both represent overlapping versions of the same physical space.

Potential artistic directions include:

- Material versus spectral.
- Living versus ruined.
- Light versus shadow.
- Order versus chaos.
- Natural versus artificial.

**Selected: day versus night in the same building**, with the freaks' evidence growing across the acts. See §4.7.

Art is drawn in code (shapes, gradients, patterns) with no image assets. For the jam this is the final style, not a stand-in (§10.1). Any post-jam art from a design partner is credited as they choose.

## 10.3 Animation

Minimum animation requirements:

- Idle.
- Run.
- Jump.
- Fall.
- Shift effect.
- Death.
- Respawn.

The Shift effect should be especially polished because it is the action players will perform most often after basic movement.

## 10.4 Camera

The camera should prioritize precise platforming.

Requirements:

- Smooth horizontal tracking.
- Adequate forward visibility.
- No camera reset when shifting.
- Minimal unnecessary camera movement.
- Stable framing during rapid shifts.

Camera shake should be optional or limited to subtle presentation effects.

---

## 10.5 Tone: Mock Horror

Not a horror game. Rubber-suit-monster energy: real monsters, ridiculous ones, messing with you.

- **No gore, no jump scares.** Getting caught is a gag: yelp, the worker leaps out of their boots, instant respawn. Failure stays fast (§9.5).
- **The freaks are petty, not evil.** They steal, restack, jam and giggle.
- **The worker plays it straight.** Deadpan memos, notice-board grievances and timecard comments carry the comedy ("Incident report: was spooked. Again.").
- **Mystery is the punchline.** The freaks are never explained or fully shown. Their nature is undefined, even in these docs (§4.8).
- **Original jokes only.** The tone is inspired by classic cartoon monster capers and absurdist TV, but no characters, catchphrases or famous bits are borrowed.

The freaks are drawn in code: a dark lumpy, jittering silhouette with fur spikes and a pair of blinking yellow eyes. The art pass gives them more attitude, not more explanation (ART.md §5).

---

# 11. Audio Direction

## 11.1 Audio Priorities

Audio should reinforce the player's immediate understanding of their actions.

Core effects:

- Jump.
- Landing.
- Shift.
- Failed shift.
- Death.
- Checkpoint.
- Level completion.

## 11.2 Shift Sound

The Shift sound is particularly important.

It should be:

- Distinct.
- Short.
- Satisfying.
- Recognizable.
- Comfortable during rapid repetition.

Avoid long sounds that overlap excessively when the player shifts repeatedly.

## 11.3 Music

Music should support concentration without overwhelming gameplay feedback.

Possible approaches include:

- Ambient electronic music.
- Minimal atmospheric compositions.
- **Preferred:** one theme in two arrangements, crossfaded instantly on shift (same tempo and position, so shifting never restarts the music). Day: jaunty. Night: the same melody spooky-goofy: theremin lead (sine with vibrato), walking bass, cheesy organ stabs.

All audio is synthesized with WebAudio; no audio files. Comedy sounds: a yelp when spooked, a giggle when a prank fires, a rubber stamp on the timecard.

Licensed music (including the song the subtitle nods to) is not used in the game.

Adaptive music is optional.

No music system should delay development of the core gameplay.

---

# 12. User Interface

## 12.1 Minimal HUD

The initial HUD should communicate:

- Current dimension.
- Level identity, when relevant.
- Optional elapsed time.
- Pause state.

Avoid unnecessary interface elements.

## 12.2 Dimension Indicator

A small icon or label can identify the active dimension.

The environment itself should also make the active dimension obvious.

## 12.3 Main Menu

Minimum options:

- Play.
- Continue, if progress saving exists.
- Settings.
- Credits.

## 12.4 Pause Menu

Minimum options:

- Resume.
- Restart.
- Settings.
- Main Menu.

## 12.5 Settings

Priority settings:

- Master volume.
- Music volume.
- Effects volume.
- Reduced screen effects.
- Control rebinding *(built Nov 3: SETTINGS > CONTROLS; the four actions, never the menu keys)*.

## 12.6 Accessibility

Recommended accessibility considerations:

- Keyboard remapping.
- Distinct dimension silhouettes.
- Non-color-based layer differentiation.
- Reduced flashes and screen effects.
- Optional screen shake reduction.
- Readable text and UI.
- Adjustable audio levels.

Rapid Shift usage must remain accessible to players who cannot comfortably use the default key.

---

# 13. Technical Design

> **Historical (pre-v0.2).** §13.1–13.8 are the original engine-agnostic plan. The built architecture is §13.9 and [TECH.md](TECH.md).

## 13.1 Architecture Goal

The engine should treat dimensions as separate world layers sharing a common player and coordinate system.

The implementation should support additional layers later without requiring a complete architectural rewrite.

However, the jam game should expose only two.

## 13.2 Proposed Core Systems

### PlayerController

Responsibilities:

- Input processing.
- Horizontal movement.
- Jumping.
- Gravity.
- Velocity management.
- Collision response.
- Grounding.

### DimensionManager

Responsibilities:

- Track active dimension.
- Handle shift requests.
- Validate target geometry.
- Activate destination collision state.
- Notify systems of a successful shift.
- Coordinate visual and audio effects.

### WorldLayer

Responsibilities:

- Store dimension-specific terrain.
- Store dimension-specific entities.
- Provide collision queries.
- Provide rendering data.
- Define layer-local state.

### LevelManager

Responsibilities:

- Load levels.
- Initialize both dimensions.
- Manage checkpoints.
- Handle respawning.
- Track completion.
- Transition between levels.

### CameraController

Responsibilities:

- Track the shared player.
- Handle level bounds.
- Maintain stable framing.

### AudioManager

Responsibilities:

- Play gameplay effects.
- Handle music.
- Manage audio settings.

### UIManager

Responsibilities:

- Menus.
- HUD.
- Prompts.
- Settings.
- Completion screens.

## 13.3 Suggested Data Model

```ts
type LayerId = 0 | 1;

interface Vector2 {
  x: number;
  y: number;
}

interface PlayerState {
  position: Vector2;
  velocity: Vector2;
  grounded: boolean;
  alive: boolean;
}

interface WorldLayer {
  id: LayerId;
  collisionMap: CollisionMap;
  hazards: HazardDefinition[];
  entities: EntityDefinition[];
  visuals: LayerVisualDefinition;
}

interface LevelDefinition {
  id: string;
  layers: [WorldLayer, WorldLayer];
  spawnPosition: Vector2;
  spawnLayer: LayerId;
  checkpoints: CheckpointDefinition[];
  exits: ExitDefinition[];
}

interface GameState {
  activeLayer: LayerId;
  player: PlayerState;
  currentLevelId: string;
  checkpointId: string | null;
}
```

This is a conceptual, engine-independent schema.

It is not a requirement to implement the game in TypeScript.

## 13.4 Shift Transaction

A shift should be processed as a single atomic gameplay operation.

Conceptual flow:

```text
Shift input received
        |
        v
Determine target layer
        |
        v
Query destination collision
        |
        v
Is destination valid?
    /           \
   No           Yes
   |             |
Reject       Change layer
   |             |
Feedback     Recompute contacts
                 |
             Update rendering
                 |
             Play effects
```

## 13.5 Shift Pseudocode

```ts
function attemptShift(): boolean {
  const targetLayer =
    activeLayer === 0 ? 1 : 0;

  if (
    collidesWithSolid(
      player.collider,
      targetLayer
    )
  ) {
    playInvalidShiftFeedback();
    return false;
  }

  activeLayer = targetLayer;

  physics.refreshPlayerContacts(
    player,
    activeLayer
  );

  visuals.setActiveLayer(activeLayer);
  audio.playShift();

  return true;
}
```

Exact physics integration depends on the selected engine.

## 13.6 Input Handling

Input events should be captured independently of frame-rate-dependent movement updates.

Requirements:

- One shift per non-repeated key-down.
- No toggling on key hold.
- Fast consecutive presses are registered.
- Input is not discarded because it arrives between physics ticks.
- No artificial cooldown.
- State changes are resolved consistently within the physics update cycle.

If a browser implementation is used, prevent default browser actions where appropriate, without assuming this can suppress operating-system shortcuts such as Sticky Keys.

## 13.7 Collision Validation

Collision behavior should be deterministic.

Special cases to test:

1. Shift while grounded.
2. Shift while rising.
3. Shift while falling.
4. Shift while touching a wall.
5. Shift while standing at a platform edge.
6. Shift into an occupied destination.
7. Shift rapidly near tile boundaries.
8. Shift while entering or leaving a hazard.
9. Shift immediately before landing.
10. Shift on the same update as a jump input.

Upside Down levels add (decided 2026-11-03; every rule is the day rule mirrored; each case is an `upside down:` test in `test/rules.test.mjs` since Nov 3):

11. Shift into the flipped night: you fall up and land hanging under the solid above.
12. Jump on a flipped layer: the jump goes down the screen, and releasing early cuts it.
13. Mid-air flip: velocity is kept on screen, so a rise becomes a fall the other way; coyote time is cleared, so there's no mid-air jump right after a flip.
14. Grounded flip into the mirrored floor: refused like any blocked shift (nudge against the new gravity first, then buffer, then fail).
15. Fall out the top on a flipped layer: a fall death, exactly like falling out the bottom by day.

The game should resolve each case consistently.

## 13.8 Collision Strategy

**Decision (v0.2):** custom axis-separated AABB-vs-tile collision in a pure rules module, fixed timestep (120 Hz), integer-tile maps.

Why custom here: a tile platformer with box collision is small (~150 lines), and owning it makes every case in §13.7 a deterministic headless test. An engine's physics would make those cases harder to test, not easier.

Rules:

- Consistent collision shapes (one player AABB).
- Fixed-timestep physics; rendering interpolates.
- X then Y resolution per tick; tunnelling bounded by max speed < tile size per tick.
- Explicit active-layer collision filtering.
- No general-purpose physics: no slopes, no rotation.

## 13.9 Architecture (v0.2)

- `src/rules.js`: pure game rules. No DOM, no time source; `step(level, state, input)` returns the next state. Pranks are tile overrides in the state; freaks are a pure function of a night-only clock (`freakBoxes`).
- `src/levels.js`: level data as two-layer ASCII maps.
- `src/input.js`: key events → per-tick input frames (one shift per key-down, repeats ignored, presses between ticks queued). No DOM.
- `src/main.js`: fixed-step loop and rendering. Draws only what the rules decided.
- `src/audio.js`: WebAudio synthesis.
- `test/`: `node --test` suites against the real rules module.

This is the same architecture as the developer's previous browser games (Recall, Wick, Thaw).

## 13.10 Level Data

Levels should be data-driven. **Format (v0.2):** each level is two equal-size ASCII grids (day, night) plus metadata (name, par). Legend: `#` solid, `^` hazard, `S` spawn, `E` exit, `C` checkpoint, `.` empty. Spawn, exit and checkpoints are shared and may be written in either grid. Plain text is fast to author, diffable, and readable in review.

Optional per-level lists: `pranks` (`onNight`, `tell`, `set` rectangles of tile overrides), `freaks` (`kind`, tile, `range`/`speed` for lurkers, `period`/`duty` for peekers), `decor` (cosmetic, e.g. eyes in the dark).

Each level should define:

- Global map dimensions.
- Dimension A terrain.
- Dimension B terrain.
- Hazards.
- Player spawn.
- Checkpoints.
- Exit positions.
- Optional metadata.

A visual tilemap editor (e.g. Tiled, exporting two layers) remains an option if ASCII authoring becomes the bottleneck.

## 13.11 Internal Debugging Tools

Useful debug options:

- Show collision boundaries.
- Show both layer collision maps.
- Display player coordinates.
- Display velocity.
- Show active dimension.
- Highlight invalid-shift intersections.
- Restart current level.
- Jump to a specific level.

These tools need not appear in the final release.

---

# 14. Performance and Quality

## 14.1 Performance Target

Target smooth gameplay at 60 FPS on ordinary desktop hardware.

Movement and physics should not depend directly on rendering frame rate.

## 14.2 Responsiveness

Movement, jumping, and shifting should feel immediate.

Particular attention should be paid to:

- Input latency.
- Collision consistency.
- Frame pacing.
- Transition effects.
- Audio feedback.

## 14.3 Stability

The game should not:

- Place the player inside solid geometry after a valid shift.
- Lose player velocity unexpectedly.
- Toggle dimensions continuously while Shift is held.
- Fail to register fast input events.
- Leave stale collision state after shifting.
- Corrupt checkpoint state.
- Produce unavoidable softlocks through normal play.

---

# 15. Progression and Replayability

## 15.1 Primary Progression

Players complete handcrafted levels in sequence.

Each level introduces a new application or combination of existing mechanics.

## 15.2 Optional Completion Time

A level timer may encourage replay.

Timing should not interfere with the default puzzle-solving experience.

## 15.3 Shift Par (the timecard)

**Decision (v0.2): in scope for the jam.** Track successful shifts per level. Each level has a **par**: the fewest shifts the designer found. The level-complete screen is a timecard showing clock-ins vs. par.

- Rejected or buffered-then-expired shifts do not count.
- Every entry into night may trigger a prank (§4.9), so par is a puzzle about *when* to clock in, not only how often.
- A death does not reset the count since the last checkpoint; restarting the level (R) does.
- Par is verified by a scripted solution per level, run in tests, so par can never be lower than what is achievable.

Fewest-shifts and fastest completion reward different strategies. The timer stays optional; par is the primary replay hook.

## 15.4 Optional Advanced Challenges

Potential post-MVP features:

- Time trials.
- Minimum-shift challenges.
- Ghost replays.
- Global leaderboards.
- Challenge levels.
- Community-created levels.

These remain outside the required jam scope.

---

# 16. Development Plan

> **Historical (pre-v0.2).** The live schedule, milestones and backlog are in [PRODUCTION.md](PRODUCTION.md); the release steps are in [RELEASE.md](RELEASE.md).

## 16.1 Phase 1: Core Prototype

**Target: First development week**

Deliverables:

- Player movement.
- Jumping.
- Two maps sharing coordinates.
- Instant Shift toggling.
- Momentum preservation.
- Destination collision validation.
- Basic camera.
- One test level.

**Exit criterion:** The player can complete a meaningful obstacle course requiring midair shifting.

Do not advance merely because the system works technically. The mechanic must also feel enjoyable.

## 16.2 Phase 2: Gameplay Validation

**Target: Second development week**

Deliverables:

- Initial movement tuning.
- Initial visual layer differentiation.
- Inactive-layer readability prototype.
- Checkpoint and respawn system.
- Three to five experimental levels.
- Initial playtesting.

Questions to answer:

- Is shifting satisfying?
- Can players understand the inactive geometry?
- Are invalid shifts frustrating?
- Does rapid shifting feel responsive?
- Are players solving challenges or guessing?
- Does the mechanic remain interesting after repeated use?

**Exit criterion:** Unassisted players understand the mechanic and can complete several distinct challenges.

## 16.3 Phase 3: Content Production

**Target: Third development week**

Deliverables:

- Finalized level progression.
- Main level set.
- Consistent art direction.
- Core sound effects.
- Menu flow.
- Level completion flow.
- Difficulty tuning.

**Exit criterion:** The complete game can be played from beginning to end.

## 16.4 Phase 4: Polish and Release

**Target: Final development week**

Deliverables:

- Bug fixes.
- Input validation.
- Collision edge-case testing.
- Accessibility improvements.
- Performance testing.
- Audio balancing.
- Visual effects refinement.
- itch.io page.
- Screenshots and gameplay video.
- Credits and asset attribution.
- Public source repository.
- Release build and submission.

**Exit criterion:** A player can launch, understand, complete, and replay the game without developer assistance.

## 16.5 Submission Constraint

The jam ends on **December 1, 2026, at 13:37 PST**, equivalent to **18:37 in Brasília**.

The release process must include:

- A publicly accessible GitHub repository.
- A playable game submission on itch.io.
- A correct link between the submission and source repository.
- Any applicable credits or licenses.

The submission should be tested before the deadline rather than relying on last-minute deployment.

---

# 17. Minimum Viable Game

The minimum viable game must contain:

- One playable character.
- Functional movement and jumping.
- Two overlapping dimensions.
- Instant, unlimited shift attempts.
- Persistent player coordinates and velocity.
- Reliable dimension-specific collision.
- Clear active-dimension feedback.
- At least three meaningful handcrafted challenges.
- Failure and restart handling.
- A start-to-finish playable experience.

A game satisfying these requirements is a valid jam submission even without optional systems.

## 17.1 Definition of Done

The minimum release is complete when:

- [ ] Both dimensions load correctly.
- [ ] Pressing Shift toggles dimensions.
- [ ] Holding Shift does not repeatedly toggle.
- [ ] Rapid key presses remain responsive.
- [ ] Momentum persists through valid shifts.
- [ ] Invalid shifts do not corrupt player state.
- [ ] Grounding updates correctly after shifts.
- [ ] Levels require meaningful use of the mechanic.
- [ ] The player can identify the active dimension.
- [ ] Death and restart work correctly.
- [ ] There are no known progression-blocking bugs.
- [ ] The game can be completed from start to finish.
- [ ] The production build runs on the target platform.
- [ ] The public repository contains the required source.
- [ ] The itch.io submission is playable.

---

# 18. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Blind shifts become frustrating | High | Inactive-layer previews and readable geometry |
| Shifting creates collision bugs | High | Atomic shifts and deterministic validation |
| Movement feels imprecise | High | Early controller tuning |
| Levels feel repetitive | High | Focus on distinct geometric relationships |
| Excessive visual effects obscure play | Medium | Short effects and reduced-effects option |
| Rapid Shift input triggers OS shortcuts | Medium | Remapping and Sticky Keys guidance |
| Scope grows beyond the jam (16 levels, 4 new mechanics) | High | Tiers A/B/C with dated cut lines (§8.2); tier A always ships; content freeze Nov 22 |
| Difficulty spikes unexpectedly | Medium | External playtesting |
| Too much architectural work delays content | Medium | Keep extensibility lightweight |
| Unintended routes break progression | Medium | Systematic level testing |
| Pranks feel unfair | High | Tells before every prank; checkpoint restore |
| Freaks read as generic enemies | Medium | Keep them pranksters: no chasing, comedic sound, notes |
| Premise matches the jam page's own example idea, so Innovation scores suffer | High | Lead with pranks and freezing freaks on the itch page, cover, GIF and in the first minutes of play (§1.8) |
| Raters quit before the freaks show up (level 5+) | High | Freak evidence from the first night shift; level select from the title screen |
| Too few ratings lowers the adjusted score | Medium | Browser-playable, short, quick to start; rate 30+ entries early in voting (RELEASE.md §6) |
| Code-drawn art reads as unfinished, hurting Graphics | Medium | One consistent style (ART.md §1.1); animation and effects over detail |

---

# 19. Playtesting and Validation

## 19.1 First-Session Questions

Testers should be able to answer:

1. What does Shift do?
2. How do the dimensions interact?
3. Can shifting occur during a jump?
4. Does momentum persist?
5. Why did a particular shift fail?
6. What information helps predict the destination geometry?

## 19.2 Gameplay Validation

Observe whether players:

- Discover midair shifting naturally.
- Understand why platforms disappear.
- Attempt rapid consecutive shifts.
- Use alternate dimensions to recover from mistakes.
- Develop efficient routes.
- Express frustration with unseen obstacles.
- Find unexpected but legitimate shortcuts.

## 19.3 Suggested Success Criteria

Provisional targets:

- Most first-time testers understand Shift within the first minute.
- Players can complete the introductory level without verbal instruction.
- Testers can explain why a failed shift was rejected.
- The core mechanic remains enjoyable across multiple levels.
- No progression-blocking collision bugs remain.
- At least some players voluntarily retry a level to improve their execution.

These targets should be measured through playtesting rather than assumed.

---

# 20. Post-Jam Expansion

The architecture may eventually support more than two dimensions.

Potential future direction:

## 20.1 Multiple Layers

Introduce directional layer shifting.

Possible controls:

- Shift Up.
- Shift Down.

This would replace binary toggling with deliberate dimension selection.

## 20.2 More Complex Environmental Relationships

Additional layers could introduce:

- Unique geometry.
- Different hazards.
- Dimension-specific interactions.
- More complex navigational sequences.

## 20.3 Advanced Movement Systems

Potential additions:

- Dashing.
- Wall jumping.
- Moving platforms.
- Momentum-based objects.
- Environmental triggers.

These should only be introduced when they meaningfully interact with dimensional shifting.

## 20.4 Community Content

Possible expansion:

- Level editor.
- Shareable level data.
- User-generated challenges.
- Speedrunning support.

None of these features is required for Game Off 2026.

---

# 21. Open Design Decisions

The following decisions require prototypes or further discussion.

| Question | Current Direction | Priority |
|---|---|---|
| Engine and framework | Plain JS + canvas, pure rules module | Locked |
| Title | Double Shift | Locked |
| Fiction | Day/night shifts in one building | Locked |
| Collision on blocked shifts | Nudge → 80 ms buffer → reject | High (tune) |
| Inactive geometry visibility | Dashed echo outlines | High (playtest) |
| Shift par | In scope | Locked |
| Primary shift bind | Shift or K, pending Sticky Keys test | High |
| Momentum preservation | Required | Locked |
| Shift cooldown | None | Locked |
| Dimensions in jam version | Two | Locked |
| Shift input | Shift key, rebindable if feasible | Locked |
| Shift direction | Binary toggle | Locked |
| Movement physics | Responsive, momentum-preserving | High |
| Visual identity | Code-drawn as a deliberate style; one building in two lights | Locked (v0.4) |
| Hazards | Simple and dimension-specific | Medium |
| Checkpoint frequency | Based on challenge length | Medium |
| Moving objects in inactive layers | Frozen | Locked |
| Level count | 21: five acts of four plus the finale; tiers 12 / 17 / 21 with cut dates (§8.2) | Locked (v0.6) |
| New mechanics in jam scope | Wet floor, supervisor, offset layer, day-walker; each cut if it misses its date | Locked (v0.5) |
| Antagonist | The freaks: never fully shown, nature undefined, nocturnal and annoying (§4.8) | Locked |
| Tone | Mock horror | Locked |
| Pranks trigger | Nth entry into night | Locked |
| Freak AI | None: fixed patterns, frozen by day | Locked |
| Subtitle | *The Freaks Come Out at Night* | Provisional |
| Shared state (levers/doors) | Post-jam | Deferred |
| Speedrun timer | Optional | Low |
| Additional dimensions | Post-jam | Deferred |
| Narrative | Minimal | Provisional |

---

# 22. Immediate Next Steps

> **Historical.** Steps 1–3 are done (the prototype has 6 levels, level select and a full test suite). The current next steps are the milestones in [PRODUCTION.md](PRODUCTION.md) §2.

## Step 1: Select Engine — done (v0.2)

Plain JS + canvas, pure rules module (§13.8–13.9).

## Step 2: Build the Smallest Possible Prototype — started (v0.2)

Create:

- One player.
- Two basic tilemaps.
- One gap.
- One platform existing only in the alternate layer.
- Shift toggling.
- Basic collision.

Do not prioritize art or menus yet.

## Step 3: Validate the Central Mechanic

Confirm:

- Shifting feels instantaneous.
- The player retains coordinates.
- The player retains momentum.
- Collision behavior is stable.
- Rapid shifting is enjoyable.

## Step 4: Build a Vertical Slice

Create one short level containing:

- A missing bridge.
- A wall bypass.
- A midair shift.
- A two-shift traversal sequence.
- A finish area.

The vertical slice should demonstrate the game's core appeal without requiring additional mechanics.

## Step 5: Playtest

Observe at least one person playing without verbal guidance.

Use the results to refine collision, readability, movement, and level design before expanding content.

---

# 23. Final Design Statement

Double Shift is built around one simple idea:

**The worker stays where they are while the building changes around them, and something giggles in the dark every time it does.**

The player navigates two overlapping realities by shifting between them instantly, turning otherwise impossible routes into achievable movement sequences.

The mechanic is deliberately unrestricted.

There are no shift charges, no cooldowns, and no artificial limits on how frequently dimensions can change.

Challenge emerges from the player's ability to understand overlapping geometry and execute movement across it.

The jam version focuses on two dimensions, a small number of polished mechanics, and handcrafted levels designed around their interactions.

The objective is not to create the largest possible platformer.

It is to create a platformer in which a single additional button meaningfully transforms how players perceive and navigate space.

**Press Shift to change shifts.**

*End of Game Design Document, Version 0.6.0*
