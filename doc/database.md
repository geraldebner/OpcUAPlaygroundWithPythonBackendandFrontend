 # Datenbank (SQLite) — Schema & Entitäten

 Dieses Dokument beschreibt die relationalen Persistenz-Modelle, die das Backend (`VentilTesterBackend`) aktuell verwendet. Die DB ist eine einfache SQLite-Datei (z. B. `ventiltester.db` oder `database_csharp.db`) und wird per Entity Framework Core verwaltet (`AppDbContext`).

 ## Übersicht der wichtigsten Tabellen

 - `ParameterSets` (Entity-Klasse: `ParameterSet`)
   - Spalten / Eigenschaften:
     - `Id` (int, PK)
     - `Name` (string)
     - `CreatedAt` (DateTime)
     - `Comment` (string, nullable)
     - `BlockIndex` (int)
     - `JsonPayload` (string) — JSON-serialisiertes Objekt mit Block/Gruppen/Items (wird beim Laden des Sets zu einem `Block` deserialisiert)
   - Verwendungszweck: Speichert parameterseitige Konfigurationen (z. B. Einstellwerte die auf ein Ventil-Block geschrieben werden können). Wird von `DatasetsController` verwaltet.

 - `MeasurementSets` (Entity-Klasse: `MeasurementSet`)
   - Spalten / Eigenschaften:
     - `Id` (int, PK)
     - `Name` (string)
     - `CreatedAt` (DateTime)
     - `Comment` (string, nullable)
     - `BlockIndex` (int)
     - `JsonPayload` (string) — JSON-serialisiertes Mess-Snapshot (z. B. Ventil-Werte, Zählerstände)
   - Verwendungszweck: Speichert Mess-Snapshots, die aus `Strommessung` / `Langzeittest` entstehen können. Wird von `MeasurementSetsController` verwaltet.

 ## Hinweise zum Design

 - JSON-Payloads: Beide Tabellen speichern den eigentlichen Inhalt als JSON-String in `JsonPayload`. Das hat Vorteile für Flexibilität (verschiedene Gruppen/Strukturen ohne DB-Migration), aber Nachteile wenn man Abfragen auf innere Felder benötigt (keine relationalen Indizes auf JSON-Inhalt in SQLite ohne Erweiterungen).
 - AppDbContext: `AppDbContext` enthält mindestens die DbSets `ParameterSets` und `MeasurementSets`.
 - Migrationen: Im Repo sind keine automatischen EF-Migrationen committed. Wenn du Migrationen nutzen willst, erzeug diese lokal (`dotnet ef migrations add <Name>`) und update die DB (`dotnet ef database update`).

 ## SQLite DDL Beispiel

 Nachfolgend ein einfaches DDL-Beispiel (SQLite) für die beiden Tabellen — nützlich, um die Struktur schnell in eine leere DB zu schreiben oder zu prüfen:

 ```sql
 CREATE TABLE ParameterSets (
   Id INTEGER PRIMARY KEY AUTOINCREMENT,
   Name TEXT NOT NULL,
   CreatedAt TEXT NOT NULL,
   Comment TEXT,
   BlockIndex INTEGER NOT NULL,
   JsonPayload TEXT NOT NULL
 );

 CREATE TABLE MeasurementSets (
   Id INTEGER PRIMARY KEY AUTOINCREMENT,
   Name TEXT NOT NULL,
   CreatedAt TEXT NOT NULL,
   Comment TEXT,
   BlockIndex INTEGER NOT NULL,
   JsonPayload TEXT NOT NULL
 );
 ```

 ## EF Core: Migration & Update (kurzes Beispiel)

 Falls du EF Core-Tools installiert hast, kannst du lokal Migrationen erzeugen und die Datenbank aktualisieren:

 ```powershell
 # in the VentilTesterBackend project folder
 dotnet tool install --global dotnet-ef          # nur einmal nötig
 dotnet ef migrations add InitialCreate         # erzeugt Migrationen (lokal)
 dotnet ef database update                      # wendet Migrationen an und erstellt/aktualisiert die DB
 ```

 Hinweis: Die Projekt-Assembly und der Startup-Kontext müssen korrekt konfiguriert sein (siehe `Program.cs`). Alternativ kannst du das oben aufgeführte DDL direkt gegen eine SQLite-Datei ausführen (z. B. mit `sqlite3` oder DB-Browser).

 ## PlantUML ER Diagramm

 Unter `doc/diagrams/database_er.puml` befindet sich eine PlantUML-Quelle, die das einfache ER-Diagramm der persistierten Entities enthält. Du kannst sie mit PlantUML rendern (Java + plantuml.jar) oder per VSCode PlantUML-Extension anzeigen.

 Beispiel: Rendern (lokal)

 ```powershell
 # in repo root
 java -jar plantuml.jar doc\\diagrams\\database_er.puml
 ```

 ## Weitere Ideen

 - Falls du häufige Abfragen auf JSON-Inhalt brauchst, überlege:
   - Speichere ausgewählte Index-Felder zusätzlich als eigene Spalten (z. B. `SnapshotType`, `PrimaryValue`).
   - Verwende eine kleine Key-Value-Tabelle für einfache Filter (z. B. dataset tags).

## Schema

~~~plantuml
@startuml
' Simple ER diagram for ParameterSets and MeasurementSets

entity "ParameterSet" as PS {
  * Id : int <<PK>>
  --
  Name : string
  CreatedAt : datetime
  Comment : string
  BlockIndex : int
  JsonPayload : text
}

entity "MeasurementSet" as MS {
  * Id : int <<PK>>
  --
  Name : string
  CreatedAt : datetime
  Comment : string
  BlockIndex : int
  JsonPayload : text
}

' DbContext relation
package "AppDbContext" {
  PS -- MS : contains
}

@enduml

~~~

