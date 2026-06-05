import { useState, useRef, useEffect } from 'react'
import { parseFile } from './lib/parse.js'
import NavBar from './components/NavBar.jsx'
import TabBar from './components/TabBar.jsx'
import SegControl from './components/SegControl.jsx'
import DropZone from './components/DropZone.jsx'
import CategoryManager from './components/CategoryManager.jsx'
import TransactionList from './components/TransactionList.jsx'
import Dashboard from './components/Dashboard.jsx'
import styles from './App.module.css'

const STORAGE_KEY = 'kontoblick_v1'

// special: 'income' | 'transfer' | 'discretionary' → Dashboard treats them separately
const DEFAULT_CATS = [
  { id: 'dc_auszahlung',  name: 'Auszahlung',           color: '#af52de', special: 'discretionary' },
  { id: 'dc_einnahmen',   name: 'Einnahmen',            color: '#34c759', special: 'income' },
  { id: 'dc_gesundheit',  name: 'Gesundheit',           color: '#ff3b30' },
  { id: 'dc_kleidung',    name: 'Kleidung & Shopping',  color: '#ff6b35' },
  { id: 'dc_lebens',      name: 'Lebensmittel',         color: '#30b0c7' },
  { id: 'dc_reisen',      name: 'Reisen & Urlaub',      color: '#5856d6' },
  { id: 'dc_restaurant',  name: 'Restaurant & Café',    color: '#ff2d55' },
  { id: 'dc_sonstiges',   name: 'Sonstiges',            color: '#aeaeb2' },
  { id: 'dc_streaming',   name: 'Streaming & Abos',     color: '#ffcc00' },
  { id: 'dc_telefon',     name: 'Telefon & Internet',   color: '#5ac8fa' },
  { id: 'dc_transport',   name: 'Transport',            color: '#ff9500' },
  { id: 'dc_uebertrag',   name: 'Übertrag',             color: '#636366', special: 'transfer' },
  { id: 'dc_versich',     name: 'Versicherungen',       color: '#af52de' },
  { id: 'dc_wohnen',      name: 'Wohnen & Nebenkosten', color: '#007aff' },
]

function migrateTxs(txs) {
  return (txs || []).map(t =>
    t.categoryIds ? t : { ...t, categoryIds: t.categoryId ? [t.categoryId] : [] }
  )
}

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d?.txs?.length) return null
    return { txs: migrateTxs(d.txs), cats: d.cats?.length ? d.cats : DEFAULT_CATS, fileName: d.fileName || '' }
  } catch { return null }
}

const _stored = loadStorage()

export default function App() {
  const [txs,      setTxs]      = useState(_stored?.txs      ?? [])
  const [cats,     setCats]     = useState(_stored?.cats ?? DEFAULT_CATS)
  const [tab,      setTab]      = useState('inbox')
  const [filter,   setFilter]   = useState('open')
  const [mgr,      setMgr]      = useState(false)
  const [toast,    setToast]    = useState(_stored ? 'Projekt wiederhergestellt' : '')
  const [fileName, setFileName] = useState(_stored?.fileName ?? '')
  const projRef = useRef(null)
  const toastTimer = useRef(null)

  // Auto-save to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ txs, cats, fileName }))
    } catch {}
  }, [txs, cats, fileName])

  // Clear initial restore toast
  useEffect(() => {
    if (!_stored) return
    toastTimer.current = setTimeout(() => setToast(''), 2400)
    return () => clearTimeout(toastTimer.current)
  }, [])

  function handleReset() {
    if (!confirm('Alle Daten löschen und neu starten?')) return
    localStorage.removeItem(STORAGE_KEY)
    setTxs([])
    setCats([])
    setFileName('')
    setTab('inbox')
    setFilter('open')
  }

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
        setTxs(migrateTxs(d.txs))
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
        leftAction={{ label: '← Neue Datei', onPress: handleReset }}
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
