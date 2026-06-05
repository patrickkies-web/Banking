import { useState, useEffect, useRef } from 'react';
import { CAT_COLORS, uid } from '../lib/format.js';
import styles from './CategoryManager.module.css';

export default function CategoryManager({ open, cats, setCats, txs, setTxs, onClose }) {
  const [visible, setVisible] = useState(false);
  const [adding, setAdding] = useState(null); // { parentId: string|null }
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(CAT_COLORS[0]);
  const addInputRef = useRef(null);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true));
    else setVisible(false);
  }, [open]);

  useEffect(() => {
    if (adding !== null) setTimeout(() => addInputRef.current?.focus(), 80);
  }, [adding]);

  function close() {
    setVisible(false);
    setTimeout(onClose, 340);
  }

  const mainCats = cats
    .filter(c => !c.parentId)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const subCatsOf = (pid) => cats
    .filter(c => c.parentId === pid)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  function txCount(catId) {
    const subIds = cats.filter(c => c.parentId === catId).map(c => c.id);
    return txs.filter(t => (t.categoryIds ?? []).some(id => id === catId || subIds.includes(id))).length;
  }

  function addCat() {
    const n = newName.trim();
    if (!n || adding === null) return;
    const { parentId } = adding;
    const parentColor = parentId ? cats.find(c => c.id === parentId)?.color : newColor;
    setCats(prev => [...prev, { id: uid(), name: n, color: parentColor ?? newColor, parentId }]);
    setNewName('');
    setAdding(null);
  }

  function remove(id) {
    const subIds = cats.filter(c => c.parentId === id).map(c => c.id);
    const gone = new Set([id, ...subIds]);
    setCats(prev => prev.filter(c => !gone.has(c.id)));
    setTxs(prev => prev.map(t => ({
      ...t,
      categoryIds: (t.categoryIds ?? []).filter(x => !gone.has(x)),
    })));
  }

  function rename(id, val) {
    setCats(prev => prev.map(c => c.id === id ? { ...c, name: val } : c));
  }

  function recolor(id, col) {
    setCats(prev => prev.map(c => c.id === id ? { ...c, color: col } : c));
  }

  if (!open) return null;

  return (
    <div
      className={`${styles.backdrop} ${visible ? styles.show : ''}`}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div className={styles.sheet}>
        <div className={styles.handle} />
        <div className={styles.header}>
          <span className={styles.title}>Kategorien</span>
          <button className={styles.done} onClick={close}>Fertig</button>
        </div>

        {mainCats.map(mc => {
          const subs = subCatsOf(mc.id);
          const count = txCount(mc.id);
          return (
            <div key={mc.id} className={styles.mainGroup}>
              {/* Main category row */}
              <div className={styles.mainRow}>
                <button
                  className={styles.mainSwatch}
                  style={{ background: mc.color }}
                  onClick={() => {
                    const next = CAT_COLORS[(CAT_COLORS.indexOf(mc.color) + 1) % CAT_COLORS.length];
                    recolor(mc.id, next);
                  }}
                />
                <input
                  className={styles.mainName}
                  value={mc.name}
                  onChange={e => rename(mc.id, e.target.value)}
                />
                {count > 0 && <span className={styles.count}>{count}</span>}
                <button
                  className={styles.addSubBtn}
                  onClick={() => { setAdding({ parentId: mc.id }); setNewName(''); }}
                  title="Unterkategorie hinzufügen"
                >+</button>
                <button className={styles.del} onClick={() => remove(mc.id)}>✕</button>
              </div>

              {/* Sub-category rows */}
              {subs.map(sc => (
                <div key={sc.id} className={styles.subRow}>
                  <div className={styles.subLine} style={{ background: mc.color }} />
                  <span className={styles.subDot} style={{ background: sc.color }} />
                  <input
                    className={styles.subName}
                    value={sc.name}
                    onChange={e => rename(sc.id, e.target.value)}
                  />
                  {txs.filter(t => (t.categoryIds ?? []).includes(sc.id)).length > 0 && (
                    <span className={styles.count}>
                      {txs.filter(t => (t.categoryIds ?? []).includes(sc.id)).length}
                    </span>
                  )}
                  <button className={styles.del} onClick={() => remove(sc.id)}>✕</button>
                </div>
              ))}

              {/* Inline add sub-cat form */}
              {adding?.parentId === mc.id && (
                <div className={styles.subAddRow}>
                  <div className={styles.subLine} style={{ background: mc.color }} />
                  <input
                    ref={addInputRef}
                    className={styles.addInput}
                    placeholder="Unterkategorie…"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addCat();
                      if (e.key === 'Escape') setAdding(null);
                    }}
                  />
                  <button className={styles.addBtn} onClick={addCat}>+</button>
                  <button className={styles.cancelSmall} onClick={() => setAdding(null)}>✕</button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add main category form */}
        {adding?.parentId === null ? (
          <div className={styles.mainAddBlock}>
            <div className={styles.addRow}>
              <input
                ref={addInputRef}
                className={styles.addInput}
                placeholder="Name der Hauptkategorie…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') addCat();
                  if (e.key === 'Escape') setAdding(null);
                }}
              />
              <button className={styles.addBtn} onClick={addCat}>+</button>
              <button className={styles.cancelSmall} onClick={() => setAdding(null)}>✕</button>
            </div>
            <div className={styles.swatches}>
              {CAT_COLORS.map(col => (
                <div
                  key={col}
                  className={`${styles.dot} ${newColor === col ? styles.dotActive : ''}`}
                  style={{ background: col }}
                  onClick={() => setNewColor(col)}
                />
              ))}
            </div>
          </div>
        ) : (
          <button
            className={styles.newMainBtn}
            onClick={() => { setAdding({ parentId: null }); setNewName(''); setNewColor(CAT_COLORS[0]); }}
          >
            + Neue Hauptkategorie
          </button>
        )}

        <div style={{ height: 'calc(16px + var(--safe-bottom))' }} />
      </div>
    </div>
  );
}
