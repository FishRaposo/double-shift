# Double Shift — Documentation Index

Everything needed to finish, ship and maintain *Double Shift* for GitHub Game Off 2026 (theme: SHIFT).

**Start here:** the GDD's [At a Glance](GDD.md#at-a-glance) for the game, [CONTENT.md](CONTENT.md) for everything in the full game, [PRODUCTION.md](PRODUCTION.md) for what's next, [DESIGN.md](DESIGN.md) for the one-page story, [BUILD.md](BUILD.md) to build what's left. Every doc opens with its own **At a glance** box.

| Doc | What it's for | Read when |
|---|---|---|
| [GDD.md](GDD.md) | The design: what the game is and why. Source of truth for rules (S-01…S-08), the freaks, tone, level plan. | Any design question |
| [CONTENT.md](CONTENT.md) | The manifest: every level, system, asset, sound and text item in the full game, with tiers, cut dates and status. | Asking "what's in the game?" or "is X planned?" |
| [BUILD.md](BUILD.md) | Guide for agents: the working protocol, recipes for new levels, rules and assets, and the record of how each part was built. | Changing or adding anything |
| [PRODUCTION.md](PRODUCTION.md) | Schedule to the deadline, milestones, the full backlog with priorities and cut lines. | Planning the day / week |
| [DESIGN.md](DESIGN.md) | One-page write-up: the constraint, the key decisions, the numbers, what would change, a sixty-second pitch. | Explaining the project (portfolio, interviews, devlogs) |
| [TECH.md](TECH.md) | Architecture, state shape, rules API, tuning values, how to add a level/prank/freak, testing, debug, build. | Writing code |
| [LEVELS.md](LEVELS.md) | Level design guide: movement metrics, authoring format, per-level specs (built and planned), checklist. | Designing or changing a level |
| [ART.md](ART.md) | Art bible: palettes, readability rules, every on-screen element, sizes, effects, cover/screenshot specs. | Drawing anything |
| [AUDIO.md](AUDIO.md) | Every sound with its synthesis values, music plan, mixing rules. | Making or changing sound |
| [WRITING.md](WRITING.md) | Copy deck: level notes, memos, sticky notes, spook lines, timecard comments, UI text. Drafts for Fish to edit. | Writing any in-game text |
| [PLAYTEST.md](PLAYTEST.md) | How to run a playtest, what to watch for, the feedback form, the log. | Before and after every playtest |
| [../itch/page.md](../itch/page.md) | The itch.io page, paste-ready: every dashboard field, media order, description draft. | Creating or updating the itch page |
| [RELEASE.md](RELEASE.md) | Jam rules (§0), GitHub repo, itch.io page settings, AI disclosure, tags, media, the jam submission checklist, post-jam. | Weeks 3–4 and submission day |

**Rules for these docs**

- The GDD decides *what*; the other docs decide *how*. If they disagree, the GDD wins and the other doc gets fixed.
- Every number in a doc (tuning values, sizes, test counts, pars) must match the code on the day it's written. When code changes, update the doc in the same commit. Test, level and source-line counts are wrapped in markers that `npm run counts -- --write` keeps in sync (CI checks them).
- Mark anything not yet built as *(planned)* or *(stretch)*. Never describe a planned feature as existing, especially on the itch page.

Deadline: **December 1, 2026, 13:37 PST = 18:37 in São Paulo.** Internal target: submitted by **November 30**.
