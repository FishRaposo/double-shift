// In-game copy that depends on results (docs/WRITING.md). Pure, so the rules for picking a line are tested.

export const SPOOK_LINES = ['SPOOKED!', 'AAAGH!', 'NOPE!', 'EEP!', 'NOT PAID ENOUGH'];

// Act cards (WRITING.md §2.1).
export const ACT_LINES = {
  1: 'Pardon our dust.',
  2: 'Something keeps moving things.',
  3: "They've gotten organized.",
  4: "The building doesn't add up anymore.",
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

export function stampText(diff) {
  return diff < 0 ? 'UNDER PAR!' : diff === 0 ? 'ON PAR' : `+${diff} OVERTIME`;
}
