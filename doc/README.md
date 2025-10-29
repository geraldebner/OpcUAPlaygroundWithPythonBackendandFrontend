# Projekt-Dokumentation

Dieses Verzeichnis enthält die Projekt-Dokumentation für den VentilTester Playground.

Enthaltene Dokumente:

- `simulator.md` — Beschreibung des Python OPC UA Simulators und wie man ihn startet.
- `backend.md` — Beschreibung des .NET (VentilTesterBackend) Backends, seiner Services, Controller und wie man es baut/startet.
- `api_endpoints.md` — Auflistung und Beispiele der HTTP-API-Endpunkte.
- `frontend.md` — Beschreibung des React-Frontends, wichtiger Komponenten und Konfiguration.

Kurze Hinweise:

- Empfohlene Reihenfolge zum Starten für lokale Tests: zuerst den Python-Simulator starten, dann das Backend (`dotnet run`), zuletzt das Frontend (`npm start`).
- Standard-API-Basis-URL (wenn nicht konfiguriert): `http://localhost:5000`.
