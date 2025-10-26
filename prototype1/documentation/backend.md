# Backend – FastAPI & OPC UA

## Technologies
- **FastAPI**: Modern Python web framework for REST APIs.
- **python-opcua**: OPC UA client/server library for Python.
- **SQLAlchemy**: ORM for database access.
- **SQLite**: Lightweight, file-based database.

## Main Functions
- Connects to OPC UA server as a client.
- Periodically reads all values and stores them in SQLite.
- Exposes REST endpoints for frontend and other clients.
- Monitors system health (OPC UA, DB, uptime).

## Key Endpoints
- `/sim_values`: Get current simulation values.
- `/param_values`: Get/set parameter values.
- `/historical_values`: Query historical data by device and time.
- `/status`: System health (OPC UA, DB, uptime).
- `/data`: List all devices.

## Background Data Storage
A background thread reads all values from the OPC UA server every 5 seconds and stores both current and historical values in the database.

## Example: OPC UA Connection
```python
OPCUA_SERVER_URL = "opc.tcp://localhost:4840"
sim_client = Client(OPCUA_SERVER_URL)
sim_client.connect()
```

See `database.md` for schema and `frontend.md` for API usage.

## Notes: C# Backend

There is a functionally equivalent C# backend in `backend_csharp/` that exposes the same REST endpoints and persists to the same SQLite schema. It uses `Opc.UaFx.Client` for OPC UA interactions and Entity Framework Core for database access. Use the C# backend if you prefer .NET tooling or want to debug with Visual Studio / VS Code.

## API example JSON shapes

- `/sim_values` and `/param_values` return arrays of objects like:

```json
[
	{ "device": 1, "type": "sim", "index": 1, "node_id": "ns=2;s=Device1.SimValue1", "value": 12.34 }
]
```

- `/historical_values?deviceId=1&type=sim&index=1&limit=10` returns:

```json
{
	"deviceId": 1,
	"type": "sim",
	"index": 1,
	"values": [ { "timestamp": "2025-10-12T12:00:00Z", "value": 12.34 }, ... ]
}
```

