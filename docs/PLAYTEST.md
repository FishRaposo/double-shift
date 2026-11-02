# Playtest Plan

Companion to [GDD.md](GDD.md) §19. Playtests answer questions the tests can't: is it fun, is it readable, is it fair.

## 1. Schedule

| Round | When | Build | Who | Focus |
|---|---|---|---|---|
| 0 | Nov 2–3 | Levels 1–6 | Fish | Feel, Sticky Keys, tuning |
| 1 | by Nov 8 (M1) | Levels 1–6 | 1–2 people who haven't seen it | Do they get Shift, echoes, freezing, pranks without help? |
| 2 | by Nov 22 (M3) | Full run | 2–3 new people | Pacing, difficulty curve, jokes landing |
| 3 | Nov 26 (M4) | itch draft page | 1 person, their own machine | Loads, runs, controls, nothing broken |

Jam communities (the Game Off itch community, Discord) are a source of cold testers. Trade plays with other entrants.

## 2. How to run one

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
- Level 5: do they **notice the tell** (eyes/MINE) before the prank? Do they understand the plank moved *because they clocked in*?
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
