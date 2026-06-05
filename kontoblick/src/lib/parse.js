import * as XLSX from 'xlsx';
import { uid, toISODate } from './format.js';

// Map common column header variations to field names
const ALIASES = {
  date:    ['buchungsdatum','datum','date','valuta','buchungstag','wertstellung'],
  amount:  ['betrag','amount','umsatz','wert','value'],
  debit:   ['soll','debit','ausgabe','belastung','lastschrift'],
  credit:  ['haben','credit','einnahme','gutschrift','eingang'],
  payee:   ['zahlungsempfänger','zahlungsempfaenger','empfänger','empfaenger','payee','name','beguenstigter','begünstigter','auftraggeber'],
  purpose: ['verwendungszweck','zweck','purpose','reference','buchungstext','beschreibung','description','memo'],
  type:    ['transaktionstyp','typ','type','art','umsatzart','buchungstext'],
};

// Debit keywords in the type/transaction column → amount should be negative
const DEBIT_KEYWORDS = ['lastschrift','belastung','abbuchung','kartenzahlung','überweisung','sepa-überweisung','dauerauftrag','auszahlung','entgelt','gebühr'];
// Credit keywords → amount should be positive
const CREDIT_KEYWORDS = ['gutschrift','eingang','lohn','gehalt','zinsen','erstattung','rücküberweisung'];

function detectColumns(headers) {
  const norm = headers.map(h => String(h ?? '').toLowerCase().trim().replace(/\s+/g, ' '));
  const map = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    map[field] = aliases.reduce((found, a) => {
      if (found >= 0) return found;
      const exact = norm.indexOf(a);
      if (exact >= 0) return exact;
      return norm.findIndex(h => h.includes(a));
    }, -1);
  }
  return map;
}

function parseAmount(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim().replace(/\s/g, '').replace(/€/g, '').replace(/EUR/gi, '');

  // Detect sign suffix: trailing "-" or "S" (Soll) = negative; trailing "+" or "H" (Haben) = positive
  let sign = 0; // 0 = not forced
  if (/[Ss]$/.test(s)) { sign = -1; s = s.slice(0, -1); }
  else if (/[Hh]$/.test(s)) { sign = 1; s = s.slice(0, -1); }
  else if (s.endsWith('-') && !s.startsWith('-')) { sign = -1; s = s.slice(0, -1); }
  else if (s.endsWith('+')) { sign = 1; s = s.slice(0, -1); }

  // Strip leading sign so we can detect it separately
  let leading = 1;
  if (s.startsWith('-')) { leading = -1; s = s.slice(1); }
  else if (s.startsWith('+')) { s = s.slice(1); }

  // German format: 1.234,56 → 1234.56; US/international: 1,234.56 → 1234.56
  if (/,\d{1,2}$/.test(s)) {
    // German: dot = thousands, comma = decimal
    s = s.replace(/\./g, '').replace(',', '.');
  } else {
    s = s.replace(/,/g, '');
  }

  const n = parseFloat(s);
  if (isNaN(n)) return null;

  const result = n * leading;
  return sign !== 0 ? Math.abs(result) * sign : result;
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

// Find the first row that looks like a column header row
function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 12); i++) {
    const row = rows[i];
    if (!row || !row.length) continue;
    const norm = row.map(h => String(h ?? '').toLowerCase().trim());
    // Check if at least 2 of our known aliases appear in this row
    let hits = 0;
    for (const aliases of Object.values(ALIASES)) {
      if (aliases.some(a => norm.some(h => h === a || h.includes(a)))) hits++;
    }
    if (hits >= 2) return i;
  }
  return 0; // fallback: first row
}

function inferSign(typeStr) {
  const t = String(typeStr ?? '').toLowerCase();
  if (DEBIT_KEYWORDS.some(k => t.includes(k))) return -1;
  if (CREDIT_KEYWORDS.some(k => t.includes(k))) return 1;
  return 0;
}

function rowsToTransactions(rows) {
  if (!rows.length) return [];

  const headerIdx = findHeaderRow(rows);
  const headers = rows[headerIdx];
  const cols = detectColumns(headers);

  return rows.slice(headerIdx + 1)
    .filter(r => r && !r.every(c => c === '' || c == null))
    .map(r => {
      const date = parseDate(cols.date >= 0 ? r[cols.date] : null);

      // Determine amount: prefer signed "betrag" column; fall back to credit - debit
      let amount = 0;
      if (cols.amount >= 0) {
        const raw = parseAmount(r[cols.amount]);
        if (raw !== null) {
          amount = raw;
          // If amount is positive and type strongly indicates debit, negate it
          if (amount > 0 && cols.type >= 0) {
            const s = inferSign(r[cols.type]);
            if (s === -1) amount = -amount;
          }
        }
      } else if (cols.credit >= 0 || cols.debit >= 0) {
        const cr = cols.credit >= 0 ? (parseAmount(r[cols.credit]) ?? 0) : 0;
        const db = cols.debit  >= 0 ? (parseAmount(r[cols.debit])  ?? 0) : 0;
        amount = Math.abs(cr) - Math.abs(db);
      }

      return {
        id:          uid(),
        date:        toISODate(date),
        amount,
        payee:       cols.payee   >= 0 ? String(r[cols.payee]   ?? '').trim() : '',
        purpose:     cols.purpose >= 0 ? String(r[cols.purpose]  ?? '').trim() : '',
        type:        cols.type    >= 0 ? String(r[cols.type]     ?? '').trim() : '',
        categoryIds: [],
        recurrence:  null,
      };
    })
    .filter(t => t.payee || t.amount || t.purpose);
}

export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'csv' || ext === 'txt') {
    const text = await file.text();
    // Detect delimiter
    const firstLine = text.split('\n')[0] ?? '';
    const delim = firstLine.includes(';') ? ';' : ',';
    const wb = XLSX.read(text, { type: 'string', FS: delim, cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
    return rowsToTransactions(rows);
  }

  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' });
  return rowsToTransactions(rows);
}
