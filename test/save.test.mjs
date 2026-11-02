// Progress saving and level-select unlocking. Storage is faked; the real one is localStorage.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSave, isUnlocked, better } from '../src/save.js';
import { LEVELS, ACTS } from '../src/levels.js';

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

test('every level belongs to a named act, acts never go backwards, and act 1 starts the game', () => {
  assert.equal(LEVELS[0].act, 1);
  LEVELS.forEach((d, i) => {
    assert.ok(ACTS[d.act], `${d.name}: act ${d.act} has a name`);
    if (i > 0) assert.ok(d.act >= LEVELS[i - 1].act, `${d.name}: act order`);
  });
});
