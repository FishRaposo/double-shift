// In-game copy that depends on results (docs/WRITING.md). Pure, so the rules for picking a line are tested.

export const SPOOK_LINES = ['SPOOKED!', 'AAAGH!', 'NOPE!', 'EEP!', 'NOT PAID ENOUGH'];

// Act cards (WRITING.md §2.1).
export const ACT_LINES = {
  1: 'Pardon our dust.',
  2: 'Something keeps moving things.',
  3: "They've gotten organized.",
  4: "The building doesn't add up anymore.",
  5: 'The night shift turned the building over.',
  6: 'One more shift.',
};

// One line under the timecard stamp (WRITING.md §7). r: { shifts, par, deaths }.
export function timecardComment(r) {
  const diff = r.shifts - r.par;
  if (r.deaths >= 3) return 'Incident report: was spooked. Again. And again.';
  if (r.deaths >= 1) return 'Incident report: was spooked.';
  if (diff < 0) return 'Perfect shift. Nobody believes you.';
  if (diff === 0) return 'A normal shift. Nothing to report.';
  return 'Clocked in a lot. The freaks noticed.';
}

// The rubber stamp for a result (diff = clock-ins − par). `short` is the level select's small card stamp.
export function stampText(diff, { short = false } = {}) {
  if (diff < 0) return short ? 'UNDER!' : 'UNDER PAR!';
  if (diff === 0) return 'ON PAR';
  return short ? `+${diff}` : `+${diff} OVERTIME`;
}

// Credits, under the end screen's totals (WRITING.md §8; final wording by Fish, 2026-11-03).
export const CREDITS = [
  'Designed by Vinícius Raposo.',
  'Built with AI assistance (Claude).',
  'Made for GitHub Game Off 2026.',
];
