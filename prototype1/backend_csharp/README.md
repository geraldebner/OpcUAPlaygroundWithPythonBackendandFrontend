# backend_csharp

This is a .NET 6 Web API implementation of the Python `backend_python` functionality.

Features:
- Exposes the same REST endpoints as the Python backend so the existing frontend works unchanged.
- Uses `Opc.UaFx.Client` to connect to the OPC UA simulation server at `opc.tcp://localhost:4840`.
- Uses SQLite database `database.db` located one level up (shared with Python backend).
- Background service polls OPC UA values and stores current + historical values.

Run
1. Install .NET 6 SDK or newer.
2. In PowerShell (project root):

```powershell
cd backend_csharp
dotnet restore
dotnet run
```

The API will be available on http://localhost:5000 by default (or the port printed by `dotnet run`).
