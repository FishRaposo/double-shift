// Result-based copy (src/copy.js, docs/WRITING.md §7): which line a result gets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { stampText, timecardComment } from '../src/copy.js';

test('stamps: the timecard form and the short level-select form', () => {
  assert.equal(stampText(-1), 'UNDER PAR!');
  assert.equal(stampText(0), 'ON PAR');
  assert.equal(stampText(2), '+2 OVERTIME');
  assert.equal(stampText(-1, { short: true }), 'UNDER!');
  assert.equal(stampText(0, { short: true }), 'ON PAR');
  assert.equal(stampText(2, { short: true }), '+2');
});

test('timecard comment: incidents come first, then how the clock-ins compare to par', () => {
  assert.equal(timecardComment({ shifts: 1, par: 2, deaths: 3 }), 'Incident report: was spooked. Again. And again.');
  assert.equal(timecardComment({ shifts: 1, par: 2, deaths: 1 }), 'Incident report: was spooked.');
  assert.equal(timecardComment({ shifts: 1, par: 2, deaths: 0 }), 'Perfect shift. Nobody believes you.');
  assert.equal(timecardComment({ shifts: 2, par: 2, deaths: 0 }), 'A normal shift. Nothing to report.');
  assert.equal(timecardComment({ shifts: 4, par: 2, deaths: 0 }), 'Clocked in a lot. The freaks noticed.');
});
