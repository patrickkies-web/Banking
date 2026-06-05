import { useEffect, useState } from 'react';
import { formatDate, formatCurrencySigned } from '../lib/format.js';
import RecurrenceEditor from './RecurrenceEditor.jsx';
import styles from './TxSheet.module.css';

export default function TxSheet({ tx, cats, onSave, onSaveAndNext, hasNext, navPos, onClose, openMgr }) {
  const [visible, setVisible] = useState(false);
  const [local, setLocal] = useState(tx);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function save() {
    onSave(local);
    setVisible(false);
    setTimeout(onClose, 340);
  }

  function saveAndNext() {
    onSaveAndNext(local);
    // TxSheet stays mounted (parent swaps tx), no animation needed
  }

  function cancel() {
    setVisible(false);
    setTimeout(onClose, 340);
  }

  function toggleCat(id) {
    setLocal(prev => {
      const ids = prev.categoryIds ?? [];
      return {
        ...prev,
        categoryIds: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id],
      };
    });
  }

  const isPos = local.amount >= 0;

  return (
    <div
      className={`${styles.backdrop} ${visible ? styles.show : ''}`}
      onClick={e => { if (e.target === e.currentTarget) cancel(); }}
    >
      <div className={styles.sheet}>
        <div className={styles.handle} />

        <div className={styles.header}>
          <button className={styles.cancelBtn} onClick={cancel}>Abbrechen</button>
          <span className={styles.title}>
            {navPos ? `${navPos.current} / ${navPos.total}` : 'Transaktion'}
          </span>
          <div className={styles.headerActions}>
            <button className={styles.doneBtn} onClick={save}>Fertig</button>
            {hasNext && (
              <button className={styles.nextBtn} onClick={saveAndNext} title="Nächste">
                →
              </button>
            )}
          </div>
        </div>

        <div className={styles.hero}>
          <div className={`${styles.amount} ${isPos ? styles.amountPos : ''}`}>
            {formatCurrencySigned(local.amount)}
          </div>
          <div className={styles.payee}>{local.payee || '—'}</div>
          <div className={styles.date}>{formatDate(local.date)}</div>
        </div>

        {local.purpose && (
          <>
            <p className={styles.sectionLabel}>Verwendungszweck</p>
            <div className={styles.listCard}>
              <p className={styles.purpose}>{local.purpose}</p>
            </div>
          </>
        )}

        <p className={styles.sectionLabel}>Kategorien</p>
        {cats.length === 0 ? (
          <div className={styles.catEmpty}>
            <button className={styles.newCatBtn} onClick={openMgr}>
              + Erste Kategorie anlegen
            </button>
          </div>
        ) : (
          <div className={styles.catGrid}>
            {cats.map(cat => {
              const active = (local.categoryIds ?? []).includes(cat.id);
              return (
                <button
                  key={cat.id}
                  className={`${styles.catBtn} ${active ? styles.catActive : ''}`}
                  style={active
                    ? { background: cat.color, borderColor: cat.color }
                    : { borderColor: cat.color + '50' }
                  }
                  onClick={() => toggleCat(cat.id)}
                >
                  <span
                    className={styles.catDot}
                    style={{ background: active ? '#fff' : cat.color }}
                  />
                  {cat.name}
                </button>
              );
            })}
            <button className={styles.addCatBtn} onClick={openMgr}>
              + Kategorie
            </button>
          </div>
        )}

        <RecurrenceEditor
          tx={local}
          onChange={rec => setLocal(prev => ({ ...prev, recurrence: rec }))}
        />

        <div style={{ height: 'calc(16px + var(--safe-bottom))' }} />
      </div>
    </div>
  );
}
