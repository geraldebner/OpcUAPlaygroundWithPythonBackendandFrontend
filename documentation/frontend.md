# Frontend – React & TypeScript

## Technologies
- **React**: JavaScript library for building user interfaces.
- **TypeScript**: Typed superset of JavaScript for safer code.
- **Node.js & npm**: For frontend development and package management.

## UI Design
- Tabbed interface: Simulation values, parameter setting, historical data, system status.
- Modern, clean styling with CSS.
- Responsive and user-friendly.

## Data Flow
- Fetches data from backend REST API using HTTP requests.
- Displays live values, allows parameter changes, shows historical data, and system health.

## Example: Fetching Simulation Values
```typescript
fetch("http://localhost:8000/sim_values")
  .then(res => res.json())
  .then(setValues);
```

## Tabs
- **Simulation Werte**: Shows live simulation values.
- **Parameter setzen**: Allows setting parameter values.
- **Historische Daten**: Shows historical values, filterable by device and time.
- **Status**: Shows OPC UA and backend health.

See `backend.md` for API details and `database.md` for data structure.
