# Simulator (Python OPC UA Server)

Dieser Abschnitt beschreibt den Python-basierten OPC UA Simulationsserver, der Testdaten (z. B. Langzeittest-Zähler und Strommessungsdaten) bereitstellt.

Projekt-Pfad

- `simserver_python/` (sofern vorhanden im Repo) — enthält typischerweise `opcua_simserver.py` oder ähnliche Start-Skripte.

Abhängigkeiten

- Python 3.8+ empfohlen.
- Python-Pakete: `opcua` (python-opcua) oder `asyncua` abhängig von der Implementierung.

Installation (Beispiel PowerShell):

```powershell
cd simserver_python
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt   # falls vorhanden
# oder mindestens:
pip install opcua
```

Starten des Simulators

```powershell
cd simserver_python
python opcua_simserver.py
```

Funktionalität

- Erzeugt die im Mapping (`SPSData/Mapping_Ventiltester.xml`) beschriebene Struktur (Blocks/Gruppen/Items) im OPC UA-Adressraum.
- Liefert simulierte Messdaten für Gruppen wie `Daten_Langzeittest` und `Daten_Strommessung/VentilN`.
- Setzt Status-/Ready-Flags, die das Backend abfragen kann.

Tipps

- Wenn das Backend beim Verbinden Zertifikatsfehler zeigt, prüfe die `CertificateStores/` der C#-Projekte und füge ggf. das Client-Zertifikat in den Trust-Ordner.
- Die Konsolenausgabe des Simulators hilft beim Debugging (z. B. ob Werte periodisch generiert werden).
