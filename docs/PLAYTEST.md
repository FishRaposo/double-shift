# Playtest Plan

Companion to [GDD.md](GDD.md) §19. Playtests answer questions the tests can't: is it fun, is it readable, is it fair.

**At a glance**
- Run a build: `npm start` (your machine) or the Pages link (theirs) (§2).
- Say nothing, watch, take notes, then the form (§2, §4).
- Biggest signals: time to first shift, do they work out that day freezes the freaks, do they replay for par (§3).
- Round 2 (the full run) has its own sheet, with the 5-second readability test (§7).

## 1. Schedule

| Round | When | Build | Who | Focus |
|---|---|---|---|---|
| 0 | by Nov 8 | All 21 levels | Fish | Feel, Sticky Keys, tuning |
| 1 | by Nov 8 (M1) | All 21 levels | 1–2 people who haven't seen it | Do they get Shift, echoes, freezing, pranks without help? |
| 2 | by Nov 22 (M3) | Full run: every level still in after the cut dates (up to 21) | 2–3 new people | Pacing across five acts and the finale, how readable the Upside Down flip is on first sight, difficulty curve, new mechanics readable on first sight, jokes landing |
| 3 | Nov 26 (M4) | itch draft page | 1 person, their own machine | Loads, runs, controls, nothing broken |

Jam communities (the Game Off itch community, Discord) are a source of cold testers. Trade plays with other entrants.

## 2. How to run one

**Getting a build in front of them:**
- *Same machine:* `npm start` (or double-click `play.bat` on Windows) opens the current working copy at http://localhost:8080, uncommitted changes included.
- *Their machine:* send <https://fishraposo.github.io/double-shift/>, which is the last push to `main`.
- *Recording the session:* fill in "Build / commit" in the log with `git log --oneline -1`, plus "(dirty)" if you played uncommitted changes.

1. Give them the link and **say nothing** beyond "it's a puzzle-platformer, keyboard". No explanation of shifting.
2. Watch (screen share or in person). Don't help unless they're stuck for 2+ minutes; note when and why you helped.
3. Note every moment of: confusion, a death they didn't expect, a laugh, an "oh!", a sigh.
4. After: the form below. Ask the open questions first.

## 3. What to watch for (GDD §19.1–19.2)

- Time until first shift on level 1 (target: under a minute, no help).
- Do they discover shifting **mid-air** on their own before level 4 forces it?
- Do they read the **dashed echoes** before shifting, or shift blindly?
- Do they understand **why a shift was rejected**?
- Level 6: do they figure out that **day freezes the lurker**? How long does it take?
- Level 5: do they **notice the tell** (eyes/MINE, NEXT NIGHT, the outlined tiles) before the prank? Do they understand the plank moved *because they clocked in*?
- Do they look at **par**? Do they retry a level to beat it unprompted? (Strongest fun signal.)
- Do they laugh at anything? Which line/gag?
- Do they say "the freaks"?

## 4. Feedback form

1. What was the game about, in your words?
2. What did the Shift key do?
3. What were the freaks? What did they do?
4. When did you feel stuck? What got you unstuck?
5. Did any death feel unfair? Which?
6. What was the most fun moment?
7. Did you care about par? Did you replay anything?
8. Anything that made you laugh?
9. Rate 1–5: controls feel · readability · difficulty (1 easy – 5 hard) · fun
10. One thing you'd change.

## 5. Log

Copy this block per session.

```
Date:
Tester (alias):          Seen it before? y/n
Build / commit:
Browser / OS / input:
Time to first shift:
Help given (when, why):
Levels completed / deaths per level / shifts vs par:
Moments (time, level, what happened):
Form answers:
Actions (→ PRODUCTION.md backlog IDs):
```

## 6. Turning results into work

- Any confusion two testers share is a **P0** readability fix.
- Unfair deaths: check the level against LEVELS.md §6 (windows, tells), then fix the level, not the player.
- If nobody retries for par, revisit pars and the timecard presentation before adding content.
- Record decisions (freak size, primary bind, camera) in GDD §21 and PRODUCTION.md §5.

## 7. Round 2 sheet (full run, by Nov 22)

**Build:** the Pages link or `npm start` at the release-candidate commit (log `git log --oneline -1`). All <!-- n:levels -->21<!-- /n --> levels. Time the run per act; 35–50 minutes is an unmeasured estimate.

**First, the 5-second test** (cold, before they've played). It checks ART.md §3.1's reading order on real screens. Make the deck with `npm run media` and `npm run media -- --review wet,daywalker`. Show each shot for 5 seconds, then hide it. Ask them to point to (or say where) **the worker, the way out, something that would hurt them, and a creature**, and whether it's **day or night**. Mark each one found, wrong or missed. Explain nothing. Check each shot yourself before the session; the key below lists what to look for.

| # | Act | Shot | Shift | On screen |
|---|---|---|---|---|
| 1 | 1 | `media/02-clock-in-day.png` | Day | Worker bottom left; exit right; the taped gap in the floor; no creature |
| 2 | 2 | `media/07-night-watch-night.png` | Night | Worker left; exit right; the freaks in the tunnel and by the exit |
| 3 | 3 | `media/review/wet-night.png` | Night | Worker left; exit right; the lasers in the corridor; a lurker by the exit |
| 4 | 4 | `media/review/daywalker-day.png` | Day | Worker left; exit right; the day-walker (shades) in the middle; dashed outlines of frozen freaks |
| 5 | 5 | `media/20-flip-mind-your-head.png` | Night (upside down) | Worker hanging, left of centre; exit hanging, bottom right; no creature |
| 6 | Finale | `media/14-clock-out-day.png` | Day | Worker bottom left; exit top right; the pit; the day-walker bottom right |

Goal: every tester finds the worker and the exit in every shot and names the shift right. A miss that two testers share is a P0 readability fix (§6).

**While they play,** besides §3:
- Act 2: do they connect a door vanishing to their own clock-in (Lost & Found)?
- Act 3: do they read the wet floor's slide, and the supervisor's clipboard: its wedge and pips, "!" as danger, "z" as safe?
- Any act: do they know the job from the HUD and tags, and see what the repair changed? Does it feel like the point of the level or a chore? Did anyone miss a tool and have to double back?
- Power and Machine levels: do they work out that the fuse comes with them, and that the hoist moves without them? Secure levels: do they read the tell and choose when to bolt, or bolt by accident?
- Any act: do they use a patrol's floor track and a peeker's rattle before contact?
- Act 4: are they surprised one freak works days? Does Floor 3.5's half-storey make sense?
- Act 5, **the flip:** their first reaction on Mind Your Head, the time to their first deliberate flip, whether they say "upside down", and whether they find the flip-as-brake on Falling Up.
- The finale: do they recognise one room per act?
- Pacing: note where they slow down, sigh or speed up.

**After:** the form (§4), plus:
11. What happened when the night turned upside down?
12. Which act was the best? Which went on too long?
13. Keyboard or gamepad? Did you change any controls?

**Log:** the §5 block, plus:
```
5-second test (per shot: worker / exit / hazard / creature / day-night, each found, wrong or missed):
Time per act:
Flip: first reaction; time to the first deliberate flip:
```

**What it decides:**
- **The flip:** if two of three testers still can't use it on purpose by Falling Up, rework Mind Your Head's teaching beat before polish.
- **Pacing:** an act every tester calls too long loses or shortens its weakest level (CONTENT.md tiers).
- **Readability:** the 5-second misses feed §6.

