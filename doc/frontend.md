# Frontend (React)

Dieses Dokument beschreibt das React-Frontend (`ventiltester-frontend`) — Ordnerstruktur, wichtige Komponenten und wie man das Frontend startet bzw. konfiguriert.

Ort im Repository

- `ventiltester-frontend/` — enthält `package.json`, `public/` und `src/`.

Wichtige Skripte

- Development: `npm start` — startet den Entwicklungsserver (Standard: http://localhost:3000).
- Build (Production): `npm run build` — erzeugt das Produktions-Bundle.

Installation (Beispiel PowerShell):

```powershell
cd ventiltester-frontend
npm install
npm start
```

Konfiguration

- API Basis-URL: Standardmäßig verwendet die App `http://localhost:5000`. Du kannst eine andere Basis-URL setzen, indem Du die Umgebungsvariable `REACT_APP_API_BASE` setzt (z. B. in `.env`):

```
REACT_APP_API_BASE=http://dein-backend:5000
```

Wichtige Dateien / Komponenten

- `src/App.js` — Top-Level-App, rendert die beiden Hauptfenster/Ansichten (Parameters und Commands & Measurements) und Header/Logo.
- `src/components/ParametersView.js` — Ansicht zum Lesen/Schreiben von Parametern, Speichern/Laden von Datasets.
- `src/components/CommandsMeasurementsView.js` — Ansicht mit Command-Buttons (Langzeittest, Detailtest, Einzeltest) sowie Live-Measurement-Panel und per-Wert-Read-Buttons.
- `src/App.css` — zentrale Styling-Regeln, einschließlich Header/Logo-Größen.
- `public/binder_logo.svg` (oder `binder_logo.png`) — Header-Logo; kopiere Dein Firmen-PNG in `public/` wenn Du das bevorzugst.

UX/Hinweise

- Die Commands-API wird als `POST` mit Query-Parametern aufgerufen (z. B. `POST /api/commands?index=1&testType=Einzeltest&action=start&value=5`).
- Live-Daten im Commands-Fenster nutzen aktuell eine Heuristik zur Gruppenerkennung (Gruppennamen, die `Daten`, `Strom` oder `Kommand` enthalten). Wir können das auf die deterministische Mapping-Liste umstellen — sag mir, wenn ich das ändern soll.

Fehlersuche

- Falls das Frontend keine Daten lädt: prüfe die Browser-Konsole (CORS/403/404) und ob das Backend unter der erwarteten `API_BASE` läuft.
