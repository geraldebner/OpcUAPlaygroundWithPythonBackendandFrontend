# OPC UA Playground — ausführliche Dokumentation

Dieses Repository ist ein kleines Demo-Projekt, das eine OPC UA Simulationsumgebung, mehrere Backends (Python + C#), Frontends und Konsolen-Clients kombiniert. Ziel ist ein vollständiger Stack zum Testen und Experimentieren mit OPC UA Lese-/Schreibzugriffen und Speicherung in SQLite.

Inhaltsverzeichnis

- Architekturübersicht
- Komponenten (Pfad & Zweck)
- Schnellstart: Entwicklung (lokal)
- Detaillierte Startanweisungen pro Komponente
   - OPC UA Simulationsserver (Python)
   - Python Backend (FastAPI)
   - C# Backend (.NET)
   - React Frontends
   - C# Konsolen-Client (opcua_console_client)
- VS Code: Launch- und Task-Konfigurationen
- Datenbank & Persistenz
- Troubleshooting & häufige Probleme
- Weiterentwicklung & Ideen

---

## Architekturübersicht

Kurz: Ein OPC UA Simulationsserver stellt Nodes bereit. Backends (Python oder C#) lesen diese Nodes periodisch, speichern aktuelle und historische Werte in einer SQLite-Datenbank und bieten eine REST-API. Frontends (React) visualisieren die Werte und erlauben Schreiboperationen. Zusätzlich gibt es eine einfache C#-Konsole zum ad-hoc Lesen/Schreiben von NodeIds.

Komponenten kommunizieren in der Regel über:

- OPC UA (`opc.tcp://localhost:4840`)
- REST API (Standard: `http://localhost:8000` für Backends)

---

## Komponenten (Pfad & Zweck)

   - OPC UA Simulationsserver (Python)
      - Pfad: `backend_python/opcua_simserver.py`
      - Simuliert mehrere DeviceX.SimValueY / DeviceX.ParamValueY Nodes (beschreibbar, ändern sich periodisch)

   - Python Backend (FastAPI)
      - Pfad: `backend_python/main.py` und `backend_python/models.py`
      - Liest OPC UA Nodes (als Client), speichert CurrentValue/HistoricalValue in SQLite (`database.db`) und stellt REST-Endpunkte bereit (`/status`, `/sim_values`, `/param_values`, `/historical_values`, `/read_opcua`, `/write_opcua`, ...).

   - C# Backend (.NET)
      - Pfad: `backend_csharp/`
      - Funktionsäquivalent zum Python-Backend. Nutzt `Opc.UaFx.Client`, EF Core (SQLite) und liefert die gleichen REST-Endpunkte wie das Python-Backend.

   - React Frontends
      - Pfade: `frontend/` (Entwicklungs-UI) und `opcua-frontend/` (fertig gebaute Variante im `build/`)
      - Konsumieren die Backend-REST-API unter `http://localhost:8000` und zeigen aktuelle/historische Werte an.

   - C# Konsolen-Client
      - Pfad: `opcua_console_client/` (Projekt: `opcua_console_client.csproj`)
      - Minimaler REPL-Client (uses `Opc.UaFx.Client`) — erlaubt `read <nodeId>` und `write <nodeId> <value>`; Server-URL ist konfigurierbar.

   - Utilities
      - `opcua_browse_nodes.py` — kleines Hilfsscript zum Browsen des OPC UA Servers

---

## Schnellstart (Entwicklung)

Voraussetzungen

- .NET 6 SDK (für das C# Backend und den Konsolen-Client)
- Python 3.10+ (für FastAPI Backend & SimServer)
- Node.js + npm (für Frontend)

Empfohlene Reihenfolge zum Starten lokal:
1. OPC UA Simulationsserver starten
2. Backend starten (Python oder C#)
3. Frontend starten
4. Optional: Konsolen-Client starten für manuelle Tests

---

## Detaillierte Startanweisungen

Hinweis: Befehle sind PowerShell-kompatibel (Windows). Passe Pfade an, wenn Du eine andere Shell benutzt.

### OPC UA Simulationsserver (Python)

Starten (im Repo-Root):

```powershell
cd .
python -m backend_python.opcua_simserver
```

oder

```powershell
python backend_python/opcua_simserver.py
```

Der Server stellt standardmäßig `opc.tcp://localhost:4840` bereit.

### Python Backend (FastAPI)

Voraussetzungen installieren:

```powershell
pip install -r backend_python/requirements.txt
# Wenn keine requirements.txt vorhanden ist, z.B.:
pip install fastapi uvicorn sqlalchemy pydantic opcua
```

Starten:

```powershell
cd backend_python
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Swagger/OpenAPI: [http://localhost:8000/docs](http://localhost:8000/docs)

### C# Backend (.NET)

Build & Run (aus Repo root):

```powershell
dotnet build backend_csharp
dotnet run --project backend_csharp --urls "http://localhost:8000"
```

Das C# Backend benutzt `Opc.UaFx.Client` als OPC UA Client und EF Core (SQLite) für die Datenpersistenz. Standard-Port: 8000 (gleich wie Python-Backend).

### Frontend (React)

Install + Start (im Repo root):

```powershell
cd frontend
npm install
# Falls Port 3000 bereits in Benutzung ist (interaktives Prompt), starte non-interaktiv auf Port 3001:
$env:PORT=3001; npm start
```

Öffne dann http://localhost:3000 oder http://localhost:3001 (falls gesetzt).

Das Projekt enthält außerdem einen vorgefertigten `opcua-frontend/build` Ordner (statisch gebaute Variante).

### C# Konsolen-Client (opcua_console_client)

Build & Run:

```powershell
dotnet build opcua_console_client
dotnet run --project opcua_console_client -- <opc.tcp url?>
# Beispiel ohne Argument: dotnet run --project opcua_console_client
# Beispiel mit URL: dotnet run --project opcua_console_client -- "opc.tcp://localhost:4840"
```

Alternativ kannst Du die Server-URL per Environment-Variable setzen:

```powershell
$env:OPCUA_SERVER_URL = "opc.tcp://localhost:4840"
dotnet run --project opcua_console_client
```

Verfügbare Konsolenbefehle (REPL):
- help — Zeigt Hilfe
- read <nodeId> — Liest Wert aus Node
- write <nodeId> <value> — Schreibt Wert (der Client versucht Typen zu erkennen: bool, long, int, double, string)
- exit / quit — Beendet den Client

Beispiel:

```
> read ns=2;s=Device1.SimValue1
> write ns=2;s=Device1.ParamValue1 42.5
```

Nach einem `write` liest der Client den Wert zurück und zeigt die gespeicherte Repräsentation an.

---

## VS Code: Launch & Tasks

Die mitgelieferten VS Code Dateien sind:
- `.vscode/launch.json` — Debug-Konfigurationen für:
   - Python FastAPI Backend
   - OPC UA Simulationsserver (Python)
   - C# Backend (coreclr)
   - C# OPCUA Console Client (coreclr)
   - Frontend (öffnet den Browser; preLaunchTask: startet `npm start`)
- `.vscode/tasks.json` — Tasks:
   - `build backend_csharp` — `dotnet build` für das C# Backend
   - `start frontend` — `npm start` (istBackground: true) — Problem matcher `$tsc-watch` eingestellt
   - `start opcua-frontend` — analog für das zweite Frontend

Wenn Du die Launch-Konfigurationen verwendest, baut VS Code die Projekte (preLaunchTask) und öffnet Terminals für die interaktiven Prozesse.

---

## Datenbank & Persistenz

- Datei: `database.db` (SQLite) im Repo-Root. Enthält Tabellen für Devices, CurrentValues und HistoricalValues.
- Beide Backends (Python/C#) nutzen eine gleiche/ähnliche Schema-Struktur, sodass Frontends gegen beide Backends arbeiten können.

Wichtig: Wenn Du das Schema änderst, sichere die DB-Datei oder nutze eine neue DB-Datei, um Inkonsistenzen zu vermeiden.

---

## Troubleshooting & Häufige Probleme

- Port 3000 bereits in Benutzung (Frontend)
   - Create React App fragt interaktiv, ob ein anderer Port verwendet werden soll. Für nicht-interaktive Starts setze `PORT` vorher:
      ```powershell
      $env:PORT=3001; npm start
      ```

- VS Code-Fehler: "The task 'start frontend' has not exited and doesn't have a 'problemMatcher' defined"
   - Lösung: `.vscode/tasks.json` enthält nun `"problemMatcher": ["$tsc-watch"]` für `npm start`-Tasks. Das beseitigt die Warnung.

- React runtime error: "Objects are not valid as a React child"
   - Ursache: API hat komplexe OPC UA Objekte (z.B. OpcValue) zurückgeliefert; Frontend versuchte, diese direkt in JSX zu rendern.
   - Lösung: Backend konvertiert OPC UA Werte in primitive Typen oder Strings. Frontend rendert komplexe Werte mit `renderValue()`.

- C# Backend: InvalidCastException beim Lesen von OpcValue
   - Ursache: Direct Convert.ToDouble auf `OpcValue` ist nicht möglich.
   - Lösung: Im `OpcUaService` gibt es Helper `ToDouble`/`ToNullableDouble`, die OpcValue entpacken und sichere Konvertierung versuchen.

- OPC UA Verbindung schlägt fehl
   - Prüfe, ob `backend_python/opcua_simserver.py` läuft.
   - Standard-URL: `opc.tcp://localhost:4840` — passe `OPCUA_SERVER_URL` oder CLI-Arg des Konsolen-Clients an.

---

## Weiterentwicklung & Ideen

- Mehr Tests: kleine Integrationstests, die den Sim-Server, Backend und Frontend short-circuit testen.
- Authentifizierung/Autorisierung für die REST-API (falls produktiv).
- Typ-sicheres Schreiben: Backend/Client könnten per NodeId Metadaten lesen (DataType) und Schreibwerte korrekt typisieren.
- Containerisierung: Dockerfiles für jeden Dienst (sim server, backend, frontend) für einfache Reproduzierbarkeit.

---

Wenn Du möchtest, erweitere ich die README noch um ein kurzes "How to debug"-Kapitel (VS Code Breakpoints, Attach to Process) oder erstelle eine separate `docs/`-Ordnerstruktur mit Schritt-für-Schritt Guides.

Wenn etwas in Deiner lokalen Struktur anders ist (z.B. Projekt-Ordner wurde verschoben), sag mir kurz, wo Du die Datei(en) hingeschoben hast; ich aktualisiere Paths und Launch/Task-Konfigurationen entsprechend.

Viel Erfolg beim Testen — sag mir, welche Sektion ich noch vertiefen oder ergänzen soll.
