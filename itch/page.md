# itch.io page kit

Everything needed to create the *Double Shift* page on itch.io, in the order the itch dashboard asks for it. Settings come from [RELEASE.md](../docs/RELEASE.md) §2. **Fish writes the final description words**; the draft below is checked against the current build (<!-- n:levels -->21<!-- /n --> levels, <!-- n:tests -->347<!-- /n --> tests, level select, pixel art and music). The paste-ready description in §4 carries no markers, so check its numbers by hand before pasting (the release refresh does).

## 1. Build the files

```bash
npm run zip      # double-shift-web.zip: index.html + src/ at the archive root
npm run media    # media/cover.png (1260×1000) + 19 screenshots (960×540) + the asset gallery, via headless Edge/Chrome
npm run gif -- doors      # media/demo-doors.gif (480×270): Lost & Found's scripted run, a prank on every clock-in
```

`npm run media` also plays level 1 with real keys at full speed and fails if it can't be cleared or the page logs an error. Smoke-test the upload itself: unzip `double-shift-web.zip` into an empty folder and run `npm run media -- <outdir> --root <that folder>`.

## 2. Create the project (itch.io → Dashboard → Create new project)

| Field | Value |
|---|---|
| Title | `Double Shift: The Freaks Come Out at Night` *(subtitle provisional; it helps title search)* |
| Project URL | `fishraposo.itch.io/double-shift` |
| Short description | `Every time you clock into the night shift, the freaks move something.` |
| Classification | Games |
| Kind of project | **HTML** |
| Release status | Released *(or In development while still building)* |
| Pricing | **$0 or donate**, suggested donation small (jam host recommends free) |
| Uploads | `double-shift-web.zip` → tick **This file will be played in the browser** |
| Embed options | Viewport **960 × 540**; **Fullscreen button** on; **Mobile friendly** off (keyboard or gamepad, no touch controls); **Automatically start on page load** off (there's a title screen; the first click starts the game); Enable scrollbars off |
| Details: Genre | Platformer |
| Tags | `puzzle-platformer`, `2D`, `Short`, `Singleplayer`, `Funny`, `Monsters`, `Minimalist`, `game-off-2026` *(check each tag page first, RELEASE.md §2)* |
| AI generation disclosure | **Yes**: Code, Text & Dialog. Graphics and Sound **no** (drawn and synthesized by code). |
| Custom noun | leave empty |
| Community | Comments |
| Visibility | **Draft** first. Play it on the page once, then Public at submission time (the publish date is fixed at that click). |

**Metadata tab:** Inputs: Keyboard, Gamepad. Languages: English. Accessibility: none ticked yet (nothing from itch's list exists in the build).

**Theme (Edit theme on the page):** background `#0b1029`, text `#d9f6ff`, links `#5ff2ff`, embed background `#0b1029`.

## 3. Media

| Slot | File |
|---|---|
| Cover image | `media/cover.png` |
| Screenshots (in this order) | `demo-doors.gif` (the GIF goes first: itch plays a GIF screenshot in place), `19-prank-inventory.png` (a prank as it lands), `20-flip-mind-your-head.png` (the flip), `15-clock-out-night.png`, `07-night-watch-night.png`, `08-night-watch-day.png` (the freaks frozen by day), `03-clock-in-night.png`, `04-timecard.png`, `09-level-select.png`, `01-title.png` |
| Gameplay video or trailer | Leave empty: the field takes a YouTube or Vimeo link, and the GIF already leads the screenshots. Other GIF candidates: `npm run gif -- upside` (the flip), `inventory` (the plank prank), `watch` (frozen freaks); ART.md §8. |

## 4. Description (paste into the editor; Fish edits the words)

> **Every time you clock into the night shift, the freaks move something.**
>
> You're covering a double shift, day and night, in the same building, at the same time. Press **Shift** to step between them, even mid-jump. The day crew's scaffolding catches you; the night's gate isn't down yet.
>
> But clocking in has a cost. Clock into the night a second time and the plank you crossed on is gone, moved over the next pit. Nobody knows what the freaks are. They giggle. They leave notes. And they only move at night, so step into the day shift and they freeze mid-stride. (Well. Most of them.)
>
> Finish each level clocking in as few times as possible. Your timecard is watching.
>
> **Controls**
>
> | Action | Keyboard | Gamepad |
> |---|---|---|
> | Move | A / D or ← / → | Stick or d-pad |
> | Jump | Space, W or ↑ (hold for higher) | A |
> | Change shift | Shift or K | B, X or RB |
> | Restart level | R | Back |
> | Pause | Esc | Start |
> | Level select | L, or click LEVEL SELECT on the title | X |
> | Settings | O: volumes, reduced effects, speedrun timer, controls | Y |
> | Mute | M | |
>
> Move, jump and change shift can be rebound in SETTINGS > CONTROLS.
>
> *On Windows, hammering Shift can open Sticky Keys. Use K, or turn off the Sticky Keys shortcut.*
>
> **What's in this build:** 21 levels in five acts and a finale, from your first clock-in to the last, including an act where the night shift is upside down. Gamepad support, rebindable controls and a speedrun timer. Made for GitHub Game Off 2026 (theme: SHIFT).
>
> **How it was made**
> Designed by Vinícius Raposo for GitHub Game Off 2026. Built with AI assistance (Claude) to his design document, then tested like production software: the gameplay rules are a pure module, the game has 347 automated tests, and every level is proven solvable at par by a scripted run. No engine, no assets: the pixel art, the pixel font and the music are all drawn and synthesized by code. Source: https://github.com/FishRaposo/double-shift
>
> If you enjoyed it, a follow or a small donation helps.

**Before saving, check against the build:** level count, test count (`npm test`), controls, and that nothing planned is described as existing.

## 5. After the page exists

- Play it from the page in a fresh browser profile (Chrome + Firefox): click, clock in, finish level 1, try fullscreen.
- Add the itch link to the README play line (itch first, Pages second) and to RELEASE.md §1.
- At submission (Nov 30): Public → submit to the jam with the repo URL and the AI disclosure (RELEASE.md §5).
- An hour after going Public, search the full title on itch to confirm it's indexed (RELEASE.md §3).
