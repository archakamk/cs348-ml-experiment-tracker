import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchRuns,
  fetchProjects,
  fetchExperiments,
  fetchModels,
  fetchOptimizers,
  deleteRun,
} from "../api";
import RunModal from "./RunModal";

const EMPTY_FILTERS = {
  project_id: "",
  experiment_id: "",
  model_name: "",
  optimizer: "",
  min_epochs: "",
  max_epochs: "",
};

export default function RunsExplorer() {
  const navigate = useNavigate();

  /* ── Filter dropdown options (ALL from API, never hardcoded) ── */
  const [projects, setProjects] = useState([]);
  const [experiments, setExperiments] = useState([]);
  const [models, setModels] = useState([]);
  const [optimizers, setOptimizers] = useState([]);

  /* ── Filter state ─────────────────────────────────────────── */
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState({});

  /* ── Runs data ────────────────────────────────────────────── */
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── Modal state ──────────────────────────────────────────── */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRun, setEditingRun] = useState(null);

  /* ── Load dropdown data from API ──────────────────────────── */
  useEffect(() => {
    fetchProjects().then(setProjects).catch(console.error);
    fetchModels().then(setModels).catch(console.error);
    fetchOptimizers().then(setOptimizers).catch(console.error);
  }, []);

  // When selected project changes, reload experiments from API
  useEffect(() => {
    const pid = filters.project_id || undefined;
    fetchExperiments(pid).then(setExperiments).catch(console.error);
    // Clear experiment selection when project changes
    setFilters((prev) => ({ ...prev, experiment_id: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.project_id]);

  /* ── Load runs ────────────────────────────────────────────── */
  const loadRuns = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRuns(appliedFilters)
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [appliedFilters]);

  useEffect(loadRuns, [loadRuns]);

  /* ── Handlers ─────────────────────────────────────────────── */
  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => setAppliedFilters({ ...filters });
  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters({});
  };

  const handleDelete = async (runId) => {
    if (!window.confirm(`Delete run #${runId}? This also removes its metrics and tags.`))
      return;
    try {
      await deleteRun(runId);
      loadRuns();
      // Refresh model/optimizer dropdowns since available values may have changed
      fetchModels().then(setModels);
      fetchOptimizers().then(setOptimizers);
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  const openAddModal = () => {
    setEditingRun(null);
    setModalOpen(true);
  };

  const openEditModal = (run) => {
    setEditingRun(run);
    setModalOpen(true);
  };

  const handleModalSaved = () => {
    setModalOpen(false);
    setEditingRun(null);
    loadRuns();
    fetchModels().then(setModels);
    fetchOptimizers().then(setOptimizers);
  };

  return (
    <>
      <div className="page-header">
        <h2>Runs Explorer</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add New Run
        </button>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────── */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Project</label>
          <select
            value={filters.project_id}
            onChange={(e) => handleFilterChange("project_id", e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.project_id} value={p.project_id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Experiment</label>
          <select
            value={filters.experiment_id}
            onChange={(e) =>
              handleFilterChange("experiment_id", e.target.value)
            }
          >
            <option value="">All Experiments</option>
            {experiments.map((ex) => (
              <option key={ex.experiment_id} value={ex.experiment_id}>
                {ex.name}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Model</label>
          <select
            value={filters.model_name}
            onChange={(e) => handleFilterChange("model_name", e.target.value)}
          >
            <option value="">All Models</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Optimizer</label>
          <select
            value={filters.optimizer}
            onChange={(e) => handleFilterChange("optimizer", e.target.value)}
          >
            <option value="">All Optimizers</option>
            {optimizers.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Min Epochs</label>
          <input
            type="number"
            value={filters.min_epochs}
            onChange={(e) => handleFilterChange("min_epochs", e.target.value)}
            placeholder="0"
          />
        </div>

        <div className="filter-group">
          <label>Max Epochs</label>
          <input
            type="number"
            value={filters.max_epochs}
            onChange={(e) => handleFilterChange("max_epochs", e.target.value)}
            placeholder="∞"
          />
        </div>

        <div className="filter-actions">
          <button className="btn btn-primary btn-sm" onClick={applyFilters}>
            Apply Filters
          </button>
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
            Clear
          </button>
        </div>
      </div>

      {/* ── Results Table ───────────────────────────────────── */}
      <div className="card">
        {error && <p className="error-msg">{error}</p>}

        {loading ? (
          <p className="loading">Loading runs...</p>
        ) : runs.length === 0 ? (
          <p className="empty">No runs match the current filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Model</th>
                  <th>Dataset</th>
                  <th className="text-right">Epochs</th>
                  <th className="text-right">Batch</th>
                  <th className="text-right">LR</th>
                  <th>Optimizer</th>
                  <th>Experiment</th>
                  <th>Project</th>
                  <th className="text-right">Best Acc</th>
                  <th>Tags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r.run_id}>
                    <td
                      className="clickable-row text-mono"
                      onClick={() => navigate(`/runs/${r.run_id}`)}
                    >
                      #{r.run_id}
                    </td>
                    <td>{r.model_name}</td>
                    <td>{r.dataset}</td>
                    <td className="text-right">{r.epochs ?? "—"}</td>
                    <td className="text-right">{r.batch_size ?? "—"}</td>
                    <td className="text-right text-mono">
                      {r.learning_rate != null ? r.learning_rate : "—"}
                    </td>
                    <td>{r.optimizer || "—"}</td>
                    <td>{r.experiment_name}</td>
                    <td>{r.project_name}</td>
                    <td className="text-right text-mono">
                      {r.best_accuracy != null
                        ? Number(r.best_accuracy).toFixed(4)
                        : "—"}
                    </td>
                    <td>
                      {r.tags
                        ? r.tags.split(", ").map((t) =>
                            t ? (
                              <span key={t} className="tag" style={{ marginRight: 4 }}>
                                {t}
                              </span>
                            ) : null
                          )
                        : "—"}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEditModal(r)}
                        style={{ marginRight: 6 }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(r.run_id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ──────────────────────────────────── */}
      {modalOpen && (
        <RunModal
          run={editingRun}
          onClose={() => setModalOpen(false)}
          onSaved={handleModalSaved}
        />
      )}
    </>
  );
}
