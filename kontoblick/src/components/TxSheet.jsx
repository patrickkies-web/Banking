import { useEffect, useState } from 'react';
import { formatDate, formatCurrencySigned, uid } from '../lib/format.js';
import RecurrenceEditor from './RecurrenceEditor.jsx';
import styles from './TxSheet.module.css';

export default function TxSheet({ tx, cats, labels, setLabels, suggestedLabelId, onSave, onSaveAndNext, hasNext, navPos, onClose, openMgr }) {
  const [visible, setVisible] = useState(false);
  const [local, setLocal] = useState(tx);
  const [showNewLabel, setShowNewLabel] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    setLocal(tx);
    setShowNewLabel(false);
    setNewLabelName('');
  }, [tx.id]);

  function save() {
    onSave(local);
    setVisible(false);
    setTimeout(onClose, 340);
  }

  function saveAndNext() {
    onSaveAndNext(local);
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

  function selectLabel(id) {
    setLocal(prev => {
      const updated = { ...prev, labelId: id === prev.labelId ? null : id };
      if (id && id !== prev.labelId && !(prev.categoryIds ?? []).length) {
        const label = (labels ?? []).find(l => l.id === id);
        if (label?.categoryIds?.length) updated.categoryIds = label.categoryIds;
      }
      return updated;
    });
  }

  function createLabel() {
    const name = newLabelName.trim();
    if (!name) return;
    const newLabel = {
      id: uid(),
      name,
      categoryIds: local.categoryIds ?? [],
      isFixedCost: false,
    };
    setLabels(prev => [...prev, newLabel]);
    setLocal(prev => ({ ...prev, labelId: newLabel.id }));
    setShowNewLabel(false);
    setNewLabelName('');
  }

  function toggleFixedCost(labelId) {
    setLabels(prev =>
      prev.map(l => l.id === labelId ? { ...l, isFixedCost: !l.isFixedCost } : l)
    );
  }

  const isPos = local.amount >= 0;
  const labelById = Object.fromEntries((labels ?? []).map(l => [l.id, l]));
  const currentLabel = local.labelId ? labelById[local.labelId] : null;
  const suggestedLabel = suggestedLabelId && !local.labelId ? labelById[suggestedLabelId] : null;

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
        {cats.filter(c => !c.parentId).length === 0 ? (
          <div className={styles.catEmpty}>
            <button className={styles.newCatBtn} onClick={openMgr}>
              + Erste Kategorie anlegen
            </button>
          </div>
        ) : (
          <div className={styles.catSections}>
            {cats
              .filter(c => !c.parentId)
              .sort((a, b) => a.name.localeCompare(b.name, 'de'))
              .map(mc => {
                const subs = cats
                  .filter(c => c.parentId === mc.id)
                  .sort((a, b) => a.name.localeCompare(b.name, 'de'));
                const targets = subs.length > 0 ? subs : [mc];
                const ids = local.categoryIds ?? [];
                return (
                  <div key={mc.id} className={styles.catGroup}>
                    <div className={styles.catGroupLabel} style={{ color: mc.color }}>
                      {mc.name}
                    </div>
                    <div className={styles.catChipRow}>
                      {targets.map(cat => {
                        const active = ids.includes(cat.id);
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
                    </div>
                  </div>
                );
              })}
            <div className={styles.catGroup}>
              <div className={styles.catChipRow}>
                <button className={styles.addCatBtn} onClick={openMgr}>
                  + Kategorie
                </button>
              </div>
            </div>
          </div>
        )}

        <p className={styles.sectionLabel}>Funktion</p>

        {suggestedLabel && (
          <div className={styles.suggestBar}>
            <span className={styles.suggestText}>Wie „{suggestedLabel.name}"?</span>
            <button className={styles.suggestBtn} onClick={() => selectLabel(suggestedLabelId)}>
              Übernehmen
            </button>
          </div>
        )}

        <div className={styles.catSections}>
          <div className={styles.catChipRow}>
            {(labels ?? []).map(label => {
              const active = local.labelId === label.id;
              return (
                <button
                  key={label.id}
                  className={`${styles.catBtn} ${active ? styles.labelActive : ''}`}
                  style={active
                    ? { background: '#5856d6', borderColor: '#5856d6' }
                    : { borderColor: 'rgba(88,86,214,.35)' }
                  }
                  onClick={() => selectLabel(label.id)}
                >
                  <span
                    className={styles.catDot}
                    style={{ background: active ? '#fff' : '#5856d6' }}
                  />
                  {label.name}
                </button>
              );
            })}
            {!showNewLabel && (
              <button
                className={styles.addCatBtn}
                style={{ borderColor: 'rgba(88,86,214,.35)', color: '#5856d6' }}
                onClick={() => setShowNewLabel(true)}
              >
                + Funktion
              </button>
            )}
          </div>

          {showNewLabel && (
            <div className={styles.newLabelRow}>
              <input
                autoFocus
                className={styles.newLabelInput}
                placeholder="Name der Funktion…"
                value={newLabelName}
                onChange={e => setNewLabelName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createLabel();
                  if (e.key === 'Escape') { setShowNewLabel(false); setNewLabelName(''); }
                }}
              />
              <button className={styles.newLabelOk} onClick={createLabel}>OK</button>
              <button className={styles.newLabelCancel} onClick={() => { setShowNewLabel(false); setNewLabelName(''); }}>✕</button>
            </div>
          )}

          {currentLabel && (
            <div className={styles.fixedCostRow}>
              <span className={styles.fixedCostLabel}>Fixkosten</span>
              <button
                className={`${styles.fixToggle} ${currentLabel.isFixedCost ? styles.fixToggleOn : ''}`}
                onClick={() => toggleFixedCost(currentLabel.id)}
              >
                {currentLabel.isFixedCost ? 'Ja' : 'Nein'}
              </button>
            </div>
          )}
        </div>

        <RecurrenceEditor
          tx={local}
          onChange={rec => setLocal(prev => ({ ...prev, recurrence: rec }))}
        />

        <div style={{ height: 'calc(16px + var(--safe-bottom))' }} />
      </div>
    </div>
  );
}
