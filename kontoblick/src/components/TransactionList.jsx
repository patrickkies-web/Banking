import { useState, useEffect } from 'react';
import { formatDate, formatCurrencySigned, formatPeriod, payeeInitial, hashColor, MONTHS_LONG } from '../lib/format.js';
import TxSheet from './TxSheet.jsx';
import styles from './TransactionList.module.css';

const CY = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CY - 2 + i);

export default function TransactionList({ txs, setTxs, cats, filter, openMgr }) {
  const [selectedId, setSelectedId]   = useState(null);
  const [selMode, setSelMode]         = useState(false);
  const [anchor, setAnchor]           = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [assignMonth, setAssignMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`;
  });

  // Reset selection when filter tab changes
  useEffect(() => {
    setSelMode(false);
    setSelectedIds(new Set());
    setAnchor(null);
  }, [filter]);

  const filtered = txs.filter(t =>
    filter === 'open' ? !(t.categoryIds ?? []).length :
    filter === 'done' ?  !!(t.categoryIds ?? []).length :
    true
  );

  const selectedTx  = selectedId != null ? txs.find(t => t.id === selectedId) ?? null : null;
  const selectedIdx = selectedId != null ? filtered.findIndex(t => t.id === selectedId) : -1;

  function exitSel() {
    setSelMode(false);
    setAnchor(null);
    setSelectedIds(new Set());
  }

  function tapRow(tx) {
    if (!selMode) { setSelectedId(tx.id); return; }
    const ids = filtered.map(t => t.id);
    const ti  = ids.indexOf(tx.id);
    if (anchor === null) {
      setAnchor(tx.id);
      setSelectedIds(new Set([tx.id]));
    } else if (anchor === tx.id) {
      setAnchor(null);
      setSelectedIds(new Set());
    } else {
      const ai = ids.indexOf(anchor);
      const [lo, hi] = ai <= ti ? [ai, ti] : [ti, ai];
      setSelectedIds(new Set(ids.slice(lo, hi + 1)));
      setAnchor(null);
    }
  }

  function doAssign() {
    const sel = new Set(selectedIds);
    setTxs(prev => prev.map(t => sel.has(t.id) ? { ...t, period: assignMonth } : t));
    exitSel();
  }

  function handleSave(updated) {
    setTxs(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  function handleSaveAndNext(updated) {
    const nextTx = filtered[selectedIdx + 1] ?? null;
    setTxs(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelectedId(nextTx?.id ?? null);
  }

  if (!filtered.length) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>
          {filter === 'open' ? '✓' : '○'}
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

  const hint = anchor !== null
    ? 'Bis-Eintrag antippen…'
    : selectedIds.size > 0
    ? `${selectedIds.size} Einträge ausgewählt`
    : 'Von-Eintrag antippen';

  return (
    <>
      <div className={styles.toolbar}>
        {selMode ? (
          <>
            <button className={styles.toolCancel} onClick={exitSel}>Abbrechen</button>
            <span className={styles.toolHint}>{hint}</span>
          </>
        ) : (
          <button className={styles.periodBtn} onClick={() => setSelMode(true)}>
            Zeitraum festlegen
          </button>
        )}
      </div>

      <div className={styles.card}>
        {filtered.map((tx, i) => {
          const isSel  = selectedIds.has(tx.id);
          const isAnch = anchor === tx.id;
          const txCats = (tx.categoryIds ?? []).map(id => cats.find(c => c.id === id)).filter(Boolean);
          const isPos  = tx.amount >= 0;
          const isLast = i === filtered.length - 1;

          return (
            <div
              key={tx.id}
              className={`${styles.row} ${!isLast ? styles.rowSep : ''} ${isSel ? styles.rowSel : ''}`}
              onClick={() => tapRow(tx)}
            >
              {selMode && (
                <div className={`${styles.selBullet} ${isAnch ? styles.selAnchor : isSel ? styles.selActive : ''}`} />
              )}
              <div className={styles.avatar} style={{ background: hashColor(tx.payee) }}>
                {payeeInitial(tx.payee)}
              </div>
              <div className={styles.body}>
                <div className={styles.payee}>{tx.payee || '—'}</div>
                {tx.purpose && <div className={styles.purpose}>{tx.purpose}</div>}
                <div className={styles.meta}>
                  <span className={styles.date}>{formatDate(tx.date)}</span>
                  {tx.recurrence && <span className={styles.recurTag}>↻</span>}
                  {tx.period && <span className={styles.periodChip}>{formatPeriod(tx.period)}</span>}
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

      {selMode && selectedIds.size > 0 && anchor === null && (
        <div className={styles.assignBar}>
          <span className={styles.assignCount}>{selectedIds.size}</span>
          <select
            className={styles.periodSelect}
            value={assignMonth.split('-')[1]}
            onChange={e => setAssignMonth(prev => `${prev.split('-')[0]}-${e.target.value}`)}
          >
            {MONTHS_LONG.map((m, i) => (
              <option key={i} value={String(i + 1).padStart(2, '0')}>{m}</option>
            ))}
          </select>
          <select
            className={styles.periodSelect}
            value={assignMonth.split('-')[0]}
            onChange={e => setAssignMonth(prev => `${e.target.value}-${prev.split('-')[1]}`)}
          >
            {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <button className={styles.assignBtn} onClick={doAssign}>Zuweisen</button>
        </div>
      )}

      {!selMode && selectedTx && (
        <TxSheet
          tx={selectedTx}
          cats={cats}
          onSave={handleSave}
          onSaveAndNext={handleSaveAndNext}
          hasNext={selectedIdx >= 0 && selectedIdx < filtered.length - 1}
          navPos={{ current: selectedIdx + 1, total: filtered.length }}
          onClose={() => setSelectedId(null)}
          openMgr={openMgr}
        />
      )}
    </>
  );
}
