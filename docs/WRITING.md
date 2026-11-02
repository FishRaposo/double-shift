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
- Original jokes only (GDD §10.5).

## 2. Title and UI

| Where | Text |
|---|---|
| Title ✅ | DOUBLE SHIFT |
| Subtitle *(provisional)* | The Freaks Come Out at Night |
| Tagline ✅ | One building. Two shifts. One worker. |
| Start ✅ | Click or press SPACE to clock in |
| Sticky Keys note ✅ | Windows: hammering Shift can open Sticky Keys — use K, or turn off the Sticky Keys shortcut. |
| Tutorial ✅ | Press SHIFT (or K) to change shifts / Dashed outlines show the other shift |
| Pause ✅ | ON BREAK · Esc: resume · R: restart · L: levels |
| Title button ✅ | LEVEL SELECT (L) |
| Level select ✅ | TIMECARDS · ACT n · NAME · BEST n · PAR p · NOT YET · stamps ON PAR / UNDER! / +n · Arrows: choose · SPACE or click: clock in · Esc: back |
| Timecard ✅ | NEW BEST (when a saved best is beaten) |
| HUD ✅ | DAY SHIFT / NIGHT SHIFT · CLOCK-INS n · PAR p |
| Timecard ✅ | TIMECARD · Clock-ins · Par · Time · Incidents · stamps ON PAR / UNDER PAR! / +n OVERTIME |
| End ✅ *(prototype)* | END OF PROTOTYPE · Thanks for working overtime. · SPACE: clock in again |

### 2.1 Planned UI text *(drafts)*

| Where | Text |
|---|---|
| Settings | SETTINGS · Master · Music · Sound · Reduced effects ON/OFF · Esc: back |
| Act 1 card | ACT 1 · RENOVATION · "Pardon our dust." |
| Act 2 card | ACT 2 · OVERTIME · "Something keeps moving things." |
| Act 3 card | ACT 3 · GRAVEYARD SHIFT · "They've gotten organized." |
| Act 4 card | ACT 4 · LIGHTS OUT · "The building doesn't add up anymore." |
| Sticky Keys joke (G14) | A freak memo: "WE PRES SHIFT 5 TIMES. FOR FUN." + the practical line kept below it |
| End (full game) | SHIFT COMPLETE · totals · SPACE: clock in again |

## 3. Level notes (shown 5 s at level start)

| Level | Note |
|---|---|
| 1 Clock In ✅ | Gap in the floor by day. The night crew laid planks, and locked the gate. |
| 2 Scaffolding ✅ | The day crew put up scaffolding. Deliveries came in. |
| 3 Closing Time ✅ | Rebar by day, lasers by night. Gates go down at closing. |
| 4 Mid-Air ✅ | Something up there blinked. |
| 5 Inventory ✅ | Every time you clock in, something gets moved. |
| 6 Night Watch ✅ | Something is in the tunnel. It only moves at night. |
| 7 Under Renovation (`stairs`) | They built a staircase. It leads nowhere. They're very proud. |
| 8 Lost & Found (`doors`) | The freaks have stolen every door. Not the keys. The doors. |
| 9 Wet Floor (`wet`) | Someone waxed the floors. Nobody on the payroll waxes floors. |
| 10 Structural Integrity (`pillar`) | They moved a load-bearing pillar. The building is somehow fine. |
| 11 Night Management (`supervisor`) | One of them has a clipboard now. It's supervising the others. |
| 12 Stacked (`stacked`) | They've been busy. |
| 13 Floor 3.5 (`offset`) | There is no Floor 3 anymore. It's now Floor 3.5. |
| 14 Broad Daylight (`daywalker`) | One of them clocked in for the day shift. |
| 15 Employee of the Month (`portrait`) | They installed a portrait of themselves. It blocks the exit. |
| 16 Clock Out (`clockout`) | Almost done. Don't look at the vents. |

Notes 7, 8, 10, 11, 13 and 15 come from Fish's idea pool (2026-11-02). 8 and 13 are unchanged; 7, 10, 11 and 15 are lightly trimmed to fit one line at 15 px (his full lines are the "Fiction" lines in LEVELS.md §5). *Freight* ("The crates were stacked properly. They were.") is kept for post-jam.

## 4. Spook lines (random on freak contact) ✅

SPOOKED! · AAAGH! · NOPE! · EEP! · NOT PAID ENOUGH

*Candidates:* I QUIT (AGAIN) · NOT IN MY JOB DESCRIPTION · WORKPLACE INCIDENT

## 5. Prank feedback

| Where | Text |
|---|---|
| Prank fires ✅ | hee hee hee |
| Sticky note tell (day) ✅ | MINE |
| More tells | MINE NOW · DO NOT TUCH · FINDERS KEEPERS · (a drawing of eyes) |
| Hex-flavored tells *(candidates)* | MINE BY ANSHENT LAW · HEXED. NO TUCH · THE PLANK IS OURS NOW · WE SEE YOU (WE R SHINY) |

## 6. Notice board memos *(planned, A3)*

Shown as props; readable when the worker stands near (or always, small).

- "To the night crew: please stop moving the planks. — Management"
- "To the day crew: we do not have a night crew. — Night Management"
- "Lost: one (1) plank. If found, please return to the pit."
- "Reminder: the vents are not a break room."
- "Pest control visit cancelled. Pest control would like to not talk about it."
- "Employee of the Month: [photo is just eyes]"
- "Overtime is mandatory. So are the freaks, apparently."
- "Whoever keeps drawing circles in chalk on the loading dock: stop."
- "Break room: all snacks have been taken. The wrappers have been arranged in a circle. With candles."
- "Do not leave shiny objects unattended."

### 6.1 One memo per level *(drafts; pick from §6 or these)*

| Level | Memo |
|---|---|
| `clock` | "Mind the gap. Seriously. — Renovation" |
| `scaff` | "Deliveries go on the ledge. Not on the scaffolding. Not on the ledge either. — Receiving" |
| `closing` | "Lasers are for security, not for jumping over. — Night Management" |
| `midair` | "Please report blinking in the dark to nobody." |
| `inventory` | "Lost: one (1) plank. If found, please return to the pit." |
| `watch` | "Reminder: the vents are not a break room." |
| `stairs` | "Who approved the staircase. — Facilities" |
| `doors` | "Doors are now available at Lost & Found. Please take only your own door." |
| `wet` | "Floors were waxed at 3 AM. We do not employ anyone at 3 AM." |
| `pillar` | "Structural survey: fine. Somehow. — Engineering" |
| `supervisor` | "We did not hire a night supervisor. — HR" |
| `stacked` | "Whoever keeps drawing circles in chalk on the loading dock: stop." |
| `offset` | "The elevator now stops at 3.5. Do not press 3.5." |
| `daywalker` | "Day crew: if you see eyes, no you didn't." |
| `portrait` | "Employee of the Month: [photo is just eyes]" |
| `clockout` | "Overtime is mandatory. So are the freaks, apparently." |

## 7. Timecard comments *(planned, A8)*

One line under the stamp, picked by result:

| Result | Comment |
|---|---|
| Under par | "Efficient. Suspiciously efficient." |
| On par | "A normal shift. Nothing to report." |
| Over par | "Clocked in a lot. The freaks noticed." |
| Spooked ≥ 1 | "Incident report: was spooked." |
| Spooked ≥ 3 | "Incident report: was spooked. Again. And again." |
| 0 deaths, on/under par | "Perfect shift. Nobody believes you." |

## 8. Ending *(planned, `clockout`)*

- Final timecard totals across all levels.
- Last line: "Shift complete. See you tonight." Then, in the dark, a dozen pairs of eyes blink in sequence. One waves.
- Credits: Designed by Vinícius Raposo. Built with AI assistance (Claude). [Design partner, as they choose to be credited.] Made for GitHub Game Off 2026.

## 9. itch page copy

Lives in [RELEASE.md](RELEASE.md) §4. Fish writes the final version.
