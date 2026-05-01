# ML Experiment Tracker

A full-stack web application for logging and comparing machine-learning training
runs. Built for **CS 348 — Database Systems**.

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Backend  | Flask, psycopg2, python-dotenv      |
| Frontend | React 19, Vite, Axios, React Router |
| Database | PostgreSQL                          |

## Project Structure

```
348_project/
├── backend/
│   ├── app.py              Flask REST API (14 endpoints)
│   ├── db.py               psycopg2 connection-pool helper
│   ├── schema.sql          CREATE TABLE statements (6 tables)
│   ├── seed.sql            Realistic sample data
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api.js          Axios API client
│   │   ├── App.jsx         Layout + React Router
│   │   ├── index.css       Global styles
│   │   └── pages/
│   │       ├── Dashboard.jsx
│   │       ├── RunsExplorer.jsx
│   │       ├── RunModal.jsx
│   │       └── RunDetail.jsx
│   ├── package.json
│   └── vite.config.js
├── .env.template           DB credentials template
├── .env                    Local credentials (do not commit)
├── run.sh                  Start both servers
├── venv/                   Python virtual environment
└── README.md
```

## Setup Instructions

### 1. Create the PostgreSQL database

```bash
createdb mltracker
```

### 2. Configure environment variables

```bash
cp .env.template .env
```

Edit `.env` and fill in your PostgreSQL credentials:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mltracker
DB_USER=<your_pg_username>
DB_PASSWORD=<your_pg_password>
FLASK_ENV=development
```

### 3. Load the schema and seed data

```bash
psql -d mltracker -f backend/schema.sql
psql -d mltracker -f backend/seed.sql
```

### 4. Install backend dependencies

```bash
source venv/bin/activate
pip install -r backend/requirements.txt
```

### 5. Install frontend dependencies

```bash
cd frontend
npm install
```

### 6. Start both servers

```bash
bash run.sh
```

Or start them manually in two terminals:

```bash
# Terminal 1 — Backend (http://localhost:5001)
cd backend && source ../venv/bin/activate && flask run --port 5001

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

### 7. Verify

Open `http://localhost:5173` in your browser. The Dashboard should display
the project summary report loaded from PostgreSQL.

You can also test the API health check directly:

```bash
curl http://localhost:5001/api/health
# → {"status":"ok"}
```

## Database Design

### Entity-Relationship Overview

`users` → `projects` → `experiments` → `runs` → `metrics`/`tags`

All foreign keys use `ON DELETE CASCADE` so deleting a parent automatically
removes dependent rows.

### Tables

#### users

| Column     | Type          | Constraints              |
|------------|---------------|--------------------------|
| user_id    | SERIAL        | PRIMARY KEY              |
| username   | VARCHAR(50)   | UNIQUE NOT NULL          |
| email      | VARCHAR(120)  | UNIQUE NOT NULL          |
| created_at | TIMESTAMP     | DEFAULT NOW()            |

#### projects

| Column      | Type          | Constraints                              |
|-------------|---------------|------------------------------------------|
| project_id  | SERIAL        | PRIMARY KEY                              |
| name        | VARCHAR(100)  | NOT NULL                                 |
| description | TEXT          |                                          |
| owner_id    | INT           | NOT NULL, FK → users(user_id) CASCADE    |
| created_at  | TIMESTAMP     | DEFAULT NOW()                            |

#### experiments

| Column        | Type         | Constraints                                        |
|---------------|--------------|----------------------------------------------------|
| experiment_id | SERIAL       | PRIMARY KEY                                        |
| project_id    | INT          | NOT NULL, FK → projects(project_id) CASCADE        |
| name          | VARCHAR(100) | NOT NULL                                           |
| status        | VARCHAR(20)  | NOT NULL, CHECK IN ('running','completed','failed')|
| created_at    | TIMESTAMP    | DEFAULT NOW()                                      |

#### runs

| Column        | Type          | Constraints                                     |
|---------------|---------------|-------------------------------------------------|
| run_id        | SERIAL        | PRIMARY KEY                                     |
| experiment_id | INT           | NOT NULL, FK → experiments(experiment_id) CASCADE|
| model_name    | VARCHAR(100)  | NOT NULL                                        |
| dataset       | VARCHAR(100)  | NOT NULL                                        |
| epochs        | INT           |                                                 |
| batch_size    | INT           |                                                 |
| learning_rate | FLOAT         |                                                 |
| optimizer     | VARCHAR(50)   |                                                 |
| notes         | TEXT          |                                                 |
| created_at    | TIMESTAMP     | DEFAULT NOW()                                   |

#### metrics

| Column       | Type         | Constraints                          |
|--------------|--------------|--------------------------------------|
| metric_id    | SERIAL       | PRIMARY KEY                          |
| run_id       | INT          | NOT NULL, FK → runs(run_id) CASCADE  |
| metric_name  | VARCHAR(50)  | NOT NULL                             |
| metric_value | FLOAT        | NOT NULL                             |
| epoch        | INT          |                                      |
| logged_at    | TIMESTAMP    | DEFAULT NOW()                        |

#### tags

| Column   | Type         | Constraints                          |
|----------|--------------|--------------------------------------|
| tag_id   | SERIAL       | PRIMARY KEY                          |
| run_id   | INT          | NOT NULL, FK → runs(run_id) CASCADE  |
| tag_name | VARCHAR(50)  | NOT NULL                             |

### Seed Data Summary

| Table       | Rows | Sample content                                          |
|-------------|------|---------------------------------------------------------|
| users       |    3 | alice, bob, charlie                                     |
| projects    |    3 | Image Classification, NLP Sentiment, Language Modeling   |
| experiments |    5 | ResNet CIFAR-10 Baseline, BERT Sentiment Fine-tune, etc.|
| runs        |   10 | ResNet50, BERT-base, GPT2-small on CIFAR-10/GLUE/etc.   |
| metrics     |   30 | accuracy, val_loss, f1_score, perplexity, bleu, etc.     |
| tags        |   10 | baseline, transfer-learning, fine-tune, oom-crash, etc.  |

## API Endpoints

### CRUD

| Method | Endpoint                | Description                     |
|--------|-------------------------|---------------------------------|
| POST   | /api/runs               | Create a new run                |
| PUT    | /api/runs/:id           | Update run fields               |
| DELETE | /api/runs/:id           | Delete run (cascades)           |
| POST   | /api/metrics            | Log a metric                    |
| DELETE | /api/metrics/:id        | Delete a metric                 |
| POST   | /api/tags               | Add a tag                       |
| DELETE | /api/tags/:id           | Delete a tag                    |

### Filter + Reports

| Method | Endpoint                | Description                                  |
|--------|-------------------------|----------------------------------------------|
| GET    | /api/runs               | List/filter runs (6 optional query params)   |
| GET    | /api/report/summary     | Per-project aggregate report                 |
| GET    | /api/report/run/:id     | Single run detail with metrics + tags        |

### Dynamic Dropdowns

| Method | Endpoint                | Description                          |
|--------|-------------------------|--------------------------------------|
| GET    | /api/projects           | All projects (id + name)             |
| GET    | /api/experiments        | Experiments, optional ?project_id=X  |
| GET    | /api/models             | Distinct model names from runs       |
| GET    | /api/optimizers         | Distinct optimizer values from runs  |

### Health

| Method | Endpoint                | Description          |
|--------|-------------------------|----------------------|
| GET    | /api/health             | {"status": "ok"}     |

## SQL Injection Prevention

All queries in `app.py` use **psycopg2 parameterized placeholders (`%s`)**. No
user-supplied values are ever interpolated into SQL strings via f-strings or
`.format()`. The two places where f-strings construct SQL (`update_run` and
`list_runs`) only interpolate **hardcoded column names** from a
`frozenset`/constant condition list — never user input. See comments in the
source code for details.

## AI Usage Disclosure

> **Required by CS 348 course policy.**
>
> Claude (Anthropic) was used to scaffold the project structure, generate SQL
> schema and seed data, and generate boilerplate Flask/React code. All code was
> reviewed, understood, and modified by the student. Queries were verified
> against psycopg2 documentation.
