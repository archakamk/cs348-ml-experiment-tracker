from flask import Flask, request, jsonify
from flask_cors import CORS
from psycopg2.extras import RealDictCursor

from db import get_conn, _get_pool

app = Flask(__name__)
CORS(
    app,
    origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True,
)


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _cursor(conn):
    return conn.cursor(cursor_factory=RealDictCursor)


# ------------------------------------------------------------------
# Health
# ------------------------------------------------------------------

@app.route("/")
def index():
    return {"status": "ok"}


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


# ===================================================================
#  CRUD — Runs
# ===================================================================

# ------------------------------------------------------------------
# Transaction: READ COMMITTED
# Why: Inserting a run only needs to validate that the referenced
#   experiment_id exists (FK check). READ COMMITTED is sufficient
#   because we only need to see already-committed rows for FK
#   validation — no multi-statement read consistency is required.
# Prevents: dirty reads — we never see an uncommitted experiment
#   row that might be rolled back, which would leave an orphan run.
# ------------------------------------------------------------------
@app.route("/api/runs", methods=["POST"])
def create_run():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body is required"}), 400

    required = ("experiment_id", "model_name", "dataset")
    missing = [f for f in required if f not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    sql = """
        INSERT INTO runs
            (experiment_id, model_name, dataset,
             epochs, batch_size, learning_rate, optimizer, notes)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    params = (
        body["experiment_id"],
        body["model_name"],
        body["dataset"],
        body.get("epochs"),
        body.get("batch_size"),
        body.get("learning_rate"),
        body.get("optimizer"),
        body.get("notes"),
    )

    pool = _get_pool()
    conn = pool.getconn()
    try:
        conn.autocommit = False
        cur = _cursor(conn)
        cur.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
        cur.execute(sql, params)
        row = cur.fetchone()
        cur.close()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.autocommit = True
        pool.putconn(conn)

    return jsonify(row), 201


@app.route("/api/runs/<int:run_id>", methods=["PUT"])
def update_run(run_id):
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body is required"}), 400

    # Only these column names may appear in SET — never user input.
    # Values are always passed via %s parameterized placeholders.
    ALLOWED_COLUMNS = frozenset({
        "experiment_id", "model_name", "dataset",
        "epochs", "batch_size", "learning_rate", "optimizer", "notes",
    })
    fields = {k: v for k, v in body.items() if k in ALLOWED_COLUMNS}
    if not fields:
        return jsonify({"error": "No valid fields to update"}), 400

    set_clause = ", ".join(f"{col} = %s" for col in fields)
    params = list(fields.values()) + [run_id]

    # Safe: column names come from ALLOWED_COLUMNS (hardcoded above),
    # all values go through %s parameterized placeholders.
    sql = f"UPDATE runs SET {set_clause} WHERE run_id = %s RETURNING *"

    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(sql, params)
            row = cur.fetchone()
        finally:
            cur.close()

    if not row:
        return jsonify({"error": "Run not found"}), 404
    return jsonify(row)


# ------------------------------------------------------------------
# Transaction: SERIALIZABLE
# Why: Deleting a run cascades to metrics and tags. SERIALIZABLE
#   ensures no concurrent transaction can insert a new metric or tag
#   referencing this run between our read and the cascading delete.
# Prevents: phantom reads — a concurrent INSERT of a metric/tag for
#   this run_id cannot slip in while the DELETE cascade is in flight.
# ------------------------------------------------------------------
@app.route("/api/runs/<int:run_id>", methods=["DELETE"])
def delete_run(run_id):
    pool = _get_pool()
    conn = pool.getconn()
    try:
        conn.autocommit = False
        cur = _cursor(conn)
        cur.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
        cur.execute(
            "DELETE FROM runs WHERE run_id = %s RETURNING run_id",
            (run_id,),
        )
        row = cur.fetchone()
        cur.close()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.autocommit = True
        pool.putconn(conn)

    if not row:
        return jsonify({"error": "Run not found"}), 404
    return jsonify({"deleted": row["run_id"]})


# ===================================================================
#  CRUD — Metrics
# ===================================================================

# ------------------------------------------------------------------
# Transaction: READ COMMITTED
# Why: Inserting a metric only needs the referenced run_id to exist
#   (FK check). READ COMMITTED guarantees we see only committed
#   rows, which is sufficient for single-statement FK validation.
# Prevents: dirty reads — we won't reference a run that another
#   transaction created but hasn't committed yet.
# ------------------------------------------------------------------
@app.route("/api/metrics", methods=["POST"])
def create_metric():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body is required"}), 400

    required = ("run_id", "metric_name", "metric_value")
    missing = [f for f in required if f not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    sql = """
        INSERT INTO metrics (run_id, metric_name, metric_value, epoch)
        VALUES (%s, %s, %s, %s)
        RETURNING *
    """
    params = (
        body["run_id"],
        body["metric_name"],
        body["metric_value"],
        body.get("epoch"),
    )

    pool = _get_pool()
    conn = pool.getconn()
    try:
        conn.autocommit = False
        cur = _cursor(conn)
        cur.execute("SET TRANSACTION ISOLATION LEVEL READ COMMITTED")
        cur.execute(sql, params)
        row = cur.fetchone()
        cur.close()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.autocommit = True
        pool.putconn(conn)

    return jsonify(row), 201


@app.route("/api/metrics/<int:metric_id>", methods=["DELETE"])
def delete_metric(metric_id):
    sql = "DELETE FROM metrics WHERE metric_id = %s RETURNING metric_id"
    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(sql, (metric_id,))
            row = cur.fetchone()
        finally:
            cur.close()

    if not row:
        return jsonify({"error": "Metric not found"}), 404
    return jsonify({"deleted": row["metric_id"]})


# ===================================================================
#  CRUD — Tags
# ===================================================================

@app.route("/api/tags", methods=["POST"])
def create_tag():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body is required"}), 400

    required = ("run_id", "tag_name")
    missing = [f for f in required if f not in body]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    sql = """
        INSERT INTO tags (run_id, tag_name)
        VALUES (%s, %s)
        RETURNING *
    """
    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(sql, (body["run_id"], body["tag_name"]))
            row = cur.fetchone()
        finally:
            cur.close()
    return jsonify(row), 201


@app.route("/api/tags/<int:tag_id>", methods=["DELETE"])
def delete_tag(tag_id):
    sql = "DELETE FROM tags WHERE tag_id = %s RETURNING tag_id"
    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(sql, (tag_id,))
            row = cur.fetchone()
        finally:
            cur.close()

    if not row:
        return jsonify({"error": "Tag not found"}), 404
    return jsonify({"deleted": row["tag_id"]})


# ===================================================================
#  Filter + Report — GET /api/runs (with optional filters)
# ===================================================================

@app.route("/api/runs", methods=["GET"])
def list_runs():
    """
    Return runs joined with experiment name, project name, aggregated
    tags, and the best (max) metric value per run.

    Optional query params:
        project_id, experiment_id, model_name (partial ILIKE),
        optimizer, min_epochs, max_epochs
    """
    conditions = []
    params = []

    project_id = request.args.get("project_id", type=int)
    if project_id is not None:
        conditions.append("p.project_id = %s")
        params.append(project_id)

    experiment_id = request.args.get("experiment_id", type=int)
    if experiment_id is not None:
        conditions.append("e.experiment_id = %s")
        params.append(experiment_id)

    model_name = request.args.get("model_name")
    if model_name:
        conditions.append("r.model_name ILIKE %s")
        params.append(f"%{model_name}%")

    optimizer = request.args.get("optimizer")
    if optimizer:
        conditions.append("r.optimizer = %s")
        params.append(optimizer)

    min_epochs = request.args.get("min_epochs", type=int)
    if min_epochs is not None:
        conditions.append("r.epochs >= %s")
        params.append(min_epochs)

    max_epochs = request.args.get("max_epochs", type=int)
    if max_epochs is not None:
        conditions.append("r.epochs <= %s")
        params.append(max_epochs)

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    # Safe: {where} is built from hardcoded condition strings above;
    # every user-supplied value is passed via %s in `params`.
    sql = f"""
        SELECT
            r.run_id,
            r.experiment_id,
            e.name          AS experiment_name,
            p.project_id,
            p.name          AS project_name,
            r.model_name,
            r.dataset,
            r.epochs,
            r.batch_size,
            r.learning_rate,
            r.optimizer,
            r.notes,
            r.created_at,
            COALESCE(
                (SELECT STRING_AGG(t.tag_name, ', ' ORDER BY t.tag_name)
                 FROM tags t WHERE t.run_id = r.run_id),
                ''
            ) AS tags,
            (SELECT MAX(m.metric_value)
             FROM metrics m
             WHERE m.run_id = r.run_id
               AND m.metric_name = 'accuracy'
            ) AS best_accuracy
        FROM runs r
        JOIN experiments e ON e.experiment_id = r.experiment_id
        JOIN projects p    ON p.project_id   = e.project_id
        {where}
        ORDER BY r.created_at DESC
    """

    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(sql, params)
            rows = cur.fetchall()
        finally:
            cur.close()
    return jsonify(rows)


# ===================================================================
#  Report — Project Summary
# ===================================================================

# ------------------------------------------------------------------
# Transaction: REPEATABLE READ, READ ONLY
# Why: This report runs multiple aggregations (COUNT, MAX, AVG)
#   across projects, experiments, runs, and metrics via JOINs and
#   a correlated subquery. REPEATABLE READ gives us a consistent
#   snapshot so that a concurrent INSERT of new runs or metrics
#   cannot cause the counts/averages to shift between the outer
#   query and the correlated subquery within the same request.
#   READ ONLY tells PostgreSQL this transaction will never write,
#   enabling internal optimizations and preventing accidental DML.
# Prevents: non-repeatable reads and phantom reads — the snapshot
#   is frozen at the start of the transaction, so newly committed
#   rows from other sessions are invisible for the duration.
# ------------------------------------------------------------------
@app.route("/api/report/summary", methods=["GET"])
def report_summary():
    """
    For each project: experiment count, run count, best accuracy,
    average learning rate, and most-used model name.
    """
    sql = """
        SELECT
            p.project_id,
            p.name AS project_name,
            COUNT(DISTINCT e.experiment_id)  AS experiment_count,
            COUNT(DISTINCT r.run_id)         AS run_count,
            MAX(m.metric_value)
                FILTER (WHERE m.metric_name = 'accuracy')
                                              AS best_accuracy,
            ROUND(AVG(r.learning_rate)::numeric, 6) AS avg_learning_rate,
            (
                SELECT r2.model_name
                FROM runs r2
                JOIN experiments e2 ON e2.experiment_id = r2.experiment_id
                WHERE e2.project_id = p.project_id
                GROUP BY r2.model_name
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS most_used_model
        FROM projects p
        LEFT JOIN experiments e ON e.project_id  = p.project_id
        LEFT JOIN runs r        ON r.experiment_id = e.experiment_id
        LEFT JOIN metrics m     ON m.run_id      = r.run_id
        GROUP BY p.project_id, p.name
        ORDER BY p.project_id
    """
    pool = _get_pool()
    conn = pool.getconn()
    try:
        conn.autocommit = False
        cur = _cursor(conn)
        cur.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ")
        cur.execute("SET TRANSACTION READ ONLY")
        cur.execute(sql)
        rows = cur.fetchall()
        cur.close()
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.autocommit = True
        pool.putconn(conn)

    return jsonify(rows)


# ===================================================================
#  Report — Single Run Detail
# ===================================================================

@app.route("/api/report/run/<int:run_id>", methods=["GET"])
def report_run_detail(run_id):
    """
    Full detail for one run: metadata, metrics grouped by metric_name
    (for learning-curve plots), and all tags.
    """
    run_sql = """
        SELECT
            r.*,
            e.name   AS experiment_name,
            e.status AS experiment_status,
            p.name   AS project_name
        FROM runs r
        JOIN experiments e ON e.experiment_id = r.experiment_id
        JOIN projects p    ON p.project_id   = e.project_id
        WHERE r.run_id = %s
    """
    metrics_sql = """
        SELECT metric_id, metric_name, metric_value, epoch, logged_at
        FROM metrics
        WHERE run_id = %s
        ORDER BY metric_name, epoch
    """
    tags_sql = """
        SELECT tag_id, tag_name
        FROM tags
        WHERE run_id = %s
        ORDER BY tag_name
    """

    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(run_sql, (run_id,))
            run_row = cur.fetchone()
            if not run_row:
                return jsonify({"error": "Run not found"}), 404

            cur.execute(metrics_sql, (run_id,))
            metric_rows = cur.fetchall()

            cur.execute(tags_sql, (run_id,))
            tag_rows = cur.fetchall()
        finally:
            cur.close()

    # Group metrics by metric_name for easy charting
    metrics_grouped = {}
    for m in metric_rows:
        name = m["metric_name"]
        metrics_grouped.setdefault(name, []).append({
            "metric_id": m["metric_id"],
            "value": m["metric_value"],
            "epoch": m["epoch"],
            "logged_at": m["logged_at"],
        })

    return jsonify({
        "run": run_row,
        "metrics": metrics_grouped,
        "tags": tag_rows,
    })


# ===================================================================
#  Dynamic Dropdowns
# ===================================================================

@app.route("/api/projects", methods=["GET"])
def list_projects():
    sql = "SELECT project_id, name FROM projects ORDER BY name"
    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(sql)
            rows = cur.fetchall()
        finally:
            cur.close()
    return jsonify(rows)


@app.route("/api/experiments", methods=["GET"])
def list_experiments():
    project_id = request.args.get("project_id", type=int)

    if project_id is not None:
        sql = """
            SELECT experiment_id, name, status
            FROM experiments
            WHERE project_id = %s
            ORDER BY name
        """
        params = (project_id,)
    else:
        sql = "SELECT experiment_id, name, status FROM experiments ORDER BY name"
        params = ()

    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(sql, params)
            rows = cur.fetchall()
        finally:
            cur.close()
    return jsonify(rows)


@app.route("/api/models", methods=["GET"])
def list_models():
    sql = "SELECT DISTINCT model_name FROM runs ORDER BY model_name"
    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(sql)
            rows = cur.fetchall()
        finally:
            cur.close()
    return jsonify([r["model_name"] for r in rows])


@app.route("/api/optimizers", methods=["GET"])
def list_optimizers():
    sql = """
        SELECT DISTINCT optimizer
        FROM runs
        WHERE optimizer IS NOT NULL
        ORDER BY optimizer
    """
    with get_conn() as conn:
        cur = _cursor(conn)
        try:
            cur.execute(sql)
            rows = cur.fetchall()
        finally:
            cur.close()
    return jsonify([r["optimizer"] for r in rows])


# ------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
