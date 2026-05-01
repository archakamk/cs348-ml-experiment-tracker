import { useEffect, useState } from "react";
import { fetchSummary } from "../api";

export default function Dashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetchSummary()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <>
      <div className="page-header">
        <h2>Dashboard</h2>
        <button className="btn btn-primary" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="card">
        <h3>Project Summary Report</h3>

        {error && <p className="error-msg">{error}</p>}

        {loading ? (
          <p className="loading">Loading summary...</p>
        ) : rows.length === 0 ? (
          <p className="empty">No projects found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Project</th>
                  <th className="text-right">Experiments</th>
                  <th className="text-right">Runs</th>
                  <th className="text-right">Best Accuracy</th>
                  <th className="text-right">Avg Learning Rate</th>
                  <th>Most Used Model</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.project_id}>
                    <td>{r.project_name}</td>
                    <td className="text-right">{r.experiment_count}</td>
                    <td className="text-right">{r.run_count}</td>
                    <td className="text-right text-mono">
                      {r.best_accuracy != null
                        ? Number(r.best_accuracy).toFixed(4)
                        : "—"}
                    </td>
                    <td className="text-right text-mono">
                      {r.avg_learning_rate != null
                        ? Number(r.avg_learning_rate).toFixed(6)
                        : "—"}
                    </td>
                    <td>{r.most_used_model || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
