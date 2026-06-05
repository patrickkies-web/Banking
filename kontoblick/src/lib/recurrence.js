import { FREQ_MONTHS } from './format.js';

function parseDate(s) {
  if (!s) return null;
  if (s instanceof Date) return s;
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

/**
 * Returns all occurrences of a recurrence within [start, end).
 */
export function occurrencesInRange(rec, start, end) {
  if (!rec?.lastDate) return [];
  const step = FREQ_MONTHS[rec.freq] ?? 1;
  const last = parseDate(rec.lastDate);
  if (!last) return [];

  // Rewind last payment before start
  let d = new Date(last);
  while (d >= start) {
    d = new Date(d.getFullYear(), d.getMonth() - step, d.getDate());
  }

  const results = [];
  for (let guard = 0; guard < 600; guard++) {
    d = new Date(d.getFullYear(), d.getMonth() + step, d.getDate());
    if (d >= end) break;
    if (d >= start) results.push(new Date(d));
  }
  return results;
}

/**
 * Returns the next N upcoming occurrences from fromDate.
 */
export function nextOccurrences(rec, fromDate, count = 12) {
  const step = FREQ_MONTHS[rec?.freq] ?? 1;
  const last = parseDate(rec?.lastDate);
  if (!last) return [];

  let d = new Date(last);
  const results = [];
  for (let guard = 0; guard < 400 && results.length < count; guard++) {
    d = new Date(d.getFullYear(), d.getMonth() + step, d.getDate());
    if (d >= fromDate) results.push(new Date(d));
  }
  return results;
}

/**
 * Monthly cost normalized from a recurrence (amount / interval_months).
 */
export function monthlyEquivalent(amount, freq) {
  return amount / (FREQ_MONTHS[freq] ?? 1);
}
