# API Endpoints (Übersicht)

Diese Datei listet die wichtigsten HTTP-API-Endpunkte des Backends auf, ihre HTTP-Methoden, Parameter und kurze Beispielantworten.

Basis-URL (Beispiel): `http://localhost:5000`

1. GET /api/parameters

   - Beschreibung: Liefert alle bekannten Blocks mit Gruppen und Items (Mapping-basiert).
   - Beispiel: `GET http://localhost:5000/api/parameters`
   - Antwort (auszugsweise):

   ```json
   [
     { "blockIndex": 1, "name": "Block 1", "groups": [ "Konfiguration_Langzeittest", "Kommands/Langzeittest", "Daten_Langzeittest" ]},
     { "blockIndex": 2, "name": "Block 2", "groups": [ "Konfiguration_Detailtest", "Kommands/Detailtest", "Daten_Strommessung/Ventil1" ]}
   ]
   ```

2. GET /api/parameters/{blockIndex}/value?group={group}&name={name}

   - Beschreibung: Liest den aktuellen Wert eines einzelnen Parameters aus dem OPC UA-Server.
   - Beispiel: `GET /api/parameters/1/value?group=Daten_Langzeittest&name=AktuellerPlatzzaehler`
   - Antwort:

   ```json
   { "value": 123, "timestamp": "2025-10-29T12:34:56Z" }
   ```

3. POST /api/parameters/{blockIndex}/value?group={group}&name={name}

   - Beschreibung: Schreibt einen Wert in den OPC UA-Server. Body: `{ "value": <value> }`.
   - Beispiel (PowerShell):

   ```powershell
   Invoke-RestMethod -Method Post -Uri "http://localhost:5000/api/parameters/1/value?group=Konfiguration_Langzeittest&name=Intervall" -Body (@{ value = 500 } | ConvertTo-Json) -ContentType 'application/json'
   ```

4. POST /api/commands?index={blockIndex}&testType={type}&action={action}&value={optional}

   - Beschreibung: Löst einen Test/Command im Backend aus (z. B. `Langzeittest`, `Detailtest`, `Einzeltest`).
   - Parameter:

     - `index` (int): Block-Index
     - `testType` (string): z. B. `Langzeittest`/`Detailtest`/`Einzeltest`
     - `action` (string): z. B. `start`/`stop`
     - `value` (optional): Nutzdaten (z. B. Ventilnummer)

   - Beispiel:

   ```text
   POST http://localhost:5000/api/commands?index=1&testType=Einzeltest&action=start&value=5
   ```

5. GET /api/commands/ping

   - Beschreibung: Health-check / Ping für die Commands-API.

6. GET /api/langzeittest/{blockIndex}

   - Beschreibung: Liefert strukturierte Langzeittest-Daten (z. B. Zaehler pro Ventil, aktueller Index, Status).

7. GET /api/strommessung/status

   GET /api/strommessung/block/{blockIndex}

   GET /api/strommessung/all

   - Beschreibung: Endpunkte zur Abfrage von Strommessungs-Status, Block-spezifischen Messdaten und Gesamtliste.

8. GET /api/mapping

   - Beschreibung: Gibt die geparste Mapping-Struktur des Backends zurück (Blocks/Gruppen/Items). Nützlich, um die UI deterministisch zu generieren.

Hinweis

- Diese Endpunkte sind eine Zusammenfassung der implementierten Routen. Für exakte Parameternamen, mögliche zusätzliche Query-Parameter oder verfeinerte Response-Formate siehe die Quellcode-Dateien unter `VentilTesterBackend/Controllers`.
