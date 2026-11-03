// Double Shift — pure shell logic: level addressing and screen layout. No DOM, so it's tested headless
// (test/layout.test.mjs); src/main.js only draws what these functions return.

// `?level=` accepts a level id (`?level=offset`) or a 1-based position (`?level=11`). An id is stable when
// levels are inserted; a position isn't. Numbers clamp to the list; anything else starts at the first level.
export function levelIndex(defs, param) {
  if (param == null) return 0;
  const byId = defs.findIndex((d) => d.id === param);
  if (byId >= 0) return byId;
  const n = parseInt(param, 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n - 1, 0), defs.length - 1);
}
