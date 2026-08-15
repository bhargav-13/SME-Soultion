/**
 * Display formatting, in one place.
 *
 * Every figure this console shows goes through here, so a quantity in a table, a total in a
 * dialog and a stat on the dashboard can't each pick their own separator or decimal count.
 */

const NUMBER = new Intl.NumberFormat('en-IN');
const CURRENCY = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

/** 1234567 → "12,34,567". Nullish reads as an em dash rather than "NaN". */
export function fmtNumber(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? NUMBER.format(n) : '—';
}

/** 1234.5 → "₹1,234.50". */
export function fmtCurrency(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  return Number.isFinite(n) ? CURRENCY.format(n) : '—';
}

/** A quantity that may carry decimals — trailing zeros are dropped so "5" doesn't read "5.00". */
export function fmtQty(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return NUMBER.format(Number(n.toFixed(3)));
}

/** ISO date/timestamp → "16 Aug 2026". */
export function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** ISO timestamp → "16 Aug 2026, 4:05 pm". */
export function fmtDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "3 orders" / "1 order", with an explicit plural for the words English won't just take an s. */
export function pluralize(count, singular, plural) {
  const n = Number(count) || 0;
  return `${fmtNumber(n)} ${n === 1 ? singular : (plural ?? `${singular}s`)}`;
}

/** SCREAMING_SNAKE enum → "Screaming snake", for statuses the API hands over raw. */
export function humanize(value) {
  if (!value) return '—';
  const s = String(value).replace(/[_-]+/g, ' ').trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Initials for an avatar fallback: "Ishita Industries" → "II". */
export function initials(value) {
  if (!value) return '?';
  const parts = String(value).trim().split(/[\s@._-]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').toUpperCase() + (parts[1]?.[0] ?? '').toUpperCase();
}
