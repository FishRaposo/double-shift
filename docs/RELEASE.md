# Release Plan

Companion to [GDD.md](GDD.md) §1.8 and §16.4–16.5. Deadline **Dec 1, 2026, 13:37 PST = 18:37 BRT**. Target: submitted **Nov 30**.

**At a glance**
- Every jam rule is met or has a step below (§0). AI use is allowed; disclose it when submitting.
- Submit on itch by **Nov 30** (deadline Dec 1, 13:37 PST); the repo URL goes in the form.
- After Dec 1: critical fixes only, each with a note. Aim for 25+ ratings by rating 30+ entries (§6).

## 0. Jam rules (from the [host's FAQ](https://itch.io/jam/game-off-2026/topic/7290154/frequently-asked-questions-faq), read 2026-11-02)

| Rule | What it means for us | Status |
|---|---|---|
| Start the game during the jam (Nov 1, 13:37 PST); templates and libraries are fine, the bulk of the work happens in November | All design, code and docs were made from Nov 1 after the theme announcement. The README states the timeline. If anything was prepared earlier, the host asks you to say so openly. | Met |
| Public GitHub repo with the source (any license) | [FishRaposo/double-shift](https://github.com/FishRaposo/double-shift), MIT | Met |
| Any tools; **AI is allowed** but must be disclosed when submitting. Using AI doesn't disqualify a game. | Disclose on the submission form, in the itch AI Disclosure, and in the README, using the same words everywhere (§2) | At submission |
| Submit on itch.io before the deadline; pushing to GitHub doesn't enter the game | The submission form asks for the repo URL | At submission |
| Free to play is recommended | $0 or donate | Planned |
| Updates allowed during the submission period. **Once voting starts, only critical bug fixes, each with a note explaining what changed** | Content freeze Nov 22 (PRODUCTION.md §2); see §6 | — |
| Only participants with a submitted game, and their teammates, can rate. Six rated categories: **Overall, Gameplay, Graphics, Audio, Innovation, Theme interpretation**. Code quality is not judged. | See GDD §1.8 for how each category is earned | — |
| Content: itch rules only; adult/graphic content is less likely to be featured by GitHub | Mock horror, no gore (GDD §10.5) | Met |
| Voting ends **Jan 1, 2027, 13:37 PST**; winners featured on the GitHub Blog and socials. No prizes. | — | — |

Hashtag: **#GitHubGameOff**. Community: the jam's itch community and its community-run Discord.

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
- [x] *(P1)* GitHub Pages from `main` (root) as a secondary play link: <https://fishraposo.github.io/double-shift/> (`.nojekyll` at the root; it rebuilds on every push to `main`). Also set as the repo homepage.
- [ ] README play line: itch link first, Pages second (Pages line is in; add itch at submission).
- [ ] Push before 13:37 PST Dec 1, and again after any final fix.

## 2. itch.io page settings

**Paste-ready kit: [itch/page.md](../itch/page.md)** (every field in dashboard order, media list, description). `npm run zip` builds the upload and `npm run media` renders the cover and screenshots. The zip was tested on 2026-11-02 inside a 960×540 iframe: one click starts the game, and keys reach it after that click.

| Setting | Value |
|---|---|
| Title | **Double Shift: The Freaks Come Out at Night** (the subtitle helps title search; confirm final, PRODUCTION.md §5) |
| Kind of project | HTML; "This file will be played in the browser" |
| Upload | `double-shift-web.zip` from `npm run zip` (index.html + src/ at the root) |
| Viewport | 960 × 540; Fullscreen button on; Autostart off (there's a title screen); scrollbars off |
| Mobile friendly | **Off** (keyboard or gamepad, no touch controls) |
| Release status | Released |
| Pricing | **$0 or donate**, small suggested donation |
| Platforms | HTML5 only |
| Genre | Platformer (puzzle elements described in tags/description, not repeated as genre) |
| Languages | English only |
| Accessibility | Tick only what exists. The build has a **reduced effects** setting (no screen flashes, rings, sparkles, shaking or flicker) and adjustable music/sound volume; tick itch's matching options if offered (e.g. reduced motion / flashing). The four actions can be **rebound** (SETTINGS > CONTROLS). No colour-blind mode yet. |
| Community | Comments |
| Theme | Background `#0b1029`, text `#d9f6ff`, links `#5ff2ff`; embed background `#0b1029` (ART.md §8) |
| Visibility | Draft → play it on the page once → **Public** (the publish date is fixed at that click) |
| Jam submission form | Repo URL `https://github.com/FishRaposo/double-shift`; AI-use disclosure in the same words as below |

### Tags (verify each tag page on itch before adding; tags feed browse, not title search)
Candidates: `Puzzle-Platformer`, `2D`, `Short`, `Singleplayer`, `Funny`, `Monsters`, `Minimalist`, `game-off-2026` *(check the jam's own tag convention)*.
Rules: no synonyms, no engine/tool tags, no repeating the genre or platform, no tags for the title.

### AI Disclosure
- **Yes, the project contains generative AI output: Code, and Text & Dialog.** (The code was written with AI assistance to Fish's design; in-game text was drafted with AI assistance. Update this line if Fish rewrites all the copy himself.)
- Graphics: **unticked** (drawn by code, no image model). Sound: **unticked** (synthesized by code, no audio model). The code that draws the art and plays the music was written with AI assistance: the page says so in "How it was made".
- Itch adds the tag itself; never add an AI tag by hand.
- The jam also asks you to disclose AI use in the submission; say the same thing in the page's "How it was made".

### Media (ART.md §8)
- [x] Cover 1260×1000: `npm run media` → `media/cover.png` (drawn by `tools/cover.html`; act 5's hanging lurker added Nov 3)
- [x] Screenshots: `npm run media` → 20 shots in `media/` (`01`–`21`; `11` is the asset gallery), led by a prank as it lands, the flip and a repair; upload order in itch/page.md §3
- [ ] Demo GIF: `npm run gif -- <id>` → `media/demo-<id>.gif` (ART.md §8 has the candidates); upload it first in the screenshot list

## 3. Getting indexed

Publishing ≠ indexing. After going Public, check in ~1 hour by searching the **full title** on itch.
- [ ] Public, not "unlisted in search & browse", downloads not disabled
- [ ] Cover uploaded, playable file uploaded
- [ ] Not NSFW
- [ ] New pages with donations may sit in a review queue for a few days. The URL still works; share it. Never delete/recreate the page to "fix" indexing.

## 4. Page description

Lives in [itch/page.md](../itch/page.md) §4 (a draft; Fish writes the final words).

## 5. Submission day checklist (Nov 30)

- [ ] `npm test` and `npm run check` green; CI green on the final commit. *(Green on the Nov 3 release candidate; run again on the final commit.)*
- [ ] `npm run zip`; unzip into an empty folder, serve it, play level 1 and the last level. *(The automated half: `npm run media -- <outdir> --root <folder>` clears level 1 with real keys from the unzipped build and opens later levels from it; clean on Nov 3. Playing the last level stays a hand check.)*
- [ ] **First 60 seconds** (raters play dozens of entries; `npm run media` checks the one keypress from the title to playing, the rest is by hand): from the itch embed, one keypress gets from the title screen to playing; sound starts after the first input and isn't too loud; level 1 teaches the shift without reading; fullscreen works; level select reaches the freak levels.
- [ ] Upload to itch, play the full game **from the itch page** in a fresh browser profile (Chrome + Firefox).
- [ ] Page: description checked against the build, media, tags, AI disclosure, theme.
- [ ] Public; title search check scheduled for +1 h.
- [ ] Submit to the Game Off 2026 jam; fill the repo link and AI-use disclosure fields.
- [ ] README updated with the itch link; push.
- [ ] Devlog #1 on itch: what it is, how it was made, one GIF.
- [ ] X post drafts (Fish writes and posts; game link in the first reply).

## 6. After submission

- Voting runs until **Jan 1, 2027, 13:37 PST**.
- **Build freeze:** from Dec 1 13:37 PST until voting ends, upload only critical bug fixes, and post a note on the page (and a devlog) saying exactly what changed. No new levels, art or balance changes.
- **The number of ratings matters.** Itch lowers the score of entries rated fewer times than the jam's median: `score × √(ratings ÷ median)`. In Game Off 2025 there were 709 entries, the median was 16 ratings, and the top entries had 16–60. **Goal: at least 25 ratings.**
- **Ratings plan.** Only entrants can rate, and people mostly find games through the rate queue and through who has played theirs.
  - Rate 30+ entries in the first week of voting, each with a specific comment (what worked, one suggestion).
  - Reply to every comment on our page.
  - Post once in the jam community with the GIF.
  - Share the itch link on X and LinkedIn with #GitHubGameOff (Fish writes the posts).
  - Never trade ratings or ask for high scores; just ask people to play.
- Post-jam: devlog #2 with results and what's next; task pack (PRODUCTION.md R7); decide whether *Double Shift* grows.
- Sync every public surface (README, site, profile) per the gamedev checklist, with identical counts and claims.
