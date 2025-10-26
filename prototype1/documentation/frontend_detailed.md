# Frontend Detailed Explanation

This document explains the structure, styling, HTML, and code of the React frontend in detail.

---

## 1. Structure & Main Files

- `App.tsx`: Main React component, contains all UI logic and rendering.
- `App.css`: CSS file for modern, clean styling.
- `index.tsx`: Entry point, renders `App` into the HTML.
- `public/index.html`: HTML template with a root div.

---

## 2. HTML Template

`public/index.html` contains:
```html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OPC UA Frontend</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
```
- React renders into `<div id="root">`.

---

## 3. Main Component (`App.tsx`)

- Uses React hooks (`useState`, `useEffect`) for state and lifecycle.
- Implements a tabbed UI: Simulation Werte, Parameter setzen, Historische Daten, Status.
- Fetches data from backend using `fetch` and updates state.
- Renders tables and forms for data display and input.

### Tabs
- Managed by `tab` state (`useState`).
- Four buttons switch between tabs.
- Each tab renders different content based on `tab` value.

### Data Fetching
- Uses `useEffect` to fetch simulation, parameter, historical, and status data.
- Data is stored in state variables (`values`, `paramValues`, `historical`, `status`).

### Forms & Tables
- Parameter tab uses a form to send new values to backend.
- Tables display values with modern styling.
- Historical tab allows filtering by device and time.

---

## 4. Styling (`App.css`)

- Uses modern CSS for a clean, professional look.
- `.container`: Centers and styles main content area.
- `.tabs`: Flexbox for tab buttons, active tab highlighted.
- `.modern-table`: Styled tables with hover effects, padding, and colors.
- `.submit-btn`: Styled button for form submission.
- Responsive and visually appealing.

---

## 5. Key Code Snippets

### Tab Management
```tsx
const [tab, setTab] = useState(0);
<div className="tabs">
  <button className={tab === 0 ? "active" : ""} onClick={() => setTab(0)}>Simulation Werte</button>
  ...
</div>
```

### Data Fetching Example
```tsx
useEffect(() => {
  fetch("http://localhost:8000/sim_values")
    .then(res => res.json())
    .then(setValues);
}, []);
```

### Table Rendering
```tsx
<table className="modern-table">
  <thead>
    <tr>
      <th>Device</th>
      <th>Index</th>
      <th>Node ID</th>
      <th>Wert</th>
    </tr>
  </thead>
  <tbody>
    {values.map((row) => (
      <tr key={row.node_id}>
        <td>{row.device}</td>
        <td>{row.index}</td>
        <td>{row.node_id}</td>
        <td>{row.value}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### Form for Parameter Setting
```tsx
<form onSubmit={handleSubmit}>
  <table className="modern-table"> ... </table>
  <button type="submit" className="submit-btn">Parameter senden</button>
</form>
```

---

## 6. Best Practices
- Use functional components and hooks.
- Keep UI logic and styling separate.
- Use CSS classes for consistent design.
- Handle loading and error states.
- Keep code modular and readable.

---

## 7. How to Extend
- Add new tabs by extending the `tab` state and UI.
- Add new API endpoints and fetch logic as needed.
- Customize styling in `App.css` for your own look.

---

For more, see the code in `frontend/src/App.tsx` and `frontend/src/App.css`.
