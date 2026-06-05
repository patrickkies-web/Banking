import { useState, useMemo } from 'react';
import { formatCurrency, formatCurrencySigned, formatPeriod, FREQ_LABEL, MONTHS_LONG } from '../lib/format.js';
import { monthlyEquivalent, occurrencesInRange } from '../lib/recurrence.js';
import styles from './Dashboard.module.css';

export default function Dashboard({ txs, cats, labels }) {
  const [activePeriod, setActivePeriod] = useState('all');

  const specialIds = useMemo(() =>
    new Set(cats.filter(c => c.special).map(c => c.id)),
    [cats]
  );

  const periods = useMemo(() => {
    const set = new Set(txs.map(t => t.period).filter(Boolean));
    return [...set].sort();
  }, [txs]);

  const viewTxs = useMemo(() =>
    activePeriod === 'all' ? txs : txs.filter(t => t.period === activePeriod),
    [txs, activePeriod]
  );

  function isSpecial(tx) {
    return (tx.categoryIds ?? []).some(id => specialIds.has(id));
  }

  const income  = useMemo(() => viewTxs.filter(t => t.amount > 0 && !isSpecial(t)).reduce((s, t) => s + t.amount, 0), [viewTxs, specialIds]);
  const expense = useMemo(() => viewTxs.filter(t => t.amount < 0 && !isSpecial(t)).reduce((s, t) => s + t.amount, 0), [viewTxs, specialIds]);
  const balance = income + expense;

  const breakdown = useMemo(() => {
    const mainCats = cats.filter(c => !c.parentId).sort((a, b) => a.name.localeCompare(b.name, 'de'));

    return mainCats.map(mc => {
      const subIds = cats.filter(c => c.parentId === mc.id).map(c => c.id);
      const relevantIds = new Set([mc.id, ...subIds]);

      const relevant = viewTxs.filter(t => (t.categoryIds ?? []).some(id => relevantIds.has(id)));
      if (!relevant.length) return null;

      const total = relevant.reduce((s, t) => s + t.amount, 0);

      const subs = [...cats.filter(c => c.parentId === mc.id), ...(subIds.length === 0 ? [mc] : [])]
        .map(sc => {
          const scTxs = viewTxs.filter(t => (t.categoryIds ?? []).includes(sc.id));
          return scTxs.length ? { cat: sc, total: scTxs.reduce((s, t) => s + t.amount, 0), count: scTxs.length } : null;
        })
        .filter(Boolean)
        .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

      return { mc, total, subs, special: !!mc.special };
    }).filter(Boolean);
  }, [viewTxs, cats]);

  const maxAbs = breakdown.reduce((m, g) => Math.max(m, Math.abs(g.total)), 0) || 1;

  const recurring = useMemo(() => txs.filter(t => t.recurrence), [txs]);

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

  const fixedLabels = useMemo(() => (labels ?? []).filter(l => l.isFixedCost), [labels]);

  const matrixCols = useMemo(() => {
    const set = new Set(txs.map(t => t.period).filter(Boolean));
    return [...set].sort();
  }, [txs]);

  function getPaid(labelId, period) {
    return txs.some(t => t.labelId === labelId && t.period === period);
  }

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
      {periods.length > 0 && (
        <>
          <p className={styles.sectionLabel}>Zeitraum</p>
          <div className={styles.periodRow}>
            <button
              className={`${styles.periodPill} ${activePeriod === 'all' ? styles.periodPillActive : ''}`}
              onClick={() => setActivePeriod('all')}
            >
              Alle
            </button>
            {periods.map(p => (
              <button
                key={p}
                className={`${styles.periodPill} ${activePeriod === p ? styles.periodPillActive : ''}`}
                onClick={() => setActivePeriod(p)}
              >
                {formatPeriod(p)}
              </button>
            ))}
          </div>
        </>
      )}

      <p className={styles.sectionLabel}>Zusammenfassung</p>
      <div className={styles.summaryCard}>
        <Stat label="Einnahmen" amount={income}  green />
        <div className={styles.divider} />
        <Stat label="Ausgaben"  amount={expense} />
        <div className={styles.divider} />
        <Stat label="Saldo"     amount={balance} signed />
      </div>

      {breakdown.filter(g => g.special).length > 0 && (
        <>
          <p className={styles.sectionLabel}>Einnahmen & Überträge</p>
          {breakdown.filter(g => g.special).map(g => (
            <GroupCard key={g.mc.id} group={g} maxAbs={maxAbs} />
          ))}
        </>
      )}

      {breakdown.filter(g => !g.special).length > 0 && (
        <>
          <p className={styles.sectionLabel}>Ausgaben nach Kategorie</p>
          {breakdown.filter(g => !g.special).map(g => (
            <GroupCard key={g.mc.id} group={g} maxAbs={maxAbs} />
          ))}
        </>
      )}

      {fixedLabels.length > 0 && matrixCols.length > 0 && (
        <>
          <p className={styles.sectionLabel}>Fixkosten-Übersicht</p>
          <div className={styles.matrixWrap}>
            <table className={styles.matrix}>
              <thead>
                <tr className={styles.matrixHeaderRow}>
                  <th className={styles.matrixCorner} />
                  {matrixCols.map(col => (
                    <th key={col} className={styles.matrixColHeader}>
                      {formatPeriod(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fixedLabels.map(label => (
                  <tr key={label.id} className={styles.matrixDataRow}>
                    <td className={styles.matrixLabelCell}>{label.name}</td>
                    {matrixCols.map(col => {
                      const paid = getPaid(label.id, col);
                      return (
                        <td
                          key={col}
                          className={`${styles.matrixCell} ${paid ? styles.matrixPaid : styles.matrixUnpaid}`}
                        >
                          {paid ? '✓' : '✗'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
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

function GroupCard({ group, maxAbs }) {
  const { mc, total, subs } = group;
  const pct = Math.abs(total) / maxAbs * 100;
  const isPos = total >= 0;
  return (
    <div style={{ margin: '0 var(--page-x) 4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0 4px' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: mc.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>
          {mc.name}
        </span>
        <span style={{ fontSize: 14, fontWeight: 700, color: isPos ? 'var(--positive)' : 'var(--text-primary)' }}>
          {formatCurrencySigned(total)}
        </span>
      </div>
      <div style={{ background: 'var(--surface-3)', borderRadius: 4, height: 4, marginBottom: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: mc.color, borderRadius: 4 }} />
      </div>
      {subs.length > 0 && (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
          {subs.map(({ cat, total: st, count }, i) => (
            <div key={cat.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px',
              borderBottom: i < subs.length - 1 ? '.5px solid var(--sep)' : 'none',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{cat.name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>{count}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: st >= 0 ? 'var(--positive)' : 'var(--text-primary)' }}>
                {formatCurrencySigned(st)}
              </span>
            </div>
          ))}
        </div>
      )}
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
