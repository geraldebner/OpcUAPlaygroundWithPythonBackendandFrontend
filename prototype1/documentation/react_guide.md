# React & TypeScript

This guide explains React and TypeScript in detail, focusing on how they are used in the frontend of the OPC UA Playground project. It covers setup, component structure, state management, data fetching, and best practices for building modern web UIs.

---

## 1. React Overview

React is a popular JavaScript library for building user interfaces. It uses a component-based architecture and a virtual DOM for efficient updates.

### Key Features
- Component-based structure
- Declarative UI
- State and props management
- Unidirectional data flow
- Rich ecosystem (hooks, context, router, etc.)

---

## 2. TypeScript Overview

TypeScript is a typed superset of JavaScript. It adds static typing, which helps catch errors early and improves code maintainability.

---

## 3. Project Setup

### Install Dependencies
```bash
npm install react react-dom react-scripts typescript
```

### File Structure
```
frontend/
  src/App.tsx        # Main React component
  src/App.css        # Styling
  src/index.tsx      # Entry point
  public/index.html  # HTML template
```

---

## 4. Creating a React Component

A React component is a function that returns JSX (HTML-like syntax).

```tsx
import React from "react";

function Hello() {
  return <h1>Hello, world!</h1>;
}

export default Hello;
```

---

## 5. Using State with Hooks

React uses hooks for state and lifecycle management. The most common is `useState`.

```tsx
import React, { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

---

## 6. Data Fetching (API Calls)

Use the `useEffect` hook to fetch data from an API when the component mounts.

```tsx
import React, { useEffect, useState } from "react";

function DataFetcher() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch("http://localhost:8000/sim_values")
      .then(res => res.json())
      .then(setData);
  }, []);
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
```

---

## 7. Props: Passing Data to Components

Props are used to pass data from parent to child components.

```tsx
function Greeting({ name }: { name: string }) {
  return <h2>Hello, {name}!</h2>;
}

function App() {
  return <Greeting name="Student" />;
}
```

---

## 8. Styling Components

You can use CSS files or CSS-in-JS libraries. In this project, `App.css` is used for styling.

```css
/* App.css */
.container {
  max-width: 900px;
  margin: 40px auto;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 32px;
}
```

---

## 9. Building a Tabbed UI (Project Example)

The main UI uses tabs to switch between views. Tabs are managed with state:

```tsx
const [tab, setTab] = useState(0);

return (
  <div>
    <button onClick={() => setTab(0)}>Tab 1</button>
    <button onClick={() => setTab(1)}>Tab 2</button>
    {tab === 0 && <div>Content for Tab 1</div>}
    {tab === 1 && <div>Content for Tab 2</div>}
  </div>
);
```

---

## 10. Connecting to the Backend

The frontend fetches data from the FastAPI backend using HTTP requests (see Data Fetching above). All API calls are made with `fetch` and results are displayed in tables or forms.

---

## 11. Best Practices
- Use functional components and hooks
- Keep components small and focused
- Use TypeScript for type safety
- Separate logic and presentation
- Handle errors and loading states
- Use CSS for consistent styling

---

## 12. Further Reading
- [React Documentation](https://react.dev/)
- [TypeScript for React](https://react-typescript-cheatsheet.netlify.app/)
- [React Hooks](https://react.dev/reference/react/hooks)
