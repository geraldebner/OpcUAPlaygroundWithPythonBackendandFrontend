# OPC UA Playground — Documentation (English)

This repository contains a small OPC UA demo stack: a simulation server, backends (Python + C#), frontends, and a console client for quick testing.

Contents

- Architecture overview
- Components and paths
- Quick start (development)
- How to run each component
- VS Code launch/tasks
- Troubleshooting

Components

- OPC UA Simulation Server (Python)
  - Path: `backend_python/opcua_simserver.py`
- Python Backend (FastAPI)
  - Path: `backend_python/main.py` and `backend_python/models.py`
- C# Backend (.NET)
  - Path: `backend_csharp/`
- React Frontends
  - Paths: `frontend/` and `opcua-frontend/`
- Grafana Frontend
  - Path: `grafana-frontend/` (Docker Compose to provision a JSON API datasource and a sample dashboard)
  - How to run Grafana (local, Docker Desktop on Windows):

    
  ```powershell
  cd grafana-frontend
  # start Grafana (provisions datasource + dashboard)
  docker compose up -d

  # tail logs (optional)
  docker compose logs -f grafana
  ```

  Notes:
  - The provisioned datasource is configured to reach the backend at `http://host.docker.internal:8000`.
  - Open Grafana at [http://localhost:3000](http://localhost:3000). The sample dashboard UID is `opcua-sample-dashboard`.
- C# Console Client
  - Path: `opcua_console_client/`

Quick start

1. Start OPC UA sim server
2. Start backend (Python or C#)
3. Start frontend
4. Optional: run console client for manual reads/writes

C# Console Client

Run:

```powershell
dotnet run --project opcua_console_client -- "opc.tcp://localhost:4840"
```


For more details, see `README.md` (German).
