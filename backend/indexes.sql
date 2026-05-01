-- indexes.sql — standalone index creation for an existing database
-- Run: psql -U <user> -d <dbname> -f indexes.sql

CREATE INDEX IF NOT EXISTS idx_runs_experiment_id    ON runs(experiment_id);
CREATE INDEX IF NOT EXISTS idx_runs_model_name       ON runs(model_name);
CREATE INDEX IF NOT EXISTS idx_runs_optimizer        ON runs(optimizer);
CREATE INDEX IF NOT EXISTS idx_metrics_run_id        ON metrics(run_id);
CREATE INDEX IF NOT EXISTS idx_experiments_project_id ON experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_tags_run_id           ON tags(run_id);
