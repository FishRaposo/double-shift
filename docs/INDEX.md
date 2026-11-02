# Double Shift — Documentation Index

Everything needed to finish, ship and maintain *Double Shift* for GitHub Game Off 2026 (theme: SHIFT).

| Doc | What it's for | Read when |
|---|---|---|
| [GDD.md](GDD.md) | The design: what the game is and why. Source of truth for rules (S-01…S-08), the freaks, tone, level plan. | Any design question |
| [PRODUCTION.md](PRODUCTION.md) | Schedule to the deadline, milestones, the full backlog with priorities and cut lines. | Planning the day / week |
| [DESIGN.md](DESIGN.md) | One-page write-up: the constraint, the key decisions, the numbers, what would change, a sixty-second pitch. | Explaining the project (portfolio, interviews, devlogs) |
| [TECH.md](TECH.md) | Architecture, state shape, rules API, tuning values, how to add a level/prank/freak, testing, debug, build. | Writing code |
| [LEVELS.md](LEVELS.md) | Level design guide: movement metrics, authoring format, per-level specs (built and planned), checklist. | Designing or changing a level |
| [ART.md](ART.md) | Art bible: palettes, readability rules, every on-screen element, sizes, effects, cover/screenshot specs. | Drawing anything |
| [AUDIO.md](AUDIO.md) | Every sound with its synthesis values, music plan, mixing rules. | Making or changing sound |
| [WRITING.md](WRITING.md) | Copy deck: level notes, memos, sticky notes, spook lines, timecard comments, UI text. Drafts for Fish to edit. | Writing any in-game text |
| [PLAYTEST.md](PLAYTEST.md) | How to run a playtest, what to watch for, the feedback form, the log. | Before and after every playtest |
| [RELEASE.md](RELEASE.md) | Jam rules (§0), GitHub repo, itch.io page settings, AI disclosure, tags, media, the jam submission checklist, post-jam. | Weeks 3–4 and submission day |

**Rules for these docs**

- The GDD decides *what*; the other docs decide *how*. If they disagree, the GDD wins and the other doc gets fixed.
- Every number in a doc (tuning values, sizes, test counts, pars) must match the code on the day it's written. When code changes, update the doc in the same commit.
- Mark anything not yet built as *(planned)* or *(stretch)*. Never describe a planned feature as existing, especially on the itch page.

Deadline: **December 1, 2026, 13:37 PST = 18:37 in São Paulo.** Internal target: submitted by **November 30**.
