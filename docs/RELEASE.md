# Release Plan

Companion to [GDD.md](GDD.md) §16.4–16.5. Jam rules: public GitHub repo with the source, playable game submitted on itch.io, AI use disclosed. Deadline **Dec 1, 2026, 13:37 PST = 18:37 BRT**. Target: submitted **Nov 30**.

## 1. GitHub repository (do this in week 1)

```sh
cd C:\Projects\double-shift
git init -b main
git add .
git commit -m "Double Shift prototype: 6 levels, pranks, freaks, GDD v0.3"
gh repo create double-shift --public --source . --push --description "Double Shift — a day/night puzzle-platformer for GitHub Game Off 2026 (theme: SHIFT)"
```

Then:
- [x] Add `.github/workflows/ci.yml` (TECH.md §8), push, confirm CI is green.
- [x] Repo topics: `game-off`, `game-off-2026`, `javascript`, `html5-game`, `puzzle-platformer`.
- [ ] *(P1)* GitHub Pages from `main` (root) as a secondary play link.
- [ ] README play line: itch link first, Pages second, once they exist.
- [ ] Push before 13:37 PST Dec 1, and again after any final fix.

## 2. itch.io page settings

| Setting | Value |
|---|---|
| Title | **Double Shift: The Freaks Come Out at Night** (the subtitle helps title search; confirm final, PRODUCTION.md §5) |
| Kind of project | HTML; "This file will be played in the browser" |
| Upload | `double-shift-web.zip` from `npm run zip` (index.html + src/ at the root) |
| Viewport | 960 × 540; Fullscreen button on; Autostart off (there's a title screen); scrollbars off |
| Mobile friendly | **Off** (keyboard only) |
| Release status | Released |
| Pricing | **$0 or donate**, small suggested donation |
| Platforms | HTML5 only |
| Genre | Platformer (puzzle elements described in tags/description, not repeated as genre) |
| Languages | English only |
| Accessibility | Tick only what exists. Currently: none of the itch options (no rebinding yet, no colour-blind mode, no reduced-flash toggle yet). Revisit if A6/G12 ship. |
| Community | Comments |
| Theme | Background `#0b1029`, text `#d9f6ff`, links `#5ff2ff`; embed background `#0b1029` (ART.md §8) |
| Visibility | Draft → play it on the page once → **Public** (the publish date is fixed at that click) |

### Tags (verify each tag page on itch before adding; tags feed browse, not title search)
Candidates: `Puzzle-Platformer`, `2D`, `Short`, `Singleplayer`, `Funny`, `Monsters`, `Minimalist`, `game-off-2026` *(check the jam's own tag convention)*.
Rules: no synonyms, no engine/tool tags, no repeating the genre or platform, no tags for the title.

### AI Disclosure
- **Yes, the project contains generative AI output: Code, and Text & Dialog.** (The code was written with AI assistance to Fish's design; in-game text was drafted with AI assistance. Update this line if Fish rewrites all the copy himself.)
- Graphics: **unticked** (drawn by code, no image model). Sound: **unticked** (synthesized by code, no audio model). If a design partner's art includes generated images, tick Graphics.
- Itch adds the tag itself; never add an AI tag by hand.
- The jam also asks you to disclose AI use in the submission; say the same thing in the page's "How it was made".

### Media (ART.md §8)
- [ ] Cover 1260×1000
- [ ] Demo GIF first, then 3–5 screenshots (day/night pair, prank tell, Night Watch, timecard)

## 3. Getting indexed

Publishing ≠ indexing. After going Public, check in ~1 hour by searching the **full title** on itch.
- [ ] Public, not "unlisted in search & browse", downloads not disabled
- [ ] Cover uploaded, playable file uploaded
- [ ] Not NSFW
- [ ] New pages with donations may sit in a review queue for a few days. The URL still works; share it. Never delete/recreate the page to "fix" indexing.

## 4. Page description (draft; Fish writes the final words)

> **One building. Two shifts. One worker.**
>
> You're covering a double shift, day and night, in the same building, at the same time. Press **Shift** to step between them, even mid-jump. The day crew's scaffolding catches you; the night's gate isn't down yet.
>
> And every time you clock into the night shift, the freaks have moved something.
>
> Nobody knows what the freaks are. They giggle. They leave notes. They only move at night, so when you step into the day shift, they freeze mid-stride.
>
> Finish each level clocking in as few times as possible.
>
> | | Keyboard |
> |---|---|
> | Move | A/D or ←/→ |
> | Jump | Space, W or ↑ (hold for higher) |
> | Change shift | Shift or K |
> | Restart | R |
> | Pause | Esc |
> | Mute | M |
>
> *On Windows, hammering Shift can open Sticky Keys. Use K, or turn off the Sticky Keys shortcut.*
>
> **How it was made**
> Designed by Vinícius Raposo for GitHub Game Off 2026 (theme: SHIFT). Built with AI assistance (Claude) to his design document, then tested like production software: the gameplay rules are a pure module with [N] automated tests, and every level is proven solvable at par by a scripted run. No engine, no assets: everything you see and hear is drawn and synthesized by code. Source: [GitHub link].
>
> **Credits**: [design partner, as they choose to be credited, if involved]
>
> If you enjoyed it, a follow or a small donation helps.

**Before publishing, check every line against the build:** controls, level count, test count (`npm test`), any feature mentioned must exist (no planned features on the page).

## 5. Submission day checklist (Nov 30)

- [ ] `npm test` and `npm run check` green; CI green on the final commit.
- [ ] `npm run zip`; unzip into an empty folder, serve it, play level 1 and the last level.
- [ ] Upload to itch, play the full game **from the itch page** in a fresh browser profile (Chrome + Firefox).
- [ ] Page: description checked against the build, media, tags, AI disclosure, theme.
- [ ] Public; title search check scheduled for +1 h.
- [ ] Submit to the Game Off 2026 jam; fill the repo link and AI-use disclosure fields.
- [ ] README updated with the itch link; push.
- [ ] Devlog #1 on itch: what it is, how it was made, one GIF.
- [ ] X post drafts (Fish writes and posts; game link in the first reply).

## 6. After submission

- Voting runs until **Jan 1, 2027, 13:37 PST**. Play and rate other entries; comment thoughtfully (it's also how people find yours).
- Respond to comments on the page.
- No content changes to the jam build during voting beyond what the jam rules allow; check the jam page before uploading fixes.
- Post-jam: devlog #2 with results and what's next; task pack (PRODUCTION.md R7); decide whether *Double Shift* grows (acts 3 stretch items, gamepad, rebinding).
- Sync every public surface (README, site, profile) per the gamedev checklist, with identical counts and claims.
