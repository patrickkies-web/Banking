import { useState, useRef, useEffect } from 'react'
import { parseFile } from './lib/parse.js'
import NavBar from './components/NavBar.jsx'
import TabBar from './components/TabBar.jsx'
import SegControl from './components/SegControl.jsx'
import DropZone from './components/DropZone.jsx'
import CategoryManager from './components/CategoryManager.jsx'
import TransactionList from './components/TransactionList.jsx'
import Dashboard from './components/Dashboard.jsx'
import Forecast from './components/Forecast.jsx'
import styles from './App.module.css'

const STORAGE_KEY = 'kontoblick_v1'

const DEFAULT_CATS = [
  // Main categories
  { id: 'mc_kinder',   name: 'Kinder',                  color: '#ff9500', parentId: null },
  { id: 'mc_haush',    name: 'Haushalt',                 color: '#34c759', parentId: null },
  { id: 'mc_fixk',     name: 'Fixkosten & Nebenkosten',  color: '#5856d6', parentId: null },
  { id: 'mc_vertr',    name: 'Verträge',                 color: '#007aff', parentId: null },
  { id: 'mc_mobil',    name: 'Mobilität',                color: '#ff6b35', parentId: null },
  { id: 'mc_gesund',   name: 'Gesundheit',               color: '#ff3b30', parentId: null },
  { id: 'mc_freizeit', name: 'Freizeit & Shopping',      color: '#ff2d55', parentId: null },
  { id: 'mc_einn',     name: 'Einnahmen',                color: '#34c759', parentId: null, special: 'income' },
  { id: 'mc_uebtr',    name: 'Überträge',                color: '#636366', parentId: null, special: 'transfer' },
  { id: 'mc_sonst',    name: 'Sonstiges',                color: '#aeaeb2', parentId: null },
  // Kinder
  { id: 'sc_k_kleid',  name: 'Kleidung Kinder',          color: '#ff9500', parentId: 'mc_kinder' },
  { id: 'sc_k_essen',  name: 'Essen Kinder',             color: '#ff9500', parentId: 'mc_kinder' },
  { id: 'sc_k_spiel',  name: 'Spielzeug & Freizeit',     color: '#ff9500', parentId: 'mc_kinder' },
  { id: 'sc_k_schule', name: 'Schule & Kita',            color: '#ff9500', parentId: 'mc_kinder' },
  // Haushalt
  { id: 'sc_h_lebens', name: 'Lebensmittel',             color: '#34c759', parentId: 'mc_haush' },
  { id: 'sc_h_drog',   name: 'Drogerie',                 color: '#34c759', parentId: 'mc_haush' },
  { id: 'sc_h_reinig', name: 'Reinigung & Haushalt',     color: '#34c759', parentId: 'mc_haush' },
  { id: 'sc_h_einr',   name: 'Möbel & Einrichtung',      color: '#34c759', parentId: 'mc_haush' },
  // Fixkosten
  { id: 'sc_f_miete',  name: 'Miete / Hypothek',         color: '#5856d6', parentId: 'mc_fixk' },
  { id: 'sc_f_strom',  name: 'Strom',                    color: '#5856d6', parentId: 'mc_fixk' },
  { id: 'sc_f_gas',    name: 'Gas & Heizung',            color: '#5856d6', parentId: 'mc_fixk' },
  { id: 'sc_f_wasser', name: 'Wasser',                   color: '#5856d6', parentId: 'mc_fixk' },
  { id: 'sc_f_gez',    name: 'Rundfunk',                 color: '#5856d6', parentId: 'mc_fixk' },
  // Verträge
  { id: 'sc_v_telefon',name: 'Telefon & Internet',       color: '#007aff', parentId: 'mc_vertr' },
  { id: 'sc_v_stream', name: 'Streaming & Abos',         color: '#007aff', parentId: 'mc_vertr' },
  { id: 'sc_v_versich',name: 'Versicherungen',           color: '#007aff', parentId: 'mc_vertr' },
  // Mobilität
  { id: 'sc_m_tanken', name: 'Tanken',                   color: '#ff6b35', parentId: 'mc_mobil' },
  { id: 'sc_m_auto',   name: 'Auto (Steuer & Wartung)',  color: '#ff6b35', parentId: 'mc_mobil' },
  { id: 'sc_m_oepu',   name: 'ÖPNV',                    color: '#ff6b35', parentId: 'mc_mobil' },
  // Gesundheit
  { id: 'sc_g_apoth',  name: 'Apotheke & Medikamente',  color: '#ff3b30', parentId: 'mc_gesund' },
  { id: 'sc_g_arzt',   name: 'Arzt & Krankenhaus',      color: '#ff3b30', parentId: 'mc_gesund' },
  { id: 'sc_g_sport',  name: 'Fitness & Sport',         color: '#ff3b30', parentId: 'mc_gesund' },
  // Freizeit
  { id: 'sc_fr_rest',  name: 'Restaurant & Café',       color: '#ff2d55', parentId: 'mc_freizeit' },
  { id: 'sc_fr_reis',  name: 'Reisen & Urlaub',         color: '#ff2d55', parentId: 'mc_freizeit' },
  { id: 'sc_fr_shop',  name: 'Kleidung & Shopping',     color: '#ff2d55', parentId: 'mc_freizeit' },
  // Einnahmen
  { id: 'sc_e_gehalt', name: 'Gehalt',                  color: '#34c759', parentId: 'mc_einn', special: 'income' },
  { id: 'sc_e_neben',  name: 'Nebeneinkommen',          color: '#34c759', parentId: 'mc_einn', special: 'income' },
  // Überträge
  { id: 'sc_u_uebtr',  name: 'Übertrag',                color: '#636366', parentId: 'mc_uebtr', special: 'transfer' },
  { id: 'sc_u_ausz',   name: 'Auszahlung',              color: '#af52de', parentId: 'mc_uebtr', special: 'discretionary' },
]

function migrateTxs(txs) {
  return (txs || []).map(t =>
    t.categoryIds ? t : { ...t, categoryIds: t.categoryId ? [t.categoryId] : [] }
  )
}

function migrateCats(cats) {
  return (cats || []).map(c => 'parentId' in c ? c : { ...c, parentId: null })
}

function loadStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const d = JSON.parse(raw)
    if (!d?.txs?.length) return null
    return {
      txs: migrateTxs(d.txs),
      cats: migrateCats(d.cats?.length ? d.cats : DEFAULT_CATS),
      labels: d.labels ?? [],
      fileName: d.fileName || '',
    }
  } catch { return null }
}

const _stored = loadStorage()

export default function App() {
  const [txs,      setTxs]      = useState(_stored?.txs      ?? [])
  const [cats,     setCats]     = useState(_stored?.cats      ?? DEFAULT_CATS)
  const [labels,   setLabels]   = useState(_stored?.labels    ?? [])
  const [tab,      setTab]      = useState('inbox')
  const [filter,   setFilter]   = useState('open')
  const [mgr,      setMgr]      = useState(false)
  const [toast,    setToast]    = useState(_stored ? 'Projekt wiederhergestellt' : '')
  const [fileName, setFileName] = useState(_stored?.fileName  ?? '')
  const projRef = useRef(null)
  const toastTimer = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ txs, cats, labels, fileName }))
    } catch {}
  }, [txs, cats, labels, fileName])

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
    setLabels([])
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
      [JSON.stringify({ version: 3, fileName, txs, cats, labels }, null, 2)],
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
        setLabels(d.labels ?? [])
        setFileName(d.fileName || '')
        setTab('inbox')
        flash('Projekt geladen')
      } catch { flash('Ungültige Projektdatei') }
    }
    reader.readAsText(file)
  }

  function exportCSV() {
    const catById   = Object.fromEntries(cats.map(c => [c.id, c]))
    const labelById = Object.fromEntries(labels.map(l => [l.id, l]))
    const head = ['Datum','Typ','Empfänger','Betrag','Zweck','Kategorie','Funktion','Zeitraum','Rhythmus']
    const rows = txs.map(t => {
      const catNames   = (t.categoryIds ?? []).map(id => catById[id]?.name).filter(Boolean).join(', ')
      const labelName  = t.labelId ? (labelById[t.labelId]?.name ?? '') : ''
      const r = t.recurrence
      return [
        t.date, t.type, t.payee,
        String(t.amount).replace('.', ','),
        t.purpose,
        catNames,
        labelName,
        t.period ?? '',
        r ? r.freq : '',
      ].map(v => {
        v = v == null ? '' : String(v)
        return /[";]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
      }).join(';')
    })
    const csv = '﻿' + [head.join(';'), ...rows].join('\r\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = 'kategorisiert.csv'
    a.click()
    flash('CSV exportiert')
  }

  const openCount = txs.filter(t => !(t.categoryIds ?? []).length).length

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
        title={tab === 'inbox' ? 'Postfach' : tab === 'forecast' ? 'Vorschau' : 'Dashboard'}
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
              labels={labels} setLabels={setLabels}
              filter={filter}
              openMgr={() => setMgr(true)}
            />
          : tab === 'forecast'
          ? <Forecast txs={txs} />
          : <Dashboard txs={txs} cats={cats} labels={labels} />
        }
      </div>

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
