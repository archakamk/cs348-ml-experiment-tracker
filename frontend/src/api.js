import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5001",
});

// ── Dropdown data (populated dynamically from DB) ────────────────
export const fetchProjects = () => api.get("/api/projects").then((r) => r.data);

export const fetchExperiments = (projectId) => {
  const params = projectId ? { project_id: projectId } : {};
  return api.get("/api/experiments", { params }).then((r) => r.data);
};

export const fetchModels = () => api.get("/api/models").then((r) => r.data);

export const fetchOptimizers = () =>
  api.get("/api/optimizers").then((r) => r.data);

// ── Runs ─────────────────────────────────────────────────────────
export const fetchRuns = (filters = {}) => {
  const params = {};
  if (filters.project_id) params.project_id = filters.project_id;
  if (filters.experiment_id) params.experiment_id = filters.experiment_id;
  if (filters.model_name) params.model_name = filters.model_name;
  if (filters.optimizer) params.optimizer = filters.optimizer;
  if (filters.min_epochs) params.min_epochs = filters.min_epochs;
  if (filters.max_epochs) params.max_epochs = filters.max_epochs;
  return api.get("/api/runs", { params }).then((r) => r.data);
};

export const createRun = (data) =>
  api.post("/api/runs", data).then((r) => r.data);

export const updateRun = (runId, data) =>
  api.put(`/api/runs/${runId}`, data).then((r) => r.data);

export const deleteRun = (runId) =>
  api.delete(`/api/runs/${runId}`).then((r) => r.data);

// ── Run detail / report ──────────────────────────────────────────
export const fetchRunDetail = (runId) =>
  api.get(`/api/report/run/${runId}`).then((r) => r.data);

export const fetchSummary = () =>
  api.get("/api/report/summary").then((r) => r.data);

// ── Metrics ──────────────────────────────────────────────────────
export const createMetric = (data) =>
  api.post("/api/metrics", data).then((r) => r.data);

export const deleteMetric = (metricId) =>
  api.delete(`/api/metrics/${metricId}`).then((r) => r.data);

// ── Tags ─────────────────────────────────────────────────────────
export const createTag = (data) =>
  api.post("/api/tags", data).then((r) => r.data);

export const deleteTag = (tagId) =>
  api.delete(`/api/tags/${tagId}`).then((r) => r.data);
