-- ML Experiment Tracker — Database Schema
-- Run: psql -U <user> -d <dbname> -f schema.sql

DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS metrics CASCADE;
DROP TABLE IF EXISTS runs CASCADE;
DROP TABLE IF EXISTS experiments CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
    user_id    SERIAL PRIMARY KEY,
    username   VARCHAR(50)  UNIQUE NOT NULL,
    email      VARCHAR(120) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
    project_id  SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    owner_id    INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE experiments (
    experiment_id SERIAL PRIMARY KEY,
    project_id    INT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    name          VARCHAR(100) NOT NULL,
    status        VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE runs (
    run_id        SERIAL PRIMARY KEY,
    experiment_id INT NOT NULL REFERENCES experiments(experiment_id) ON DELETE CASCADE,
    model_name    VARCHAR(100) NOT NULL,
    dataset       VARCHAR(100) NOT NULL,
    epochs        INT,
    batch_size    INT,
    learning_rate FLOAT,
    optimizer     VARCHAR(50),
    notes         TEXT,
    created_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE metrics (
    metric_id    SERIAL PRIMARY KEY,
    run_id       INT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    metric_name  VARCHAR(50) NOT NULL,
    metric_value FLOAT NOT NULL,
    epoch        INT,
    logged_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE tags (
    tag_id   SERIAL PRIMARY KEY,
    run_id   INT NOT NULL REFERENCES runs(run_id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL
);

-- ============================================================
-- Indexes — added to speed up the most frequent app queries
-- ============================================================

-- Index: idx_runs_experiment_id
-- Supports: GET /api/runs filter by experiment_id
-- Benefit: speeds up the JOIN between runs and experiments on experiment_id
CREATE INDEX idx_runs_experiment_id ON runs(experiment_id);

-- Index: idx_runs_model_name
-- Supports: GET /api/runs filter by model_name (ILIKE search)
-- Benefit: speeds up the WHERE clause filtering runs by model_name
CREATE INDEX idx_runs_model_name ON runs(model_name);

-- Index: idx_runs_optimizer
-- Supports: GET /api/runs filter by optimizer + GET /api/optimizers distinct query
-- Benefit: speeds up WHERE filter and SELECT DISTINCT on the optimizer column
CREATE INDEX idx_runs_optimizer ON runs(optimizer);

-- Index: idx_metrics_run_id
-- Supports: GET /api/report/run/<run_id> which fetches all metrics for a run
-- Benefit: speeds up the lookup of all metric rows belonging to a specific run
CREATE INDEX idx_metrics_run_id ON metrics(run_id);

-- Index: idx_experiments_project_id
-- Supports: GET /api/experiments?project_id=X (cascade dropdown query)
-- Benefit: speeds up the filter that retrieves experiments for a given project
CREATE INDEX idx_experiments_project_id ON experiments(project_id);

-- Index: idx_tags_run_id
-- Supports: tag lookup when building the runs report (joined in GET /api/runs)
-- Benefit: speeds up the JOIN that aggregates tags per run
CREATE INDEX idx_tags_run_id ON tags(run_id);
