export const MONTHS_SHORT = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
export const MONTHS_LONG  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

export const FREQ_LABEL = {
  monthly:    'Monatlich',
  quarterly:  'Quartalsweise',
  semiannual: 'Halbjährlich',
  annual:     'Jährlich',
};

export const FREQ_MONTHS = { monthly: 1, quarterly: 3, semiannual: 6, annual: 12 };

export function formatCurrency(amount) {
  const abs = Math.abs(amount);
  return abs.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

export function formatCurrencySigned(amount) {
  const sign = amount < 0 ? '−' : '+';
  return sign + formatCurrency(amount);
}

export function formatDate(date) {
  if (!date) return '—';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function toISODate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// Color palette for categories
export const CAT_COLORS = [
  '#007aff','#34c759','#ff9500','#ff3b30',
  '#af52de','#ff2d55','#30b0c7','#5856d6',
  '#ffcc00','#5ac8fa','#ff6b35','#32ade6',
];

// Deterministic color from string
export function hashColor(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return CAT_COLORS[h % CAT_COLORS.length];
}

export function payeeInitial(name) {
  return (name || '?').trim()[0]?.toUpperCase() || '?';
}
