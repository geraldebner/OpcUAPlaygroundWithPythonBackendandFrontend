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
