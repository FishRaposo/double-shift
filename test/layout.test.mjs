// Shell logic that would otherwise hide in the browser-only main.js: level addressing and screen layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from '../src/levels.js';
import { levelIndex } from '../src/layout.js';

test('levelIndex: ids, numbers, junk', () => {
  assert.equal(levelIndex(LEVELS, 'offset'), LEVELS.findIndex((l) => l.id === 'offset'));
  assert.equal(levelIndex(LEVELS, '3'), 2);
  assert.equal(levelIndex(LEVELS, '99'), LEVELS.length - 1, 'numbers past the end clamp to the last level');
  assert.equal(levelIndex(LEVELS, '0'), 0, 'numbers before the start clamp to the first level');
  assert.equal(levelIndex(LEVELS, 'nope'), 0);
  assert.equal(levelIndex(LEVELS, null), 0);
});
