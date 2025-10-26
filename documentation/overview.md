# OPC UA Playground – Overview

This project is a full-stack teaching application for industrial data simulation, acquisition, and visualization. It demonstrates how to build a modern system using Python, FastAPI, OPC UA, SQLAlchemy, SQLite, React, and TypeScript.

## Main Components
- **OPC UA Simulation Server**: Simulates multiple devices and values.
- **Backend API**: Connects to OPC UA, stores data, provides REST endpoints.
- **Frontend**: Modern web UI for monitoring, parameter setting, historical data, and system status.
- **Database**: Stores current and historical values.
- **Console Client & Browse Script**: For direct OPC UA interaction and exploration.
 - **C# Backend & Console Client**: A parallel .NET implementation of the backend and a REPL console client using `Opc.UaFx.Client`.

## Architecture Diagram

```
[OPC UA Sim Server] <---> [Backend API] <---> [SQLite DB]
         ^                      ^
         |                      |
   [Console Client]        [Frontend UI]
         |                      |
   [Browse Script]         [Web Browser]
```

## Technologies Used
- Python, FastAPI, python-opcua, SQLAlchemy, SQLite
- React, TypeScript, Node.js, npm

See `modules.md`, `backend.md`, `frontend.md`, and `database.md` for details.
