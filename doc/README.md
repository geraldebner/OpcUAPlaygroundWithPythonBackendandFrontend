# Projekt-Dokumentation

Dieses Verzeichnis enthält die Projekt-Dokumentation für den VentilTester Playground.

Enthaltene Dokumente:

- `simulator.md` — Beschreibung des Python OPC UA Simulators und wie man ihn startet.
- `backend.md` — Beschreibung des .NET (VentilTesterBackend) Backends, seiner Services, Controller und wie man es baut/startet.
- `api_endpoints.md` — Auflistung und Beispiele der HTTP-API-Endpunkte.
- `frontend.md` — Beschreibung des React-Frontends, wichtiger Komponenten und Konfiguration.
- `database.md` — Beschreibung der persistierten Entitäten, DB-Datei und PlantUML ER-Diagramm.

Diagrams:
- `doc/diagrams/database_er.puml` — PlantUML-Quelle für ein kleines ER-Diagramm der persistierten Entities.

Kurze Hinweise:

- Empfohlene Reihenfolge zum Starten für lokale Tests: zuerst den Python-Simulator starten, dann das Backend (`dotnet run`), zuletzt das Frontend (`npm start`).
- Standard-API-Basis-URL (wenn nicht konfiguriert): `http://localhost:5000`.


## Komponenten

~~~plantuml

@startuml
!theme plain

package "Frontend" {
  [React App] as Frontend
}

package "Backend" {
  [ASP.NET Web API] as Backend
  [OpcUaService] as OpcUaService
  [NodeMapping] as NodeMapping
  [Controllers] as Controllers
  [AppDb (SQLite)] as Database
}

package "Simulator" {
  [Python OPC UA Simulator] as Simulator
}

Frontend -down-> Backend : HTTP (REST) /api/...
Backend -down-> OpcUaService : uses
OpcUaService -down-> Simulator : OPC UA (Read/Write)
Backend --> Database : read/write datasets
Backend --> NodeMapping : load mapping
Controllers --> OpcUaService : call read/write/execute

@enduml
~~~