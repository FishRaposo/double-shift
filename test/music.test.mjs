// The theme's note data: whole bars, both arrangements the same length, notes in range, night = minor mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MELODY, HALF_BAR_CHORDS, LOOP_STEPS, STEPS_PER_BAR, BARS, bassNote, chordNotes, minorize, LOOP_SECONDS, BPM, layersFor, INVERTED, thirdAbove } from '../src/music.js';
import { SOUNDS } from '../src/audio.js';

test('the loop is whole bars, and day and night share one timeline', () => {
  assert.equal(MELODY.length, BARS * STEPS_PER_BAR);
  assert.equal(LOOP_STEPS, MELODY.length);
  assert.equal(HALF_BAR_CHORDS.length, BARS * 2);
  assert.ok(Math.abs(LOOP_SECONDS - (BARS * 4 * 60) / BPM) < 1e-9, 'loop length = bars × 4 beats at the tempo');
  assert.equal(typeof MELODY[0], 'number', 'the loop starts on a note');
});

test('every note is in a playable range, for both arrangements', () => {
  for (const n of MELODY) if (typeof n === 'number') assert.ok(n >= 60 && n <= 96, `melody ${n}`);
  for (let beat = 0; beat < BARS * 4; beat++) {
    for (const night of [false, true]) {
      const b = bassNote(beat, night);
      assert.ok(b >= 30 && b <= 60, `bass ${b} at beat ${beat}`);
    }
  }
  for (let h = 0; h < BARS * 2; h++) for (const n of chordNotes(h)) assert.ok(n >= 60 && n <= 72);
});

test('night is the same melody in the minor mode: only E and A move, down a semitone', () => {
  for (const n of MELODY) {
    if (typeof n !== 'number') continue;
    const m = minorize(n);
    const pc = n % 12;
    assert.equal(m, pc === 4 || pc === 9 ? n - 1 : n);
  }
});

test('every sound effect is short (≤ 0.25 s plus delay) and not too loud', () => {
  for (const [name, voices] of Object.entries(SOUNDS)) {
    assert.ok(voices.length > 0, name);
    for (const v of voices) {
      assert.ok((v.dur ?? 0.08) <= 0.25, `${name}: ${v.dur}s`);
      assert.ok((v.vol ?? 0.3) <= 0.35, `${name}: vol ${v.vol}`);
    }
  }
});

test('music: layers accumulate by act; the finale has all', () => {
  const KEYS = ['pulse', 'lead2', 'fastStabs', 'inverted'];
  assert.deepEqual(layersFor(1), { pulse: false, lead2: false, fastStabs: false, inverted: false }, 'act 1 is the bare theme');
  for (let act = 2; act <= 5; act++) {
    const before = KEYS.filter((k) => layersFor(act - 1)[k]);
    const now = KEYS.filter((k) => layersFor(act)[k]);
    assert.deepEqual(now.slice(0, before.length), before, `act ${act} keeps what act ${act - 1} had`);
    assert.equal(now.length, before.length + 1, `act ${act} adds one layer`);
  }
  assert.deepEqual(KEYS.map((k) => layersFor(6)[k]), [true, true, true, true], 'the finale plays everything');
});

test('music: the inverted melody stays within MIDI 36-96 and keeps the melody\'s rhythm', () => {
  assert.equal(INVERTED.length, MELODY.length);
  INVERTED.forEach((n, i) => {
    if (typeof n === 'number') assert.ok(n >= 36 && n <= 96, `step ${i}: ${n}`);
    else assert.equal(n, MELODY[i], `step ${i}: holds and rests line up`);
  });
  assert.equal(INVERTED[0], MELODY[0], 'mirrored around the first note');
});

test('music: the second lead is a diatonic third above the melody', () => {
  const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
  for (const n of MELODY) {
    if (typeof n !== 'number') continue;
    const t = thirdAbove(n);
    assert.ok([3, 4].includes(t - n) && C_MAJOR.includes(t % 12), `${n} -> ${t}`);
  }
});
