import * as XLSX from 'xlsx';
import { uid, toISODate } from './format.js';

// Map common column header variations to field names
const ALIASES = {
  date:    ['buchungsdatum','datum','date','valuta','buchungstag','wertstellung'],
  amount:  ['betrag','amount','umsatz','wert','value'],
  payee:   ['zahlungsempfänger','zahlungsempfaenger','empfänger','empfaenger','payee','name','beguenstigter','begünstigter','auftraggeber'],
  purpose: ['verwendungszweck','zweck','purpose','reference','buchungstext','beschreibung','description','memo'],
  type:    ['transaktionstyp','typ','type','art','umsatzart'],
};

function detectColumns(headers) {
  const norm = headers.map(h => String(h ?? '').toLowerCase().trim());
  const map = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    let idx = aliases.reduce((found, a) => {
      if (found >= 0) return found;
      const exact = norm.indexOf(a);
      if (exact >= 0) return exact;
      return norm.findIndex(h => h.includes(a));
    }, -1);
    map[field] = idx;
  }
  return map;
}

function parseAmount(v) {
  if (typeof v === 'number') return v;
  if (v == null) return 0;
  let s = String(v).trim().replace(/\s/g, '').replace(/€/g, '');
  // German format: 1.234,56 → 1234.56
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function parseDate(v) {
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === 'number') {
    // Excel serial date
    return new Date(Date.UTC(1899, 11, 30) + v * 86400000);
  }
  const s = String(v ?? '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (m) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return new Date(y, +m[2] - 1, +m[1]);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function rowsToTransactions(rows) {
  if (!rows.length) return [];
  const headers = rows[0];
  const cols = detectColumns(headers);

  return rows.slice(1)
    .filter(r => r && !r.every(c => c === '' || c == null))
    .map(r => {
      const date = parseDate(cols.date >= 0 ? r[cols.date] : null);
      return {
        id:         uid(),
        date:       toISODate(date),
        amount:     cols.amount  >= 0 ? parseAmount(r[cols.amount])        : 0,
        payee:      cols.payee   >= 0 ? String(r[cols.payee]  ?? '').trim() : '',
        purpose:    cols.purpose >= 0 ? String(r[cols.purpose] ?? '').trim() : '',
        type:       cols.type    >= 0 ? String(r[cols.type]    ?? '').trim() : '',
        categoryId: null,
        recurrence: null,
      };
    })
    .filter(t => t.payee || t.amount || t.purpose);
}

export async function parseFile(file) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  return rowsToTransactions(rows);
}
