# Grafana Frontend (opcua)

This folder contains a minimal Grafana setup (Docker Compose) that provisions a JSON API datasource and a sample dashboard.

What is included

- `docker-compose.yml` — starts Grafana and installs the JSON API datasource plugin
- `provisioning/datasources/datasource.yaml` — config for the JSON API datasource pointing to the C# backend
- `provisioning/dashboards/dashboard.yaml` — tells Grafana to load dashboards from the `dashboards/` folder
- `dashboards/sample-dashboard.json` — a simple dashboard that queries `/historical_values?device_name=Device1`


Usage

1. Make sure the C# backend is running on the host at `http://localhost:8000` (the project sets this URL in `backend_csharp/Program.cs`).

1. From this folder, start Grafana:

```powershell
docker compose up -d
```

1. Open Grafana at `http://localhost:3000` (user `admin`, password `admin`).

Notes

- The datasource is configured to use `http://host.docker.internal:8000` to reach services running on the host from inside the container. This works on Docker Desktop for Windows.

- We install the `marcusolsson-json-datasource` plugin via `GF_INSTALL_PLUGINS`. If your environment blocks plugin installation, you can instead run Grafana locally and add the datasource manually.

- The sample dashboard assumes a device named `Device1` exists and that `/historical_values` returns an array of objects with a `timestamp` and `value`. You can adapt the dashboard JSON to match the exact response shape if needed.

If you want, I can enhance the dashboard with templating (device list) and transforms to support the exact API response format.
