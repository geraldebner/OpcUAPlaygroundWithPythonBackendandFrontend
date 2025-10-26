# Modules & Their Roles

## Backend (`backend/`)
- `main.py`: FastAPI app, REST endpoints, OPC UA client, database logic, background data storage.
- `opcua_client.py`: Helper functions for reading/writing OPC UA values.
- `models.py`: SQLAlchemy models for devices, current values, historical values.
- `opcua_simserver.py`: OPC UA simulation server, creates devices and values, updates values periodically.

## C# Backend (`backend_csharp/`)
- `Program.cs`, `ApiEndpoints.cs`, `OpcUaService.cs`, `DataModels.cs` — .NET minimal API implementation, EF Core models and OPC UA client.


## Frontend (`frontend/`)
- `src/App.tsx`: Main React component, tabbed UI for values, parameters, historical data, and status.
- `src/App.css`: Modern styling for the UI.
- `public/index.html`: HTML entry point.

## Other
- `opcua_console_client.py`: Python script to read and print all OPC UA values in the console.
 - `opcua_browse_nodes.py`: Python script to browse and print OPC UA server nodes.
 - `opcua_console_client/` (C#) — REPL console client implemented with `Opc.UaFx.Client` for interactive read/write testing.

See `backend.md` and `frontend.md` for deeper explanations.
