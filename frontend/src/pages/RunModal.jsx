import { useEffect, useState } from "react";
import {
  fetchExperiments,
  fetchOptimizers,
  createRun,
  updateRun,
} from "../api";

export default function RunModal({ run, onClose, onSaved }) {
  const isEdit = !!run;

  const [experiments, setExperiments] = useState([]);
  const [optimizerOptions, setOptimizerOptions] = useState([]);

  const [form, setForm] = useState({
    experiment_id: run?.experiment_id ?? "",
    model_name: run?.model_name ?? "",
    dataset: run?.dataset ?? "",
    epochs: run?.epochs ?? "",
    batch_size: run?.batch_size ?? "",
    learning_rate: run?.learning_rate ?? "",
    optimizer: run?.optimizer ?? "",
    notes: run?.notes ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Populate dropdowns from the database
  useEffect(() => {
    fetchExperiments().then(setExperiments).catch(console.error);
    fetchOptimizers().then(setOptimizerOptions).catch(console.error);
  }, []);

  const handleChange = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = { ...form };
    // Convert numeric fields
    if (payload.epochs) payload.epochs = Number(payload.epochs);
    if (payload.batch_size) payload.batch_size = Number(payload.batch_size);
    if (payload.learning_rate)
      payload.learning_rate = Number(payload.learning_rate);
    if (payload.experiment_id)
      payload.experiment_id = Number(payload.experiment_id);
    // Remove empty strings so the API gets null
    Object.keys(payload).forEach((k) => {
      if (payload[k] === "") payload[k] = null;
    });

    try {
      if (isEdit) {
        await updateRun(run.run_id, payload);
      } else {
        await createRun(payload);
      }
      onSaved();
    } catch (err) {
      setError(
        err.response?.data?.error || err.message || "Something went wrong"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{isEdit ? `Edit Run #${run.run_id}` : "Add New Run"}</h3>

        {error && <p className="error-msg">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label>Experiment</label>
              <select
                value={form.experiment_id}
                onChange={(e) =>
                  handleChange("experiment_id", e.target.value)
                }
                required
              >
                <option value="">Select experiment…</option>
                {experiments.map((ex) => (
                  <option key={ex.experiment_id} value={ex.experiment_id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Optimizer</label>
              <select
                value={form.optimizer}
                onChange={(e) => handleChange("optimizer", e.target.value)}
              >
                <option value="">Select or type…</option>
                {optimizerOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Model Name</label>
              <input
                type="text"
                value={form.model_name}
                onChange={(e) => handleChange("model_name", e.target.value)}
                placeholder="e.g. ResNet50"
                required
              />
            </div>

            <div className="form-group">
              <label>Dataset</label>
              <input
                type="text"
                value={form.dataset}
                onChange={(e) => handleChange("dataset", e.target.value)}
                placeholder="e.g. CIFAR-10"
                required
              />
            </div>

            <div className="form-group">
              <label>Epochs</label>
              <input
                type="number"
                value={form.epochs}
                onChange={(e) => handleChange("epochs", e.target.value)}
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Batch Size</label>
              <input
                type="number"
                value={form.batch_size}
                onChange={(e) => handleChange("batch_size", e.target.value)}
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Learning Rate</label>
              <input
                type="number"
                step="any"
                value={form.learning_rate}
                onChange={(e) =>
                  handleChange("learning_rate", e.target.value)
                }
                placeholder="e.g. 0.001"
              />
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Optional notes about this run…"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
            >
              {saving ? "Saving…" : isEdit ? "Update Run" : "Create Run"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
