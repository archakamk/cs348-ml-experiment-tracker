import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchRunDetail,
  createMetric,
  deleteMetric,
  createTag,
  deleteTag,
} from "../api";

export default function RunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /* ── Inline metric form ───────────────────────────────────── */
  const [metricForm, setMetricForm] = useState({
    metric_name: "",
    metric_value: "",
    epoch: "",
  });

  /* ── Inline tag form ──────────────────────────────────────── */
  const [tagInput, setTagInput] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRunDetail(id)
      .then(setData)
      .catch((e) => setError(e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  /* ── Add metric ───────────────────────────────────────────── */
  const handleAddMetric = async (e) => {
    e.preventDefault();
    try {
      await createMetric({
        run_id: Number(id),
        metric_name: metricForm.metric_name,
        metric_value: Number(metricForm.metric_value),
        epoch: metricForm.epoch ? Number(metricForm.epoch) : null,
      });
      setMetricForm({ metric_name: "", metric_value: "", epoch: "" });
      load();
    } catch (err) {
      alert("Failed to add metric: " + (err.response?.data?.error || err.message));
    }
  };

  /* ── Delete metric ────────────────────────────────────────── */
  const handleDeleteMetric = async (metricId) => {
    if (!window.confirm("Delete this metric?")) return;
    try {
      await deleteMetric(metricId);
      load();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  /* ── Add tag ──────────────────────────────────────────────── */
  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    try {
      await createTag({ run_id: Number(id), tag_name: tagInput.trim() });
      setTagInput("");
      load();
    } catch (err) {
      alert("Failed to add tag: " + (err.response?.data?.error || err.message));
    }
  };

  /* ── Delete tag ───────────────────────────────────────────── */
  const handleDeleteTag = async (tagId) => {
    try {
      await deleteTag(tagId);
      load();
    } catch (err) {
      alert("Delete failed: " + err.message);
    }
  };

  if (loading) return <p className="loading">Loading run details...</p>;
  if (error)
    return (
      <div>
        <p className="error-msg">{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate("/runs")}>
          Back to Runs
        </button>
      </div>
    );

  const { run, metrics, tags } = data;

  const statusClass = {
    completed: "badge-completed",
    running: "badge-running",
    failed: "badge-failed",
  }[run.experiment_status] || "";

  return (
    <>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="page-header">
        <h2>Run #{run.run_id}</h2>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/runs")}
        >
          &larr; Back to Runs
        </button>
      </div>

      {/* ── Run Info Card ───────────────────────────────────── */}
      <div className="card">
        <h3>Run Information</h3>
        <div className="detail-grid">
          <div className="detail-item">
            <label>Project</label>
            <span>{run.project_name}</span>
          </div>
          <div className="detail-item">
            <label>Experiment</label>
            <span>{run.experiment_name}</span>
          </div>
          <div className="detail-item">
            <label>Status</label>
            <span className={`badge ${statusClass}`}>
              {run.experiment_status}
            </span>
          </div>
          <div className="detail-item">
            <label>Model</label>
            <span>{run.model_name}</span>
          </div>
          <div className="detail-item">
            <label>Dataset</label>
            <span>{run.dataset}</span>
          </div>
          <div className="detail-item">
            <label>Epochs</label>
            <span>{run.epochs ?? "—"}</span>
          </div>
          <div className="detail-item">
            <label>Batch Size</label>
            <span>{run.batch_size ?? "—"}</span>
          </div>
          <div className="detail-item">
            <label>Learning Rate</label>
            <span className="text-mono">
              {run.learning_rate ?? "—"}
            </span>
          </div>
          <div className="detail-item">
            <label>Optimizer</label>
            <span>{run.optimizer || "—"}</span>
          </div>
          <div className="detail-item">
            <label>Created</label>
            <span>
              {run.created_at
                ? new Date(run.created_at).toLocaleString()
                : "—"}
            </span>
          </div>
        </div>
        {run.notes && (
          <p style={{ marginTop: 16, color: "var(--text-muted)" }}>
            <strong>Notes:</strong> {run.notes}
          </p>
        )}
      </div>

      {/* ── Tags Section ────────────────────────────────────── */}
      <div className="card">
        <h3>Tags</h3>
        <div className="tag-list" style={{ marginBottom: 16 }}>
          {tags.length === 0 && (
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No tags yet.
            </span>
          )}
          {tags.map((t) => (
            <span key={t.tag_id} className="tag">
              {t.tag_name}
              <button onClick={() => handleDeleteTag(t.tag_id)}>×</button>
            </span>
          ))}
        </div>
        <form className="inline-form" onSubmit={handleAddTag}>
          <div className="form-group">
            <label>Add Tag</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="e.g. baseline"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            + Add
          </button>
        </form>
      </div>

      {/* ── Metrics Section ─────────────────────────────────── */}
      <div className="card">
        <h3>Metrics</h3>

        {/* Metrics grouped by name */}
        {Object.keys(metrics).length === 0 ? (
          <p className="empty">No metrics logged yet.</p>
        ) : (
          Object.entries(metrics).map(([name, values]) => (
            <div key={name} style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: "0.9rem", marginBottom: 8 }}>
                {name}
              </h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Epoch</th>
                      <th className="text-right">Value</th>
                      <th>Logged At</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {values.map((v) => (
                      <tr key={v.metric_id}>
                        <td>{v.epoch ?? "—"}</td>
                        <td className="text-right text-mono">
                          {Number(v.value).toFixed(4)}
                        </td>
                        <td>
                          {v.logged_at
                            ? new Date(v.logged_at).toLocaleString()
                            : "—"}
                        </td>
                        <td className="text-right">
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteMetric(v.metric_id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {/* Inline add-metric form */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, marginTop: 8 }}>
          <h3 style={{ fontSize: "0.9rem", marginBottom: 10 }}>
            Log New Metric
          </h3>
          <form className="inline-form" onSubmit={handleAddMetric}>
            <div className="form-group">
              <label>Metric Name</label>
              <input
                type="text"
                value={metricForm.metric_name}
                onChange={(e) =>
                  setMetricForm((p) => ({
                    ...p,
                    metric_name: e.target.value,
                  }))
                }
                placeholder="e.g. accuracy"
                required
              />
            </div>
            <div className="form-group">
              <label>Value</label>
              <input
                type="number"
                step="any"
                value={metricForm.metric_value}
                onChange={(e) =>
                  setMetricForm((p) => ({
                    ...p,
                    metric_value: e.target.value,
                  }))
                }
                placeholder="0.95"
                required
              />
            </div>
            <div className="form-group">
              <label>Epoch</label>
              <input
                type="number"
                value={metricForm.epoch}
                onChange={(e) =>
                  setMetricForm((p) => ({ ...p, epoch: e.target.value }))
                }
                placeholder="optional"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm">
              + Add Metric
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
