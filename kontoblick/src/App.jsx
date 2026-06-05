import { useState, useRef } from 'react'
import { parseFile } from './lib/parse.js'
import NavBar from './components/NavBar.jsx'
import TabBar from './components/TabBar.jsx'
import SegControl from './components/SegControl.jsx'
import DropZone from './components/DropZone.jsx'
import CategoryManager from './components/CategoryManager.jsx'
import TransactionList from './components/TransactionList.jsx'
import Dashboard from './components/Dashboard.jsx'
import styles from './App.module.css'

export default function App() {
  const [txs,      setTxs]      = useState([])
  const [cats,     setCats]     = useState([])
  const [tab,      setTab]      = useState('inbox')
  const [filter,   setFilter]   = useState('open')
  const [mgr,      setMgr]      = useState(false)
  const [toast,    setToast]    = useState('')
  const [fileName, setFileName] = useState('')
  const projRef = useRef(null)
  const toastTimer = useRef(null)

  function flash(msg) {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  async function handleFile(file) {
    try {
      const parsed = await parseFile(file)
      if (!parsed.length) { flash('Keine Transaktionen erkannt'); return }
      setTxs(parsed)
      setFileName(file.name)
      setTab('inbox')
      setFilter('open')
      flash(`${parsed.length} Transaktionen geladen`)
    } catch (e) {
      flash('Fehler: ' + e.message)
    }
  }

  function saveProject() {
    const blob = new Blob(
      [JSON.stringify({ version: 2, fileName, txs, cats }, null, 2)],
      { type: 'application/json' }
    )
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = (fileName.replace(/\.[^.]+$/, '') || 'kontoblick') + '.kontoblick.json'
    a.click()
    flash('Projekt gespeichert')
  }

  function loadProject(file) {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const d = JSON.parse(e.target.result)
        // migrate old single-categoryId format
        const txs = (d.txs || []).map(t =>
          t.categoryIds ? t : { ...t, categoryIds: t.categoryId ? [t.categoryId] : [] }
        )
        setTxs(txs)
        setCats(d.cats || [])
        setFileName(d.fileName || '')
        setTab('inbox')
        flash('Projekt geladen')
      } catch { flash('Ungültige Projektdatei') }
    }
    reader.readAsText(file)
  }

  function exportCSV() {
    const catById = Object.fromEntries(cats.map(c => [c.id, c]))
    const head = ['Datum','Typ','Empfänger','Betrag','Zweck','Kategorie','Rhythmus']
    const rows = txs.map(t => {
      const catNames = (t.categoryIds ?? []).map(id => catById[id]?.name).filter(Boolean).join(', ')
      const r = t.recurrence
      return [
        t.date, t.type, t.payee,
        String(t.amount).replace('.', ','),
        t.purpose,
        catNames,
        r ? r.freq : '',
      ].map(v => {
        v = v == null ? '' : String(v)
        return /[";]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
      }).join(';')
    })
    const csv = '\ufeff' + [head.join(';'), ...rows].join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'kategorisiert.csv'
    a.click()
    flash('CSV exportiert')
  }

  const openCount = txs.filter(t => !(t.categoryIds ?? []).length).length
  const doneCount = txs.filter(t =>  !!(t.categoryIds ?? []).length).length

  if (!txs.length) {
    return (
      <>
        <DropZone onFile={handleFile} onLoadProject={loadProject} />
        {toast && <div className={styles.toast}>{toast}</div>}
      </>
    )
  }

  return (
    <div className={styles.app}>
      <NavBar
        title={tab === 'inbox' ? 'Postfach' : 'Dashboard'}
        subtitle={tab === 'inbox' ? fileName : undefined}
        action={{ label: 'Kategorien', onPress: () => setMgr(true) }}
      />

      {tab === 'inbox' && (
        <div className={styles.segWrap}>
          <SegControl
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'open',  label: 'Offen',    badge: openCount },
              { value: 'done',  label: 'Erledigt'                    },
              { value: 'all',   label: 'Alle'                        },
            ]}
          />
        </div>
      )}

      <div className={styles.content}>
        {tab === 'inbox'
          ? <TransactionList
              txs={txs} setTxs={setTxs}
              cats={cats}
              filter={filter}
              openMgr={() => setMgr(true)}
            />
          : <Dashboard txs={txs} cats={cats} />
        }
      </div>

      {/* Floating action buttons */}
      <div className={styles.fabs}>
        <button className={`${styles.fab} ${styles.fabGray}`} onClick={saveProject}>💾 Speichern</button>
        <button className={`${styles.fab} ${styles.fabBlue}`} onClick={exportCSV}>CSV exportieren</button>
      </div>

      <TabBar active={tab} onChange={setTab} />

      <CategoryManager
        open={mgr}
        cats={cats} setCats={setCats}
        txs={txs}   setTxs={setTxs}
        onClose={() => setMgr(false)}
      />

      {toast && <div className={`${styles.toast} ${toast ? styles.toastShow : ''}`}>{toast}</div>}

      {/* Hidden project file input */}
      <input
        ref={projRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={e => e.target.files[0] && loadProject(e.target.files[0])}
      />
    </div>
  )
}
