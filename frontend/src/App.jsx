import { Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import RunsExplorer from "./pages/RunsExplorer";
import RunDetail from "./pages/RunDetail";

export default function App() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">&#9881;</span>
          <h1>ML Tracker</h1>
        </div>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/runs">Runs Explorer</NavLink>
        </nav>
        <div className="sidebar-footer">CS 348 Project</div>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/runs" element={<RunsExplorer />} />
          <Route path="/runs/:id" element={<RunDetail />} />
        </Routes>
      </main>
    </div>
  );
}
