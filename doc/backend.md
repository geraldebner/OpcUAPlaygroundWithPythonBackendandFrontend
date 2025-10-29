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
    - `DatasetsController.cs` — Persistenz von Parameter-Sets (CRUD) und "write"-Action zum Zurückschreiben in OPC UA (`POST /api/datasets/{id}/write`).
    - `MeasurementSetsController.cs` — Persistenz von Mess-Snapshots (Measurements). Endpunkte: GET/POST/GET by id/DELETE und `POST /api/measurementsets/{id}/restore` zum Wiederherstellen eines Mess-Snapshots in den OPC UA-Server.
- `DataModels.cs` — Datenklassen (POCOs) für API-Antworten.

Konfiguration & Laufzeit

- Standard-Basis-URL: `http://localhost:5000` (kann mit Umgebungsvariablen oder launchSettings angepasst werden).
- DB-Datei (falls verwendet): `database_csharp.db` im Repo-Root.
 - DB-Datei (falls verwendet): `ventiltester.db` (oder `database_csharp.db`) im Repo-Root. Die applizierten EF-Core-Entities sind `ParameterSet` und `MeasurementSet`.
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

Neue Persistenz-APIs (Kurz):
- ParameterSets / Datasets: `/api/datasets` (GET list, GET {id}, POST create, DELETE {id})
  - POST body akzeptiert entweder `{ jsonPayload: string }` oder `{ block: { ... } }` (Kompatibilität mit älteren Frontend-Versionen).
  - Write-to-OPC: `POST /api/datasets/{id}/write` — deserialisiert den gespeicherten JSON-Payload zu einem `Block` und schreibt die Werte über `OpcUaService.WriteBlock(blockIndex, block)`.
- MeasurementSets: `/api/measurementsets` (GET list, GET {id}, POST create, DELETE {id})
  - Restore: `POST /api/measurementsets/{id}/restore` — deserialisiert Snapshot und schreibt die Messwerte in OPC UA.

Debugging & Logging

- Prüfe die Logs des `OpcUaService` für Verbindungs-, Lese- und Schreibfehler.
- Wenn Verbindungsprobleme mit dem OPC UA Server auftreten: Prüfe Netzwerk, Endpunkt-URL, Zertifikate und ob der Simulator aktiv ist.

Siehe auch `doc/api_endpoints.md` für eine kompakte Übersicht der verfügbaren REST-Endpunkte.


## Klassendiagramm

~~~plantuml
@startuml
!theme plain

package "Controllers" {
  class ParametersController {
    +GetAllParameters()
    +GetValue(blockIndex:int, group:string, name:string)
    +WriteValue(blockIndex:int, group:string, name:string, payload:object)
  }

  class CommandsController {
    +PostCommand(index:int, testType:string, action:string, value?:string)
    +Ping()
  }

  class LangzeittestController {
    +GetLangzeittest(blockIndex:int)
  }

  class StrommessungController {
    +GetStatus()
    +GetBlock(blockIndex:int)
    +GetAll()
  }
}

package "Services" {
  class OpcUaService {
    -client: OpcUaClient
    +Connect()
    +Read(nodeId:string): object
    +Write(nodeId:string, value:object)
    +ExecuteCommand(index:int, testType:string, action:string, payload?:string)
  }

  class NodeMapping {
    -mappingFile:string
    +Load()
    +GetBlocks(): List<Block>
    +FindNode(blockIndex:int, group:string, name:string): string
  }

  class DatasetService {
    +SaveDataset(name:string, data:object)
    +LoadDataset(name:string): object
  }
}

package "Data" {
  class AppDbContext {
    +Datasets: DbSet<Dataset>
  }

  class Dataset {
    -id: int
    -name: string
    -json: string
  }

  class Models {
    +LangzeittestData
    +StrommessungData
  }
}

' Relationships
ParametersController ..> OpcUaService : uses
ParametersController ..> NodeMapping : uses
CommandsController ..> OpcUaService : uses
LangzeittestController ..> OpcUaService : uses
StrommessungController ..> OpcUaService : uses

DatasetService ..> AppDbContext : uses
AppDbContext *-- Dataset

NodeMapping *-- Models
OpcUaService ..> NodeMapping : resolves nodeIds

@enduml
~~~