# Writing / Copy Deck

Companion to [GDD.md](GDD.md) §1.6 and §10.5. Every line of text in the game lives here first. **Status: drafts for Fish to edit.** Lines marked ✅ are in the build now.

**At a glance**
- Worker: deadpan. Freaks: petty, smug, all caps, bad spelling. Management: clueless (§1).
- ✅ = in the build. Everything else is a draft for Fish.
- One-line jokes only; original jokes only.

## 1. Voice

- The worker is **deadpan**. Underpaid, unbothered, quietly done with this building.
- The freaks are **petty and pleased with themselves**. They write in all caps on sticky notes and giggle.
- **What the freaks are stays undefined** (GDD §4.8): nocturnal, and they live to annoy you. Never give them a species, origin or explanation, not even in a joke. They write like smug hoarders who think they're ancient and powerful: grand claims, bad spelling, about very small things. Energy reference: Sableye (Pokémon), a giggling trickster that loves its own pranks (GDD §4.8). It's internal only: never name it or quote it in game text.
- Management is **clueless**: memos that blame the night crew, the day crew, the pigeons.
- Jokes are short. A line that needs a second line isn't ready.
- **Never explain the joke** (Fish, 2026-11-18). No second sentence that spells out the first, no bracketed stage directions ("[photo is just eyes]"); the art carries it. A note that tells you how something works is a hint, not a joke, and stays.
- Original jokes only (GDD §10.5).

## 2. Title and UI

| Where | Text |
|---|---|
| Title ✅ | DOUBLE SHIFT |
| Subtitle *(provisional)* | The Freaks Come Out at Night. On the title screen since Nov 3 as "The freaks come out at night." under the logo, as on the itch cover, so the hook lands before level 6; Fish makes the final call by Nov 22 |
| Tagline ✅ | One building. Two shifts. One worker. |
| Start ✅ | Click or press SPACE to clock in |
| Sticky Keys note ✅ | Windows: hammering Shift can open Sticky Keys — use K, or turn off the Sticky Keys shortcut. (Built from the bindings: the other SHIFT keys, else "rebind SHIFT in SETTINGS > CONTROLS"; hidden when Shift doesn't change shifts.) |
| Tutorial ✅ | Press Shift or K to change shifts (the keys come from the player's bindings) / Dashed outlines show the other shift |
| Pause ✅ | ON BREAK · Esc: resume · R: restart · L: levels · O: settings |
| Title buttons ✅ | LEVEL SELECT (L) · SETTINGS (O) |
| Title gamepad line ✅ | Gamepad: stick move · A jump · B, X or RB shift · Start pause · X levels · Y settings |
| Settings ✅ | SETTINGS · MASTER · MUSIC · SOUND · REDUCED EFFECTS ON/OFF · SPEEDRUN TIMER ON/OFF · CONTROLS Enter > · Up/Down: choose · Left/Right: change · Esc: back |
| Controls ✅ | CONTROLS · LEFT · RIGHT · JUMP · SHIFT, each with its keys ("Shift or K") · RESET TO DEFAULTS · PRESS A KEY · Press the new key · Esc: cancel · Up/Down: choose · Enter: change · Esc: back · Back to the defaults. · Not that one: use a letter, a digit, an arrow, Space or Shift (R, L, O and M are the menus'). |
| Act cards ✅ | ACT n · NAME · the line from §2.1 |
| Level select ✅ | TIMECARDS · act tabs: ACT n + the act name, or FINALE · each card: the number, the NAME, PAR p / NOT YET, stamps ON PAR / UNDER! / +n · detail bar: n. NAME · BEST n · PAR p (or NOT YET) · Arrows: choose · SPACE or click: clock in · Esc: back |
| Timecard ✅ | NEW BEST (when a saved best is beaten) |
| HUD ✅ | DAY SHIFT / NIGHT SHIFT · CLOCK-INS n · PAR p · TIME 12.34 (with SPEEDRUN TIMER on) |
| Timecard ✅ | TIMECARD · Clock-ins · Par · Time · Incidents · stamps ON PAR / UNDER PAR! / +n OVERTIME |
| End ✅ | SHIFT COMPLETE · Thanks for working overtime. · one row per act: ACT n · NAME (or FINALE) with clock-ins / par · Total clock-ins · Total time n s (with SPEEDRUN TIMER on; every attempt, restarts included) · the credits (§8) · SPACE: clock in again |

### 2.1 More UI text ✅ *(in the build; the words are drafts for Fish)*

| Where | Text |
|---|---|
| Act 1 card | ACT 1 · RENOVATION · "Pardon our dust." |
| Act 2 card | ACT 2 · OVERTIME · "Something keeps moving things." |
| Act 3 card | ACT 3 · GRAVEYARD SHIFT · "They've gotten organized." |
| Act 4 card | ACT 4 · LIGHTS OUT · "The building doesn't add up anymore." |
| Act 5 card ✅ | ACT 5 · UPSIDE DOWN · "The night shift turned the building over." |
| Finale card ✅ | FINALE · CLOCK OUT · "One more shift." |
| Sticky Keys joke (G14) ✅ | A freak memo: "WE PRES SHIFT 5 TIMES. FOR FUN." on a sticky note on the title screen, the practical line kept below it |
| End (full game) ✅ | SHIFT COMPLETE · one row per act · totals · credits · SPACE: clock in again |

## 3. Level notes (shown 5 s at level start)

In the order of the 21-level game (LEVELS.md §5.0). ✅ = in the build.

| Level | Note |
|---|---|
| 1 Clock In (`clock`) ✅ | Gap in the floor by day. The night crew laid planks. |
| 2 Scaffolding (`scaff`) ✅ | The day crew put up a wall. It stops at the end of their shift. |
| 3 Closing Time (`closing`) ✅ | One fuse for the whole floor. Budget cuts. |
| 4 Mid-Air (`midair`) ✅ | One valve, two rooms. Somebody is getting wet. |
| 5 Inventory (`inventory`) ✅ | Every time you clock in, something gets moved. Unless it is bolted down. |
| 6 Night Watch (`watch`) ✅ | Something is in the tunnel. It stops by day. Mind where you left it. |
| 7 Under Renovation (`stairs`) ✅ | The hoist moves one stop every time you clock in. |
| 8 Lost & Found (`doors`) ✅ | They swap the doors every night. Bolt them when you like where they are. |
| 9 Wet Floor (`wet`) ✅ | Someone waxed the floors. |
| 10 Structural Integrity (`pillar`) ✅ | They moved a load-bearing pillar. Jack it under the beam. |
| 11 Night Management (`supervisor`) ✅ | The clipboard only keeps one side busy at a time. |
| 12 Stacked (`stacked`) ✅ | They left a schedule. One wrench. Choose. |
| 13 Employee of the Month (`portrait`) ✅ | Employee of the Month. Every month. |
| 14 Broad Daylight (`daywalker`) ✅ | One of them clocked in for the day shift. |
| 15 Floor 3.5 (`offset`) ✅ | There is no Floor 3 anymore. The lift only moves when you clock in. |
| 16 Night Audit (`audit`) ✅ | Management is doing a walkthrough tonight. So are they. |
| 17 Mind Your Head (`upside`) ✅ | They flipped the night shift. Mind your head. |
| 18 Falling Up (`fallup`) ✅ | The floor is up there now. So is the water. |
| 19 Ceiling Walker (`ceiling`) ✅ | Something is walking on the ceiling. It's fine. |
| 20 Head Over Heels (`heels`) ✅ | Up is a matter of opinion now. |
| 21 Clock Out (`clockout`) ✅ | Almost done. One of everything. Don't look at the vents. |

Synced to the build on 2026-11-18 (the repairs rework had changed several). Earlier drafts came from Fish's idea pool (2026-11-02); his full lines are the "Fiction" lines in LEVELS.md §5. Act 5 is Fish's Upside Down idea (LEVELS.md §5.2). *Freight* ("The crates were stacked properly. They were.") is kept for post-jam.

## 4. Spook lines (random on freak contact) ✅

SPOOKED! · AAAGH! · NOPE! · EEP! · NOT PAID ENOUGH

*Candidates:* I QUIT (AGAIN) · NOT IN MY JOB DESCRIPTION · WORKPLACE INCIDENT

## 5. Prank feedback

| Where | Text |
|---|---|
| Prank fires ✅ | hee hee hee |
| Sticky note tell (day) ✅ | MINE |
| Prank countdown (both shifts) ✅ | NEXT NIGHT · IN 2 NIGHTS |
| Work order HUD ✅ *(drafts)* | WORK ORDER: OPEN THE SHUTTER, then GET THE FUSE · FIX THE FUSE BOX · DONE |
| Work order goals ✅ *(drafts)* | RAISE THE DECK · ONE FUSE: TAKE IT WITH YOU · SEND THE WATER BACK · BOLT THE PLANK DOWN · LIGHT THE CORRIDOR · FREE THE HOIST · BOLT THE DOORS IN PLACE · TURN THE LEAK ASIDE · JACK UP THE PILLAR · ONE FUSE, TWO SHUTTERS · ONE BOLT: STOP THE RIGHT ONE · LIGHT THE PORTRAIT · FREE THE LIFT · OPEN THE GATE · LIGHT THE LAST TUNNEL · CHANGE THE CEILING LIGHT · ONE FUSE, TWO CORRIDORS · LIGHT THE LOW TUNNEL · BOLT THE LAST STEP DOWN · SEND THE LEAK DOWN · SLIDE THE HATCH ASIDE · FIX THE TIME CLOCK |
| Work order tags in the level ✅ *(drafts)* | The tool, the broken thing and what it drives each carry a small paper label until the job is done |
| Work order jobs ✅ *(drafts)* | FUSE / FUSE BOX · WRENCH / LEAKING PIPE · BULB / DEAD LIGHT · OIL CAN / SQUEAKY HINGE · TAPE / LOOSE CABLE |
| Work order feedback ✅ *(drafts)* | FIXED · OFF · BOLTED · CLOCK IN TO MOVE IT · TOUCH IT TO SWAP · TAKE THE FUSE WITH YOU · WAIT FOR THE PILLAR |
| More tells ✅ (Nov 3: MINE NOW on Inventory's and Stacked's planks, DO NOT TUCH on Stacked's gate, FINDERS KEEPERS on the finale's door) | MINE NOW · DO NOT TUCH · FINDERS KEEPERS · (a drawing of eyes) |
| Hex-flavored tells *(candidates; HEXED. NO TUCH is on Night Audit's plank)* | MINE BY ANSHENT LAW · HEXED. NO TUCH · THE PLANK IS OURS NOW · WE SEE YOU (WE R SHINY) |
| The freaks' proud sign over the staircase (`stairs`) ✅ | OUR STARES! |
| Management's sign in `inventory` ✅ *(draft)* | STUCK? RESTART. |
| `closing` sign ✅ | CLOSING TIME |

### 5.1 Signs in the levels ✅ *(in the build; drafts for Fish)*

| Level | Sign |
|---|---|
| `clock` | RENOVATION |
| `scaff` | DELIVERIES |
| `closing` | LASERS |
| `stairs` | OUR STARES! (the freaks') |
| `pillar` | LOAD BEARING |
| `supervisor` | STAFF ONLY |
| `daywalker` | DAY SHIFT |
| `offset` | 3 · 3.5 (floor numbers) |
| `audit` | INSPECTION |
| `upside` | MIND YOUR HEAD |
| `fallup` | THIS WAY UP |
| `ceiling` | IT'S FINE |
| `heels` | HARD HAT AREA |
| `clockout` | LAST SHIFT |

## 6. Notice board memos ✅ (Nov 3: one per level, §6.1)

A memo is a scrap of paper pinned to the wall (`memo` prop); while the worker stands within 2 tiles of it, its text shows on a paper panel above it (scale 2, at most 360 px wide; `memoPanel` in `src/layout.js`). Tests pin that every level has one, that the scripted route passes close enough to read it, and that its panel never covers the exit, a tell, a sign or the job.

- "To the night crew: please stop moving the planks. — Management"
- "To the day crew: we do not have a night crew. — Night Management"
- "Lost: one (1) plank. If found, please return to the pit."
- "Reminder: the vents are not a break room."
- "Whoever keeps drawing circles in chalk on the loading dock: stop."
- "Break room: all snacks have been taken. The wrappers have been arranged in a circle. With candles."
- "Do not leave shiny objects unattended."

### 6.1 One memo per level ✅ *(in the build; drafts for Fish)*

| Level | Memo |
|---|---|
| `clock` | "Mind the gap. Seriously. — Renovation" |
| `scaff` | "Deliveries go on the ledge. Not on the scaffolding. Not on the ledge either. — Receiving" |
| `closing` | "Lasers are for security, not for jumping over. — Night Management" |
| `midair` | "Please report blinking in the dark to nobody." |
| `inventory` | "Lost: one (1) plank. If found, please return to the pit." |
| `watch` | "Reminder: the vents are not a break room." |
| `stairs` | "The hoist runs on the night clock. Do not ask who winds it." |
| `doors` | "Lost & Found is not responsible for doors." |
| `wet` | "Who waxed the floors at 3 AM? — Facilities" |
| `pillar` | "Structural survey: fine. — Engineering" |
| `supervisor` | "Mgmt reminder: work when watched. Do not work when not watched." |
| `stacked` | "Schedule of works. Do not ask whose." |
| `portrait` | "Please do not move the portrait. — Management" |
| `daywalker` | "Day crew: if you see eyes, no you didn't." |
| `offset` | "The elevator now stops at 3.5. Do not press 3.5." |
| `audit` | "Pest control visit cancelled by pest control." |
| `upside` | "Ceiling inspection: passed. Floor inspection: pending. — Facilities" |
| `fallup` | "Gravity will be restored after the renovation. — Facilities" |
| `ceiling` | "To the night crew: please stop moving the planks. — Management" |
| `heels` | "To the day crew: we do not have a night crew. — Night Management" |
| `clockout` | "Overtime is mandatory. — Management" |

## 7. Timecard comments ✅

One line under the stamp, picked in this order (`timecardComment` in `src/copy.js`):

| Result | Comment |
|---|---|
| 3+ incidents | "Incident report: was spooked. Again. And again." |
| 1–2 incidents | "Incident report: was spooked." |
| Under par, no incidents | "Perfect shift. Nobody believes you." |
| On par, no incidents | "A normal shift. Nothing to report." |
| Over par, no incidents | "Clocked in a lot. The freaks noticed." |

Unused, kept for later: "Efficient. Suspiciously efficient." 

## 8. Ending ✅ (after `clockout`)

- ✅ The end screen: SHIFT COMPLETE, one row per act (that act's clock-ins / par over the levels played this run), total vs. total par. Twenty-one level rows don't fit the screen at a readable size; six act rows do.
- ✅ In the dark margins a dozen pairs of eyes open one after another; once they're all open, one freak waves, and "See you tonight." appears below the card.
- ✅ Credits (`CREDITS` in `src/copy.js`), under the end screen's totals: "Designed by Vinícius Raposo. Built with AI assistance (Claude). Made for GitHub Game Off 2026." Final wording (Fish, 2026-11-03): no design-partner line, since the art is all code-drawn.

## 9. itch page copy

Lives in [itch/page.md](../itch/page.md) §4. Fish writes the final version. The devlog and X post drafts are in §10.

## 10. Devlog #1 and X post drafts *(DRAFT for Fish; written 2026-11-14)*

**Plain factual draft, not yet in Fish's voice; rewrite before publishing.** Every claim below is backed by the code or the tests (the counts are kept in sync by `npm run counts`). Nobody has playtested the game yet, so there are no claims about fun or player reactions. Fish fills the bracketed link and picks one GIF (the chosen level is `upside`).

### 10.1 Devlog #1: what it is, how it was made

> **Double Shift: devlog #1**
>
> *Double Shift* is a puzzle-platformer for GitHub Game Off 2026 (theme: SHIFT). You work the day shift and the night shift in the same building at the same time, and the Shift key moves you between them, even mid-jump. Every time you clock into the night, the freaks move something. When you go back to the day, they freeze. Each level has a par for clock-ins. There are <!-- n:levels -->21<!-- /n --> levels: five acts of four plus a finale, including an act where the night is the day's map turned upside down, with gravity pointing up.
>
> **How it was made.** Plain JavaScript on one canvas. No engine, no dependencies, no asset files. All the art is drawn in code and all the sound and music is synthesized with WebAudio. The game rules are one pure module with no DOM and no clock: `step(level, state, input)` returns the next state at a fixed 120 Hz, so the same inputs always give the same result.
>
> Every level has a scripted solution that the tests replay. It has to win at par or better with no deaths, and running and jumping without shifting must not win. The demo GIFs are those same runs, played by the game on a fixed clock.
>
> **Some numbers from the repo today:**
> - <!-- n:tests -->598<!-- /n --> automated tests.
> - Every input a level requires has at least 200 ms of slack in acts 1-2 and at least 100 ms in acts 3-6.
> - The scripted solutions still win with every input up to 100 ms late in acts 1-2 and up to 50 ms late in acts 3-6.
> - <!-- n:levels -->21<!-- /n --> levels, each proven winnable at par by a scripted run.
>
> **AI disclosure.** Designed by Vinícius Raposo. Built with AI assistance (Claude) to his design document, with draft text from the same place. The code, including the code that draws the art and synthesizes the sound, was written with AI assistance. No generated images or audio were used.
>
> Play: [itch link]. Source: https://github.com/FishRaposo/double-shift

### 10.2 X post drafts (each under 240 characters; Fish writes the final words and puts the link in the first reply)

1. > Double Shift: a puzzle-platformer where you work the day and night shift at once. Shift between them, even mid-jump. Every night clock-in, the freaks move something. <!-- n:levels -->21<!-- /n --> levels. Made for #GitHubGameOff.
2. > No engine, no dependencies, no asset files. Double Shift's art is drawn in code and its sound is synthesized. The rules are a pure function, so the tests replay a scripted solution of every level. #GitHubGameOff
3. > The demo GIFs for Double Shift are the tests' own scripted runs, played by the game on a fixed clock. Built with AI assistance (Claude), to a human design. #GitHubGameOff
