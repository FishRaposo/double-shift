# Audio Spec

Companion to [GDD.md](GDD.md) §11. All audio is synthesized with WebAudio in `src/audio.js`. No audio files, no licensed music.

**At a glance**
- 25 sound effects are built (§2); the 16-bar theme ships in two synced arrangements that crossfade on every shift (§3).
- Every SFX is ≤ 0.25 s. The shift sound's pitch says where you went: down = night, up = day.
- Funny, not scary: yelps, giggles, a rubber stamp. `M` mutes.

## 1. Rules

- **Short.** Every SFX ≤ 0.25 s, so rapid shifting never stacks into noise.
- **Informative.** The shift sound's pitch direction tells you where you went (down = night, up = day).
- **Funny, not scary.** Yelps and giggles, never stingers or screams.
- **The freaks** (GDD §4.8, nature undefined): mischievous **giggles and scuttles**, plus a hint of **shimmer** when a prank does something impossible. Nothing that sounds like a specific animal; it's all synthesized.
- **One mix bus** (built 2026-11-02): music gain and SFX gain → master gain (0.55 × the Master setting) → DynamicsCompressor (−14 dB, 4:1) → speakers. Volumes come from Settings and are saved. `M` mutes. The AudioContext starts on the first key press or click (browser autoplay rules), and the music starts with it.
- **Every sound is data:** `SOUNDS` in `src/audio.js` maps each name to a list of voices (`voice()`: oscillator or noise, pitch sweep, optional filter sweep, vibrato). Tests check every SFX is ≤ 0.25 s and ≤ 0.35 volume. Play them all in the gallery's audio board (`/tools/gallery.html`).
- **Offline check:** `npm run media` renders every SFX and 8 bars of each music arrangement through an OfflineAudioContext and fails on a peak ≥ 1.0 (today the loudest is ≈ 0.4–0.6 before the master gain).

## 2. Sound effects (built)

The original 11, re-voiced 2026-11-02 with filters and a little noise so they sit together. Values below are the main voice; the full spec (all voices) is `SOUNDS` in `src/audio.js`. Levels were lowered slightly to make room for the music.

| Event | Sound | Values |
|---|---|---|
| Shift → night | Falling blip | triangle 880 → 330 Hz, 0.07 s, vol 0.32, plus a noise tick |
| Shift → day | Rising blip | triangle 330 → 880 Hz, 0.07 s, vol 0.32, plus a noise tick |
| Shift rejected | Dull thud | square 120 → 90 Hz, 0.06 s, vol 0.16 |
| Jump | Hop | square 260 → 520 Hz, 0.07 s, vol 0.09 |
| Land | Soft thump | sine 140 → 70 Hz, 0.05 s, vol 0.18, plus low noise |
| Death (hazard/fall) | Slide down | sawtooth 400 → 60 Hz, 0.25 s, vol 0.18 |
| **Spooked** (freak) | Two-part yelp | square 500 → 1400 Hz 0.12 s, then 1300 → 600 Hz 0.1 s, vol 0.17/0.14 |
| **Prank fired** | Giggle | 4 triangle blips alternating 900/1080 → 700 Hz, 0.05 s each, 70 ms apart, vol 0.13 |
| Checkpoint | Two-note chime | triangle 523 Hz 0.07 s, then 784 Hz 0.1 s, vol 0.22, plus a high sine glint |
| Win | Arpeggio | triangle 523, 659, 784, 1047 Hz, 0.12 s each, 80 ms apart, vol 0.22 |
| Timecard stamp | Thunk | square 90 → 50 Hz, 0.09 s, vol 0.24, plus noise (450 ms after win) |

The 14 added since (same `SOUNDS` map, main voice only). The level-mechanic sounds were pre-built before their levels shipped:

| Event | Sound | Values |
|---|---|---|
| Prank shimmer | High sine sparkle | sine 1568–2637 Hz, 4 notes, vol 0.035 |
| Freeze on day shift | Filtered hush | noise, bandpass 1400 → 350 Hz, 0.08 s, vol 0.05 |
| Menu move / select | Tick / confirm blip | square 660 Hz (select sweeps to 990) |
| Act card sting | Two-part chord | triangle 392/494 → 523/659 Hz |
| Peeker pop (`peekerBoing`) | Boing, when a peeker pops out on your shift | sine 300 → 600 Hz, 0.05 s, vol 0.08 |
| Lurker footstep *(not wired, by decision)* | Soft scuff | noise, low-pass 300 Hz, 0.02 s. In `SOUNDS` but never played: a constant tick under the music clutters the mix (decided 2026-11-03). |
| Wet slide stop (`wetStop`) | Squeak | square 900 → 1300 Hz + vibrato, 0.08 s |
| Door steal (`doorThunk`, a prank's `sound`) | Thunk | sine 180 → 90 Hz + noise, 0.1 s (wired through the prank `sound` field; first used by `doors`) |
| Pillar move (`pillarScrape`, a prank's `sound`) | Scrape | sawtooth 70 → 55 Hz + noise, 0.22 s (wired through the prank `sound` field; first used by `pillar`) |
| Supervisor turn | Clipboard tick + whoosh | square 2 kHz tick, 0.02 s; noise bandpass 600 → 300 Hz, 0.1 s |
| Shift in an offset level | Rumble | sine 55 → 45 Hz + noise, 0.25 s |
| Day-walker spook | Giggle | 4 triangle blips 1100–1300 → 900 Hz, 60 ms apart |

## 3. Music (built 2026-11-02, `src/music.js`)

As built: **110 BPM, 16 bars of 8 eighth-note steps (≈ 35 s loop)**, progression C · Am · F · G · C · Am · F G · C · F · C · Dm · G · C · Am · F G · C. The melody is note data (`MELODY`), tested for range and length.
- **Day:** square lead through a 2.6 kHz low-pass; square root-fifth bass (low-pass 700 Hz); a soft sine kick on beats 1 and 3; noise hats on the off-eighths.
- **Night:** the same melody in the **minor mode** (E → E♭, A → A♭; B stays natural, so it's harmonic minor and a bit spooky) on a **theremin** (sine, 6 Hz vibrato, 70 ms glide from the previous note); a triangle **walking bass** (root, third, fifth, chromatic approach); **organ stabs** (three squares) on the "and" of 2 and 4.
- Both arrangements are scheduled together (25 ms timer, ~120 ms look-ahead) into two gains; every shift crossfades them in 50 ms, so the tune never restarts. Menus play the day arrangement at 60%.

The original plan, kept for reference:

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

Same loop, one added part per act so the game builds without new songs: act 2 adds a quiet low pulse on night; act 3 adds a muted second lead line; act 4 swaps the night organ stabs for faster ones; act 5 adds the melody turned upside down (inverted around its first note) as a night counter-melody; the finale plays every layer. *(Planned: Fish approved the stretch features on Nov 3; BUILD.md T24 has the values.)*

## 4. More SFX (built 2026-11-02)

| Event | Idea |
|---|---|
| Peeker pops out ✅ | Tiny "boing" (sine 300 → 600 Hz, 0.05 s) on the rules' `peek` event: a peeker's hidden → out edge while you're on its shift |
| Lurker footsteps *(not wired)* | Very quiet ticks while you're on night. Decided against on 2026-11-03: it clutters the mix. |
| Freaks freeze (shift to day) | Optional "record scratch" micro-sound layered under the shift blip |
| Prank shimmer | Layered under the giggle when a prank fires: 3–4 quick sine pings, high (~1.5–2.5 kHz), very quiet. The "how did they do that?" half of the joke. |
| Peeker hands | A tiny scratch (filtered noise, 0.03 s) when a peeker grips the ledge |
| Wet floor slide | Squeak on hard stop |
| Menu move / select | Soft clicks |

### 4.1 SFX for the new levels *(built 2026-11-02; all wired. Door and pillar sounds play through a prank's `sound` field and are first heard in `doors` and `pillar`)*

Same `tone()` format as §2; every sound ≤ 0.25 s.

| Event | Level | Sound | Values (starting point) |
|---|---|---|---|
| Wet-floor squeak (hard stop on `~`) | `wet` | Rubbery squeak | square 900 → 1300 Hz, 0.08 s, vol 0.06, 6 Hz wobble, 3 kHz low-pass |
| Door-steal thunk (layered on the prank giggle) | `doors` | Wooden thunk | sine 180 → 90 Hz, 0.1 s, vol 0.22, plus low noise |
| Pillar scrape | `pillar` | Stone scrape | sawtooth 70 → 55 Hz, 0.22 s, vol 0.1, plus band-passed noise (only on a prank, never per tick) |
| Supervisor clipboard tick | `supervisor` | Pen tick | square 2000 Hz, 0.02 s, vol 0.04, every turn |
| Supervisor turn whoosh | `supervisor` | Short whoosh | noise, band-pass 600 → 300 Hz, 0.1 s, vol 0.05 |
| Offset rumble (every shift in `offset`) | `offset` | Low rumble | sine 55 → 45 Hz, 0.25 s, vol 0.2, plus low-passed noise |
| Day-walker giggle (by day) | `daywalker` | Giggle, pitched up | 4 triangle blips 1100/1300 → 900 Hz, 0.05 s each, 60 ms apart, vol 0.11 |
| Act-card sting | act cards | Two-chord sting | triangle 392 + 494 Hz, then 523 + 659 Hz, 0.12 s each |
| Gravity flip (`flip`, every shift in an Upside Down level, under the shift sound) | act 5 | A falling whoomp | sine 300 → 120 Hz, 0.12 s, vol 0.12 |

## 5. Mixing checklist

**Measured 2026-11-03** (offline render in the gallery's `__audioCheck`, before the master gain, which `npm run media` fails on at ≥ 1): the loudest sound effects are `shiftNight` 0.31, `shiftDay` 0.28, `checkpoint` 0.27, `stamp` 0.22 and `win` 0.22; the music peaks at 0.35–0.48 (day) and 0.38 (night); the day peak moves between runs because each hi-hat starts at a random point in the noise buffer (`src/music.js`). Everything is below 0.8, so nothing needed fixing; the compressor and the 0.55 master headroom handle stacking. Listening (headphones and laptop speakers) is Fish's check.

- [ ] Shift 10× per second for 3 s: still pleasant, no clipping.
- [ ] Spook + death tint + giggle at once: still readable.
- [ ] Music under SFX: shift blip always audible over the night organ.
- [ ] Mute works on every screen.
- [x] Settings volumes persist (`createSettings`, `src/save.js`).
