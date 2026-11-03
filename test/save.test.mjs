// Progress saving and level-select unlocking. Storage is faked; the real one is localStorage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, isUnlocked, better, createSettings, DEFAULT_SETTINGS } from '../src/save.js';
import { LEVELS, ACTS } from '../src/levels.js';
import { DEFAULT_BINDS, rebind } from '../src/keys.js';

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), map: m };
}
const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
const r = (shifts, time, deaths = 0) => ({ shifts, time, deaths });

test('a fresh save has nothing cleared', () => {
  const save = createSave(memoryStorage());
  assert.equal(save.cleared('clock'), false);
  assert.equal(save.best('clock'), null);
});

test('recording keeps the best result: fewer clock-ins, then faster time', () => {
  const save = createSave(memoryStorage());
  assert.equal(save.record('clock', r(3, 5)), true);
  assert.equal(save.record('clock', r(4, 2)), false, 'more clock-ins is never better');
  assert.equal(save.record('clock', r(3, 4)), true, 'same clock-ins, faster');
  assert.equal(save.record('clock', r(3, 4.5)), false, 'same clock-ins, slower');
  assert.equal(save.record('clock', r(2, 9)), true, 'fewer clock-ins wins even if slower');
  assert.deepEqual(save.best('clock'), r(2, 9));
  assert.equal(better(r(2, 9), r(2, 9)), false, 'a tie is not better');
});

test('progress survives a reload (same storage, new save object)', () => {
  const storage = memoryStorage();
  createSave(storage).record('scaff', r(1, 3.2, 1));
  const again = createSave(storage);
  assert.equal(again.cleared('scaff'), true);
  assert.deepEqual(again.best('scaff'), r(1, 3.2, 1));
});

test('blocked storage never throws and still remembers for the session', () => {
  const save = createSave(throwing);
  assert.equal(save.record('clock', r(2, 3)), true);
  assert.equal(save.cleared('clock'), true);
  const none = createSave(null);
  assert.equal(none.record('clock', r(2, 3)), true);
});

test('corrupt or malformed saved data is ignored, not trusted', () => {
  assert.equal(createSave(memoryStorage({ 'double-shift.progress.v1': '{not json' })).cleared('clock'), false);
  const bad = JSON.stringify({ best: { clock: { shifts: 'two' }, scaff: r(1, 2) } });
  const save = createSave(memoryStorage({ 'double-shift.progress.v1': bad }));
  assert.equal(save.cleared('clock'), false, 'malformed entry dropped');
  assert.equal(save.cleared('scaff'), true, 'valid entry kept');
});

test('level select: act starts are always open; other levels open after the previous one is cleared', () => {
  const save = createSave(memoryStorage());
  const open = () => LEVELS.map((_, i) => isUnlocked(LEVELS, i, save));
  const actStart = LEVELS.map((d, i) => i === 0 || d.act !== LEVELS[i - 1].act);
  assert.deepEqual(open(), actStart, 'fresh save: only act starts are open');
  save.record(LEVELS[0].id, r(2, 3));
  assert.equal(isUnlocked(LEVELS, 1, save), true, 'clearing a level opens the next');
  assert.equal(isUnlocked(LEVELS, 2, save), actStart[2], 'but not the one after');
});

// The 21-level game inserts levels between the built ones. Unlocks are keyed by id, so a returning player
// keeps every level they cleared, and the chain runs through the new levels (pinned for docs/BUILD.md T18).
test('level select: inserting levels keeps cleared levels open and chains through new ones', () => {
  const save = createSave(memoryStorage());
  for (const id of ['clock', 'scaff', 'watch', 'wet', 'supervisor']) save.record(id, r(1, 2));
  const at = (defs, id) => defs.findIndex((d) => d.id === id);
  const defs = [...LEVELS];
  defs.splice(at(defs, 'watch') + 1, 0, { id: 'stairs', act: 2 }, { id: 'doors', act: 2 });
  defs.splice(at(defs, 'wet') + 1, 0, { id: 'pillar', act: 3 });
  assert.equal(isUnlocked(defs, at(defs, 'watch'), save), true, 'a cleared level stays open');
  assert.equal(isUnlocked(defs, at(defs, 'stairs'), save), true, 'a new level opens after the cleared one before it');
  assert.equal(isUnlocked(defs, at(defs, 'doors'), save), false, 'the chain still gates the next one');
  assert.equal(isUnlocked(defs, at(defs, 'wet'), save), true, 'act starts stay open');
  assert.equal(isUnlocked(defs, at(defs, 'pillar'), save), true, 'opens after the cleared act start');
  assert.equal(isUnlocked(defs, at(defs, 'supervisor'), save), true, 'cleared before the insertion: still open');
});

test('every level belongs to a named act, acts never go backwards, and act 1 starts the game', () => {
  assert.equal(LEVELS[0].act, 1);
  LEVELS.forEach((d, i) => {
    assert.ok(ACTS[d.act], `${d.name}: act ${d.act} has a name`);
    if (i > 0) assert.ok(d.act >= LEVELS[i - 1].act, `${d.name}: act order`);
  });
});


test('settings: defaults, saved changes survive a reload, values are clamped', () => {
  const storage = memoryStorage();
  const s = createSettings(storage);
  assert.deepEqual(s.get(), { ...DEFAULT_SETTINGS });
  s.set({ music: 0.3, reduced: true });
  assert.deepEqual(createSettings(storage).get(), { ...DEFAULT_SETTINGS, music: 0.3, reduced: true });
  assert.equal(s.set({ sfx: 7 }).sfx, 1, 'clamped to 1');
  assert.equal(s.set({ master: -2 }).master, 0, 'clamped to 0');
});

test('settings: blocked or corrupt storage falls back to defaults without throwing', () => {
  assert.deepEqual(createSettings(throwing).get(), { ...DEFAULT_SETTINGS });
  assert.equal(createSettings(throwing).set({ music: 0.1 }).music, 0.1);
  const bad = memoryStorage({ 'double-shift.settings.v1': '{"music":"loud","reduced":"yes"}' });
  assert.deepEqual(createSettings(bad).get(), { ...DEFAULT_SETTINGS });
});

test('saves: a best from an older rev is ignored; unlocks are unaffected', () => {
  const storage = memoryStorage();
  const save = createSave(storage);
  save.record('clockout', r(7, 40)); // the classic finale: rev 1, the default
  assert.deepEqual(save.best('clockout'), r(7, 40), 'rev 1 reads its own best');
  assert.equal(save.best('clockout', 2), null, 'the rework (rev 2) ignores it');
  assert.equal(save.cleared('clockout'), true, 'but the level still counts as cleared');
  assert.equal(save.record('clockout', r(9, 60), 2), true, "the first rev-2 result is its best, even if it's worse");
  assert.deepEqual(save.best('clockout', 2), r(9, 60));
  const again = createSave(storage); // survives a reload
  assert.deepEqual(again.best('clockout', 2), r(9, 60));
  assert.equal(again.record('clockout', r(10, 50), 2), false, 'within a rev, the usual rule');
  const defs = [{ id: 'a', act: 6 }, { id: 'clockout', act: 6, rev: 2 }, { id: 'b', act: 6 }];
  assert.equal(isUnlocked(defs, 2, again), true, 'a clear from any rev opens the next level');
});

test('saves: going back to an older revision finds its bests again', () => {
  // the fallback: if the classic finale ships again (rev 1), a player's classic best is still there
  const storage = memoryStorage();
  const save = createSave(storage);
  save.record('clockout', r(7, 40));
  save.record('clockout', r(9, 60), 2);
  const again = createSave(storage);
  assert.deepEqual(again.best('clockout'), r(7, 40));
  assert.deepEqual(again.best('clockout', 2), r(9, 60));
  assert.equal(createSave(memoryStorage()).cleared('clockout'), false);
  const onlyRework = createSave(memoryStorage());
  onlyRework.record('clockout', r(9, 60), 2);
  assert.equal(onlyRework.cleared('clockout'), true, 'a clear on the rework alone counts too');
});

test('settings: binds survive a reload; corrupt binds fall back', () => {
  const storage = memoryStorage();
  const binds = rebind(DEFAULT_BINDS, 'shift', 'KeyJ').binds;
  createSettings(storage).set({ binds });
  assert.deepEqual(createSettings(storage).get().binds, binds);
  assert.deepEqual(createSettings(memoryStorage()).get().binds, DEFAULT_BINDS, 'a fresh save has the defaults');
  storage.setItem('double-shift.settings.v1', JSON.stringify({ master: 0.5, binds: { left: 'x', jump: ['Escape'] } }));
  const repaired = createSettings(storage).get();
  assert.equal(repaired.master, 0.5);
  assert.deepEqual(repaired.binds, DEFAULT_BINDS, 'nothing usable: the defaults');
});

test('settings: the speedrun timer defaults off and survives a reload', () => {
  const storage = memoryStorage();
  assert.equal(createSettings(storage).get().timer, false);
  createSettings(storage).set({ timer: true });
  assert.equal(createSettings(storage).get().timer, true);
  storage.setItem('double-shift.settings.v1', JSON.stringify({ timer: 'yes' }));
  assert.equal(createSettings(storage).get().timer, false, 'junk reads as off');
});
