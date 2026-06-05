import { useMemo } from 'react';
import { occurrencesInRange } from '../lib/recurrence.js';
import { MONTHS_SHORT, formatCurrency } from '../lib/format.js';
import styles from './Timeline.module.css';

export default function Timeline({ rec, amount }) {
  const now = useMemo(() => { const d = new Date(); d.setDate(1); return d; }, []);

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() + i, 1)),
    [now],
  );

  const { hitSet, totalOccurrences } = useMemo(() => {
    const start = months[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 12, 1);
    const occs = occurrencesInRange(rec, start, end);
    const set = new Set(occs.map(d => `${d.getFullYear()}-${d.getMonth()}`));
    return { hitSet: set, totalOccurrences: occs.length };
  }, [rec, months, now]);

  const total = totalOccurrences * Math.abs(amount);

  return (
    <div className={styles.card}>
      <p className={styles.summary}>
        <span className={styles.blue}>↻ {totalOccurrences}×</span> in den nächsten 12 Monaten
        · <span className={styles.blue}>{formatCurrency(total)}</span> gesamt
      </p>
      <div className={styles.track}>
        {months.map((m, i) => {
          const hit = hitSet.has(`${m.getFullYear()}-${m.getMonth()}`);
          const isNow = i === 0;
          return (
            <div className={styles.col} key={i}>
              <div className={`${styles.bar} ${hit ? styles.hit : ''}`}>
                {hit && (
                  <span className={styles.barAmt}>{Math.round(Math.abs(amount))}€</span>
                )}
              </div>
              <span className={`${styles.label} ${isNow ? styles.labelNow : ''}`}>
                {MONTHS_SHORT[m.getMonth()]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
