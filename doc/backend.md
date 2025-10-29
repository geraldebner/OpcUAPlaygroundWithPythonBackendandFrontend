# Backend (.NET) — VentilTesterBackend

Dieses Dokument beschreibt das .NET-Backend (Projekt: `VentilTesterBackend`) und seine wichtigsten Komponenten: Services, Controller, Datenmodelle sowie Build- und Run-Anweisungen.

Projekt-Pfad

- `VentilTesterBackend/` — enthält u. a. `VentilTesterBackend.csproj`.

Wichtige Komponenten

- `Program.cs` — Host, DI-Konfiguration, Middleware.
- `OpcUaService.cs` — kapselt die OPC UA Client-Logik (Connect, Read, Write, ExecuteCommand).
- `NodeMapping.cs` (oder `Services/NodeMapping.cs`) — lädt und parst `SPSData/Mapping_Ventiltester.xml` und stellt Block/Group/Item-Strukturen bereit.
- Controller (Beispiele):
  - `ParametersController.cs` — Endpunkte zum Auflisten, Lesen und Schreiben von Parametern.
  - `CommandsController.cs` — Endpunkt `POST /api/commands` für Testauslösung.
  - `LangzeittestController.cs` — liefert Langzeittest-spezifische Daten.
  - `StrommessungController.cs` — liefert Strommessungsdaten und Statusinformationen.
  - `MappingController.cs` — (optional) gibt die geladene Mapping-Struktur zurück.
  - `DatasetsController.cs` — Persistenz von Datasets (speichern/laden aus DB).
- `DataModels.cs` — Datenklassen (POCOs) für API-Antworten.

Konfiguration & Laufzeit

- Standard-Basis-URL: `http://localhost:5000` (kann mit Umgebungsvariablen oder launchSettings angepasst werden).
- DB-Datei (falls verwendet): `database_csharp.db` im Repo-Root.
- Zertifikate: `CertificateStores/` in den jeweiligen Projekt-Ordnern.

Build & Start

```powershell
cd VentilTesterBackend
dotnet build
dotnet run --project VentilTesterBackend
```

Wichtiges Verhalten

- `ExecuteCommand` in `OpcUaService` löst Tests aus und kann vor dem Start optional Werte (z. B. Ventilnummer) in den OPC UA-Server schreiben.
- Die Commands-API verwendet Query-Parameter (`index`, `testType`, `action`, `value`) für einfache Integration mit dem React-Frontend.

Debugging & Logging

- Prüfe die Logs des `OpcUaService` für Verbindungs-, Lese- und Schreibfehler.
- Wenn Verbindungsprobleme mit dem OPC UA Server auftreten: Prüfe Netzwerk, Endpunkt-URL, Zertifikate und ob der Simulator aktiv ist.

Siehe auch `doc/api_endpoints.md` für eine kompakte Übersicht der verfügbaren REST-Endpunkte.
