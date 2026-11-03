// The doc-count markers (scripts/counts.mjs): every number that tracks the code is checked against it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { syncMarkers } from '../scripts/counts.mjs';

const values = { tests: 170, levels: 12 };
const valueOf = (key) => values[key];

test('counts: a stale marker is reported and rewritten in place', () => {
  const text = 'Tests: <!-- n:tests -->162<!-- /n -->.\nLevels: <!-- n:levels -->12<!-- /n -->.';
  const r = syncMarkers(text, valueOf);
  assert.equal(r.markers, 2);
  assert.deepEqual(r.problems, [{ line: 1, key: 'tests', expected: '170', found: '162' }]);
  assert.equal(r.text, 'Tests: <!-- n:tests -->170<!-- /n -->.\nLevels: <!-- n:levels -->12<!-- /n -->.');
});

test('counts: an inline-code example of the syntax is skipped, and never rewritten instead of the real marker', () => {
  const text = 'Write `<!-- n:tests -->162<!-- /n -->` like this. Real: <!-- n:tests -->162<!-- /n -->';
  const r = syncMarkers(text, valueOf);
  assert.equal(r.markers, 1, 'the example is not a marker');
  assert.equal(r.text, 'Write `<!-- n:tests -->162<!-- /n -->` like this. Real: <!-- n:tests -->170<!-- /n -->');
});

test('counts: an example opener without a closer does not swallow a real marker later on the line', () => {
  const text = 'Markers look like `<!-- n:tests -->`; this one is real: <!-- n:tests -->162<!-- /n -->';
  const r = syncMarkers(text, valueOf);
  assert.equal(r.markers, 1);
  assert.deepEqual(r.problems.map((p) => p.found), ['162']);
});

test('counts: an unknown key is a problem, not a crash', () => {
  const r = syncMarkers('<!-- n:bananas -->3<!-- /n -->', valueOf);
  assert.deepEqual(r.problems, [{ line: 1, key: 'bananas', expected: '(unknown key)', found: '3' }]);
  assert.equal(r.text, '<!-- n:bananas -->3<!-- /n -->', 'left as it is');
});
