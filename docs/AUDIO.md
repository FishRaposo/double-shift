# Audio Spec

Companion to [GDD.md](GDD.md) §11. All audio is synthesized with WebAudio in `src/audio.js`. No audio files, no licensed music.

**At a glance**
- 11 sound effects are built (§2); music is planned and P0 (§3).
- Every SFX is ≤ 0.25 s. The shift sound's pitch says where you went: down = night, up = day.
- Funny, not scary: yelps, giggles, a rubber stamp. `M` mutes.

## 1. Rules

- **Short.** Every SFX ≤ 0.25 s, so rapid shifting never stacks into noise.
- **Informative.** The shift sound's pitch direction tells you where you went (down = night, up = day).
- **Funny, not scary.** Yelps and giggles, never stingers or screams.
- **The freaks** (GDD §4.8, nature undefined): mischievous **giggles and scuttles**, plus a hint of **shimmer** when a prank does something impossible. Nothing that sounds like a specific animal; it's all synthesized.
- **Master gain 0.35**; `M` mutes. The AudioContext starts on the first key press (browser autoplay rules).

## 2. Sound effects (built)

`tone({ type, f0 → f1 (exponential), dur, vol, delay })`

| Event | Sound | Values |
|---|---|---|
| Shift → night | Falling blip | triangle 880 → 330 Hz, 0.07 s, vol 0.35 |
| Shift → day | Rising blip | triangle 330 → 880 Hz, 0.07 s, vol 0.35 |
| Shift rejected | Dull thud | square 120 → 90 Hz, 0.06 s, vol 0.2 |
| Jump | Hop | square 260 → 420 Hz, 0.06 s, vol 0.12 |
| Land | Soft thump | sine 140 → 70 Hz, 0.05 s, vol 0.2 |
| Death (hazard/fall) | Slide down | sawtooth 400 → 60 Hz, 0.25 s, vol 0.25 |
| **Spooked** (freak) | Two-part yelp | square 500 → 1400 Hz 0.12 s, then 1300 → 600 Hz 0.1 s, vol 0.22/0.18 |
| **Prank fired** | Giggle | 4 triangle blips alternating 900/1080 → 700 Hz, 0.05 s each, 70 ms apart, vol 0.14 |
| Checkpoint | Two-note chime | triangle 523 Hz 0.07 s, then 784 Hz 0.1 s |
| Win | Arpeggio | triangle 523, 659, 784, 1047 Hz, 0.12 s each, 80 ms apart |
| Timecard stamp | Thunk | square 90 → 50 Hz, 0.09 s, vol 0.3 (450 ms after win) |

## 3. Music (planned, P0: A5)

**One theme, two arrangements**, running in sync so a shift never restarts the music.

| | Day arrangement | Night arrangement |
|---|---|---|
| Mood | Jaunty, workday, whistle-while-you-work | Spooky-goofy, same melody |
| Lead | Square/pulse lead, short notes | **Theremin**: sine with ~6 Hz vibrato, portamento between notes |
| Bass | Bouncy root-fifth | **Walking bass**, triangle |
| Color | Light hi-hat ticks (noise burst) | **Cheesy organ stabs** (stacked squares, short) on off-beats |
| Tempo | ~110 BPM, shared | same |

**Implementation sketch:**
- A tiny step sequencer in `audio.js`: a pattern of note numbers per track, scheduled ahead with `ctx.currentTime` (look-ahead ~100 ms, tick every 25 ms).
- Both arrangements play all the time into two gain nodes; on shift, crossfade in **≤ 60 ms** (day gain ↔ night gain). Music volume separate from SFX volume.
- Loop length 8–16 bars. Act 3 could add a layer (extra percussion) to the night arrangement.
- Music never delays gameplay work: ship SFX-only if it isn't ready by M2 + 3 days.

### 3.1 Per-act layers *(stretch)*

Same loop, one added part per act so the game builds without new songs: act 2 adds a quiet low pulse on night; act 3 adds a muted second lead line; act 4 swaps the night organ stabs for faster ones. Only if A5 ships with time to spare.

## 4. Planned SFX

| Event | Idea |
|---|---|
| Peeker pops out | Tiny "boing" (sine 300 → 600 Hz, 0.05 s), only when on screen and on night |
| Lurker footsteps | Very quiet ticks while you're on night (positional pan by x) |
| Freaks freeze (shift to day) | Optional "record scratch" micro-sound layered under the shift blip |
| Prank shimmer | Layered under the giggle when a prank fires: 3–4 quick sine pings, high (~1.5–2.5 kHz), very quiet. The "how did they do that?" half of the joke. |
| Peeker hands | A tiny scratch (filtered noise, 0.03 s) when a peeker grips the ledge |
| Wet floor slide | Squeak on hard stop |
| Menu move / select | Soft clicks |

### 4.1 SFX for the new levels *(planned)*

Same `tone()` format as §2; every sound ≤ 0.25 s.

| Event | Level | Sound | Values (starting point) |
|---|---|---|---|
| Wet-floor squeak (hard stop on `~`) | `wet` | Rubbery squeak | square 900 → 1300 Hz, 0.08 s, vol 0.1, with a 6 Hz wobble |
| Door-steal thunk (layered on the prank giggle) | `doors` | Wooden thunk | sine 180 → 90 Hz, 0.1 s, vol 0.25 |
| Pillar scrape | `pillar` | Stone scrape | sawtooth 70 → 55 Hz, 0.22 s, vol 0.15 (only on a prank, never per tick) |
| Supervisor clipboard tick | `supervisor` | Pen tick | square 2000 Hz, 0.02 s, vol 0.06, every turn |
| Supervisor turn whoosh | `supervisor` | Short whoosh | triangle 600 → 300 Hz, 0.1 s, vol 0.08 |
| Offset rumble (night entry in `offset`) | `offset` | Low rumble | sine 55 → 45 Hz, 0.25 s, vol 0.2 |
| Day-walker giggle (by day) | `daywalker` | Giggle, pitched up | 4 triangle blips 1100/1300 → 900 Hz, 0.05 s each, 60 ms apart, vol 0.12 |
| Act-card sting | act cards | Two-chord sting | triangle 392 + 494 Hz, then 523 + 659 Hz, 0.12 s each |

## 5. Mixing checklist

- [ ] Shift 10× per second for 3 s: still pleasant, no clipping.
- [ ] Spook + death tint + giggle at once: still readable.
- [ ] Music under SFX: shift blip always audible over the night organ.
- [ ] Mute works on every screen.
- [ ] Settings volumes (planned) persist with save data.
