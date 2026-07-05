/**
 * Normalize a string for search matching: lowercase and strip ALL whitespace.
 *
 * This makes size-style queries space-insensitive — e.g. searching "3.1*1.1" matches a value
 * stored as "3.1 * 1.1", and "75*19*3" matches "75 * 19 * 3". Applying it to both the query and
 * the target text keeps ordinary word search working too (adjacent words still match), while
 * making punctuation/spacing differences irrelevant.
 */
export const normalizeSearch = (value) =>
  (value == null ? "" : String(value)).toLowerCase().replace(/\s+/g, "");
