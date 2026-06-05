import { useState, useEffect, useRef } from 'react';
import { CAT_COLORS, uid } from '../lib/format.js';
import styles from './CategoryManager.module.css';

export default function CategoryManager({ open, cats, setCats, txs, setTxs, onClose }) {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(CAT_COLORS[0]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      setVisible(false);
    }
  }, [open]);

  function close() {
    setVisible(false);
    setTimeout(onClose, 340);
  }

  function add() {
    const n = name.trim();
    if (!n) return;
    setCats(prev => [...prev, { id: uid(), name: n, color }].sort((a, b) => a.name.localeCompare(b.name, 'de')));
    setName('');
    setColor(CAT_COLORS[(cats.length + 1) % CAT_COLORS.length]);
  }

  function remove(id) {
    setCats(prev => prev.filter(c => c.id !== id));
    setTxs(prev => prev.map(t => ({ ...t, categoryIds: (t.categoryIds ?? []).filter(x => x !== id) })));
  }

  function rename(id, value) {
    setCats(prev => prev.map(c => c.id === id ? { ...c, name: value } : c));
  }

  function recolor(id, newColor) {
    setCats(prev => prev.map(c => c.id === id ? { ...c, color: newColor } : c));
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

        {cats.length === 0 && (
          <p className={styles.empty}>Erstelle deine eigenen Kategorien. Du benennst sie frei.</p>
        )}

        {cats.length > 0 && (
          <div className={styles.listCard}>
            {cats.map(c => (
              <div className={styles.row} key={c.id}>
                <div
                  className={styles.swatch}
                  style={{ background: c.color }}
                  title="Farbe ändern"
                />
                <input
                  className={styles.nameInput}
                  value={c.name}
                  onChange={e => rename(c.id, e.target.value)}
                />
                <span className={styles.count}>
                  {txs.filter(t => (t.categoryIds ?? []).includes(c.id)).length}
                </span>
                <button className={styles.del} onClick={() => remove(c.id)}>Löschen</button>
              </div>
            ))}
          </div>
        )}

        <p className={styles.sectionLabel}>Neue Kategorie</p>

        <div className={styles.listCard}>
          <div className={styles.addRow}>
            <input
              ref={inputRef}
              className={styles.addInput}
              placeholder="Name eingeben…"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add(); }}
            />
            <button className={styles.addBtn} onClick={add}>+</button>
          </div>
          <div className={styles.swatches}>
            {CAT_COLORS.map(col => (
              <div
                key={col}
                className={`${styles.dot} ${color === col ? styles.dotActive : ''}`}
                style={{ background: col }}
                onClick={() => setColor(col)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
