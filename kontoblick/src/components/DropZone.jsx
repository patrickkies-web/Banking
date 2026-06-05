import { useState, useRef } from 'react';
import styles from './DropZone.module.css';

export default function DropZone({ onFile, onLoadProject }) {
  const [over, setOver] = useState(false);
  const fileRef  = useRef(null);
  const projRef  = useRef(null);

  function handleDrop(e) {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.zone} ${over ? styles.over : ''}`}
        onDragOver={e => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={handleDrop}
      >
        <div className={styles.icon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>
          </svg>
        </div>

        <h1 className={styles.title}>Ausgaben<br/>kategorisieren</h1>
        <p className={styles.sub}>
          Zieh deinen Kontoauszug als <strong>XLSX</strong> oder <strong>CSV</strong> hierher.
          Alles läuft lokal — nichts verlässt deinen Browser.
        </p>

        <div className={styles.actions}>
          <button className={styles.btnPrimary} onClick={() => fileRef.current.click()}>
            Datei auswählen
          </button>
          <button className={styles.btnGhost} onClick={() => projRef.current.click()}>
            Projekt laden
          </button>
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={e => e.target.files[0] && onFile(e.target.files[0])}
      />
      <input
        ref={projRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={e => e.target.files[0] && onLoadProject(e.target.files[0])}
      />
    </div>
  );
}
