# OPC UA Demo Projekt

Dieses Projekt besteht aus mehreren Komponenten:

## Komponenten

1. **Backend (FastAPI)**
   - Pfad: `backend/main.py`
   - REST-API für OPC UA Kommunikation und Datenbankzugriff
   - Verwendet SQLite und python-opcua
   - **API-Test mit Swagger:** Nach dem Start des Backends ist die API-Dokumentation und das Test-Interface unter [http://localhost:8000/docs](http://localhost:8000/docs) erreichbar.

2. **OPC UA Simulationsserver**
   - Pfad: `backend/opcua_simserver.py`
   - Simuliert 20 Werte (10 Simulation, 10 Parameter)
   - Werte ändern sich periodisch und sind beschreibbar

3. **Frontend (React)**
   - Pfad: `frontend/` oder `opcua-frontend/`
   - Zeigt Werte an und erlaubt das Schreiben von Parametern

4. **Konsolen-Client**
   - Pfad: `opcua_console_client.py`
   - Liest alle Werte vom Simulationsserver und zeigt sie in der Konsole

5. **Browse-Script**
   - Pfad: `opcua_browse_nodes.py`
   - Listet alle Namespaces und Variablen des Servers zur Orientierung

---

## Installation

1. **Python installieren** (empfohlen: >=3.8)
2. **Abhängigkeiten installieren**
   ```
   pip install fastapi uvicorn sqlalchemy pydantic opcua
   ```
3. **Node.js und npm installieren** (für das Frontend)

---

## Backend starten

Im Projektordner:
```
python -m backend.main
```
Oder in VS Code mit der Debug-Konfiguration "Python: FastAPI Backend (module)".

---

## OPC UA Simulationsserver starten

Im Projektordner:
```
python backend/opcua_simserver.py
```
Oder in VS Code mit der Debug-Konfiguration "Python: OPCUA Simulation Server".

---

## Frontend starten

Im Ordner `frontend` oder `opcua-frontend`:
```
npm install
npm start
```
Die Anwendung ist dann unter [http://localhost:3000](http://localhost:3000) erreichbar.

---

## Konsolen-Client starten

Im Projektordner:
```
python opcua_console_client.py
```
Zeigt alle Werte des Simulationsservers in der Konsole.

---

## Browse-Script starten

Im Projektordner:
```
python opcua_browse_nodes.py
```
Listet alle Namespaces und Variablen des Servers zur Orientierung.

---

## API-Test mit Swagger

Nach dem Start des Backends ist die interaktive API-Dokumentation unter [http://localhost:8000/docs](http://localhost:8000/docs) verfügbar. Dort können alle Endpunkte direkt getestet werden (z.B. Werte lesen/schreiben, Datenbankzugriff).

---

## Hinweise
- Die NodeIDs können je nach Namespace-Index variieren. Nutze das Browse-Script zur Kontrolle.
- Für Debugging in VS Code gibt es passende launch.json-Konfigurationen.
- Bei Problemen mit Imports: Starte Python-Skripte immer aus dem Projekt-Hauptverzeichnis.

---

## Technologien
- Backend: Python, FastAPI, SQLAlchemy, python-opcua
- Frontend: React (TypeScript)
- Datenbank: SQLite
- OPC UA: Simulation mit python-opcua

---

## Kontakt & Hilfe
Bei Fragen oder Problemen einfach melden!
