import { useMemo } from 'react';
import { formatCurrencySigned, MONTHS_LONG } from '../lib/format.js';
import { occurrencesInRange } from '../lib/recurrence.js';
import styles from './Forecast.module.css';

export default function Forecast({ txs }) {
  const recurring = useMemo(() => txs.filter(t => t.recurrence), [txs]);

  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const end   = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
      const label = `${MONTHS_LONG[start.getMonth()]} ${start.getFullYear()}`;
      const items = [];
      for (const tx of recurring) {
        for (const date of occurrencesInRange(tx.recurrence, start, end)) {
          items.push({ tx, date });
        }
      }
      items.sort((a, b) => a.date - b.date);
      const total = items.reduce((s, { tx }) => s + tx.amount, 0);
      return { label, items, total };
    });
  }, [recurring]);

  if (!recurring.length) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>Keine Abonnements</p>
        <p className={styles.emptySub}>
          Öffne eine Transaktion im Postfach und aktiviere „Abonnement", um hier die 12-Monats-Vorschau zu sehen.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {months.map(({ label, items, total }) => (
        <div key={label} className={styles.monthBlock}>
          <div className={styles.monthHeader}>
            <span className={styles.monthLabel}>{label}</span>
            {items.length > 0 && (
              <span className={`${styles.monthTotal} ${total >= 0 ? styles.pos : styles.neg}`}>
                {formatCurrencySigned(total)}
              </span>
            )}
          </div>
          {items.length === 0 ? (
            <div className={styles.emptyMonth}>Keine geplanten Zahlungen</div>
          ) : (
            <div className={styles.listCard}>
              {items.map(({ tx, date }, i) => (
                <div
                  key={tx.id + date.toISOString()}
                  className={`${styles.row} ${i < items.length - 1 ? styles.rowSep : ''}`}
                >
                  <span className={styles.day}>
                    {String(date.getDate()).padStart(2, '0')}.
                  </span>
                  <span className={styles.payee}>{tx.payee || '—'}</span>
                  <span className={`${styles.amt} ${tx.amount >= 0 ? styles.pos : ''}`}>
                    {formatCurrencySigned(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
