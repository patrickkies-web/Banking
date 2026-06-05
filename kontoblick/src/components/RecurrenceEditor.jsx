import { useEffect, useState } from 'react';
import { FREQ_LABEL, toISODate } from '../lib/format.js';
import Timeline from './Timeline.jsx';
import styles from './RecurrenceEditor.module.css';

const FREQS = Object.keys(FREQ_LABEL);

export default function RecurrenceEditor({ tx, onChange }) {
  const rec = tx.recurrence;
  const isOn = !!rec;
  const freq = rec?.freq ?? 'monthly';
  const lastDate = rec?.lastDate ?? tx.date ?? toISODate(new Date());

  function toggle() {
    onChange(isOn ? null : { freq: 'monthly', lastDate: lastDate });
  }

  function setFreq(f) {
    onChange({ ...rec, freq: f });
  }

  function setLastDate(d) {
    onChange({ ...rec, lastDate: d });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.sectionLabel}>Wiederkehrend</div>

      <div className={styles.listCard}>
        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>Regelmäßige Zahlung</span>
          <Switch on={isOn} onClick={toggle} />
        </div>
      </div>

      {isOn && (
        <>
          <div className={styles.sectionLabel}>Rhythmus</div>
          <div className={styles.freqGrid}>
            {FREQS.map(f => (
              <button
                key={f}
                className={`${styles.freqBtn} ${freq === f ? styles.freqActive : ''}`}
                onClick={() => setFreq(f)}
              >
                {FREQ_LABEL[f]}
              </button>
            ))}
          </div>

          <div className={styles.sectionLabel}>Zuletzt gezahlt</div>
          <div className={styles.listCard}>
            <div className={styles.dateRow}>
              <span className={styles.dateLabel}>Datum</span>
              <input
                type="date"
                className={styles.dateInput}
                value={lastDate}
                onChange={e => setLastDate(e.target.value)}
              />
            </div>
          </div>

          <Timeline rec={{ freq, lastDate }} amount={tx.amount} />
        </>
      )}
    </div>
  );
}

function Switch({ on, onClick }) {
  return (
    <div
      className={`${styles.switch} ${on ? styles.switchOn : ''}`}
      onClick={onClick}
      role="switch"
      aria-checked={on}
    >
      <div className={styles.knob} />
    </div>
  );
}
