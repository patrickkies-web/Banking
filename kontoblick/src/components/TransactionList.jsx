import { useState } from 'react';
import { formatDate, formatCurrencySigned, payeeInitial, hashColor } from '../lib/format.js';
import TxSheet from './TxSheet.jsx';
import styles from './TransactionList.module.css';

export default function TransactionList({ txs, setTxs, cats, filter, openMgr }) {
  const [selectedId, setSelectedId] = useState(null);

  const filtered = txs.filter(t =>
    filter === 'open' ? !(t.categoryIds ?? []).length :
    filter === 'done' ?  !!(t.categoryIds ?? []).length :
    true
  );

  const selectedTx = selectedId != null ? txs.find(t => t.id === selectedId) ?? null : null;

  function handleSave(updated) {
    setTxs(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  if (!filtered.length) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          {filter === 'open' ? '✓' : filter === 'done' ? '○' : '○'}
        </div>
        <p className={styles.emptyTitle}>
          {filter === 'open' ? 'Alles erledigt' :
           filter === 'done' ? 'Noch nichts kategorisiert' :
           'Keine Transaktionen'}
        </p>
        <p className={styles.emptySub}>
          {filter === 'open' ? 'Alle Transaktionen sind kategorisiert.' :
           filter === 'done' ? 'Tippe auf eine offene Transaktion und weise eine Kategorie zu.' :
           'Lade eine Kontodatei über den Start-Screen.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.card}>
        {filtered.map((tx, i) => {
          const txCats = (tx.categoryIds ?? []).map(id => cats.find(c => c.id === id)).filter(Boolean);
          const isPos = tx.amount >= 0;
          const isLast = i === filtered.length - 1;

          return (
            <div
              key={tx.id}
              className={`${styles.row} ${!isLast ? styles.rowSep : ''}`}
              onClick={() => setSelectedId(tx.id)}
            >
              <div
                className={styles.avatar}
                style={{ background: hashColor(tx.payee) }}
              >
                {payeeInitial(tx.payee)}
              </div>

              <div className={styles.body}>
                <div className={styles.payee}>{tx.payee || '—'}</div>
                {tx.purpose && (
                  <div className={styles.purpose}>{tx.purpose}</div>
                )}
                <div className={styles.meta}>
                  <span className={styles.date}>{formatDate(tx.date)}</span>
                  {tx.recurrence && <span className={styles.recurTag}>↻</span>}
                </div>
              </div>

              <div className={styles.right}>
                <div className={`${styles.amount} ${isPos ? styles.amountPos : ''}`}>
                  {formatCurrencySigned(tx.amount)}
                </div>
                <div className={styles.chips}>
                  {txCats.slice(0, 2).map(cat => (
                    <div
                      key={cat.id}
                      className={styles.catChip}
                      style={{ background: cat.color + '22', color: cat.color }}
                    >
                      {cat.name}
                    </div>
                  ))}
                  {txCats.length > 2 && (
                    <div className={styles.catChipMore}>+{txCats.length - 2}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedTx && (
        <TxSheet
          tx={selectedTx}
          cats={cats}
          onSave={handleSave}
          onClose={() => setSelectedId(null)}
          openMgr={openMgr}
        />
      )}
    </>
  );
}
