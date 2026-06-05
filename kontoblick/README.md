# Kontoblick

Ausgaben kategorisieren — eine lokale Web-App für Kontoauszüge.

## Features
- XLSX & CSV drag-and-drop (läuft komplett lokal, kein Upload)
- Eigene Kategorien erstellen und benennen
- Transaktionen einzeln durchklicken und zuordnen
- Wiederkehrende Zahlungen mit Rhythmus & 12-Monats-Zeitstrahl
- Dashboard: Ausgaben nach Kategorie, Budgetverlauf
- Projekt speichern/laden (.json) und CSV-Export

## Stack
- React 19 + Vite
- CSS Modules (kein UI-Framework)
- SheetJS (xlsx) für Datei-Parsing

## Dev

\`\`\`bash
npm install
npm run dev
\`\`\`

## Status

Fertige Komponenten:
- `src/lib/` — parse.js, recurrence.js, format.js (vollständig)
- `src/components/` — NavBar, TabBar, SegControl, DropZone, CategoryManager, RecurrenceEditor, Timeline (vollständig)

TODOs (für Claude Code):
- `TransactionList.jsx` + `TransactionList.module.css`
- `TxSheet.jsx` + `TxSheet.module.css` (Bottom Sheet Detail)
- `Dashboard.jsx` + `Dashboard.module.css`
- `FlowChart.jsx` + `FlowChart.module.css`
- App.jsx: TransactionList + Dashboard stubs durch echte Komponenten ersetzen
