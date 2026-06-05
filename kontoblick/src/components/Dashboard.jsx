import { useMemo } from 'react';
import { formatCurrency, formatCurrencySigned, FREQ_LABEL, MONTHS_LONG } from '../lib/format.js';
import { monthlyEquivalent, occurrencesInRange } from '../lib/recurrence.js';
import styles from './Dashboard.module.css';

export default function Dashboard({ txs, cats }) {
  const catById = useMemo(() => Object.fromEntries(cats.map(c => [c.id, c])), [cats]);

  // IDs of special categories to exclude from regular income/expense totals
  const specialIds = useMemo(() =>
    new Set(cats.filter(c => c.special).map(c => c.id)),
    [cats]
  );

  function isSpecial(tx) {
    return (tx.categoryIds ?? []).some(id => specialIds.has(id));
  }

  const income  = useMemo(() => txs.filter(t => t.amount > 0 && !isSpecial(t)).reduce((s, t) => s + t.amount, 0), [txs, specialIds]);
  const expense = useMemo(() => txs.filter(t => t.amount < 0 && !isSpecial(t)).reduce((s, t) => s + t.amount, 0), [txs, specialIds]);
  const balance = income + expense;

  const breakdown = useMemo(() => {
    const regular = {}, special = {};
    for (const tx of txs) {
      const ids = (tx.categoryIds ?? []).length ? tx.categoryIds : ['__none__'];
      for (const key of ids) {
        const cat = catById[key];
        const bucket = cat?.special ? special : regular;
        if (!bucket[key]) bucket[key] = { total: 0, count: 0 };
        bucket[key].total += tx.amount;
        bucket[key].count++;
      }
    }
    const toRows = (map) => Object.entries(map)
      .map(([id, { total, count }]) => ({ id, cat: catById[id] ?? null, total, count }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    return { regular: toRows(regular), special: toRows(special) };
  }, [txs, catById]);

  const allRows = [...breakdown.regular, ...breakdown.special];
  const maxAbs = allRows.reduce((m, b) => Math.max(m, Math.abs(b.total)), 0) || 1;

  const recurring = useMemo(() => txs.filter(t => t.recurrence), [txs]);

  // Month-by-month forecast for next 12 months
  const forecast = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      return { start, end, label: `${MONTHS_LONG[start.getMonth()]} ${start.getFullYear()}` };
    });

    return months.map(({ start, end, label }) => {
      const items = [];
      for (const tx of recurring) {
        const occs = occurrencesInRange(tx.recurrence, start, end);
        for (const date of occs) {
          items.push({ tx, date });
        }
      }
      items.sort((a, b) => a.date - b.date);
      const total = items.reduce((s, { tx }) => s + tx.amount, 0);
      return { label, items, total };
    }).filter(m => m.items.length > 0);
  }, [recurring]);

  if (!txs.length) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Keine Daten</p>
        <p className={styles.emptySub}>Lade eine Kontodatei, um das Dashboard zu sehen.</p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <p className={styles.sectionLabel}>Zusammenfassung</p>
      <div className={styles.summaryCard}>
        <Stat label="Einnahmen" amount={income}  green />
        <div className={styles.divider} />
        <Stat label="Ausgaben"  amount={expense} />
        <div className={styles.divider} />
        <Stat label="Saldo"     amount={balance} signed />
      </div>

      {breakdown.special.length > 0 && (
        <>
          <p className={styles.sectionLabel}>Einnahmen & Überträge</p>
          <div className={styles.listCard}>
            {breakdown.special.map(row => <CatRow key={row.id} {...row} maxAbs={maxAbs} />)}
          </div>
        </>
      )}

      {breakdown.regular.length > 0 && (
        <>
          <p className={styles.sectionLabel}>Ausgaben nach Kategorie</p>
          <div className={styles.listCard}>
            {breakdown.regular.map(row => <CatRow key={row.id} {...row} maxAbs={maxAbs} />)}
          </div>
        </>
      )}

      {recurring.length > 0 && (
        <>
          <p className={styles.sectionLabel}>Abonnements</p>
          <div className={styles.listCard}>
            {recurring.map(tx => {
              const monthly = monthlyEquivalent(tx.amount, tx.recurrence.freq);
              return (
                <div className={styles.recRow} key={tx.id}>
                  <div className={styles.recBody}>
                    <span className={styles.recPayee}>{tx.payee || '—'}</span>
                    <span className={styles.recFreq}>{FREQ_LABEL[tx.recurrence.freq]}</span>
                  </div>
                  <div className={styles.recRight}>
                    <span className={styles.recAmount}>
                      {formatCurrency(Math.abs(tx.amount))}
                    </span>
                    <span className={styles.recMonthly}>
                      ≈ {formatCurrency(Math.abs(monthly))}/Mt.
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {forecast.length > 0 && (
            <>
              <p className={styles.sectionLabel}>Zahlungsvorschau</p>
              {forecast.map(({ label, items, total }) => (
                <div className={styles.forecastBlock} key={label}>
                  <div className={styles.forecastHeader}>
                    <span className={styles.forecastMonth}>{label}</span>
                    <span className={styles.forecastTotal}>
                      {formatCurrencySigned(total)}
                    </span>
                  </div>
                  <div className={styles.listCard}>
                    {items.map(({ tx, date }, i) => (
                      <div
                        key={tx.id + date.toISOString()}
                        className={`${styles.forecastRow} ${i < items.length - 1 ? styles.forecastRowSep : ''}`}
                      >
                        <span className={styles.forecastDay}>
                          {String(date.getDate()).padStart(2, '0')}.
                        </span>
                        <span className={styles.forecastPayee}>{tx.payee || '—'}</span>
                        <span className={styles.forecastAmt}>
                          {formatCurrencySigned(tx.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function CatRow({ id, cat, total, count, maxAbs }) {
  const color = cat?.color ?? '#aeaeb2';
  const pct   = Math.abs(total) / maxAbs * 100;
  const isPos = total >= 0;
  return (
    <div className={styles.catRow} key={id}>
      <div className={styles.catMeta}>
        <span className={styles.catDot} style={{ background: color }} />
        <span className={styles.catName}>{cat?.name ?? 'Nicht kategorisiert'}</span>
        <span className={styles.catCount}>{count}</span>
        <span className={styles.catTotal} style={{ color: isPos ? 'var(--positive)' : undefined }}>
          {formatCurrencySigned(total)}
        </span>
      </div>
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Stat({ label, amount, green, signed }) {
  const color = green
    ? 'var(--positive)'
    : signed && amount >= 0
    ? 'var(--positive)'
    : signed && amount < 0
    ? 'var(--danger)'
    : undefined;

  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} style={{ color }}>
        {signed ? formatCurrencySigned(amount) : formatCurrency(Math.abs(amount))}
      </div>
    </div>
  );
}
