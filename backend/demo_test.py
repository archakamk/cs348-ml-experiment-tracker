"""
CS 348 Stage 2 — Demo Script
Demonstrates INSERT → read → UPDATE → read → DELETE → read
against the live Flask API.  Run with the server already started:

    python demo_test.py

Requires: pip install requests
"""

import sys
import requests

BASE = "http://localhost:5001"


def sep(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def show_runs(label):
    """Fetch all runs and print a compact summary."""
    resp = requests.get(f"{BASE}/api/runs")
    resp.raise_for_status()
    runs = resp.json()
    print(f"\n[{label}] Total runs: {len(runs)}")
    print(f"  {'ID':<5} {'Model':<15} {'Dataset':<15} {'Epochs':<8} {'Optimizer':<10}")
    print(f"  {'-'*5} {'-'*15} {'-'*15} {'-'*8} {'-'*10}")
    for r in runs:
        print(
            f"  {r['run_id']:<5} {r['model_name']:<15} {r['dataset']:<15} "
            f"{str(r.get('epochs') or '—'):<8} {r.get('optimizer') or '—':<10}"
        )
    return runs


def show_summary(label):
    """Fetch the dashboard summary report and print it."""
    resp = requests.get(f"{BASE}/api/report/summary")
    resp.raise_for_status()
    rows = resp.json()
    print(f"\n[{label}] Dashboard Summary Report:")
    print(f"  {'Project':<25} {'Runs':<6} {'Best Acc':<12} {'Avg LR':<12} {'Top Model':<15}")
    print(f"  {'-'*25} {'-'*6} {'-'*12} {'-'*12} {'-'*15}")
    for r in rows:
        acc = f"{float(r['best_accuracy']):.4f}" if r.get("best_accuracy") else "—"
        lr = f"{float(r['avg_learning_rate']):.6f}" if r.get("avg_learning_rate") else "—"
        print(
            f"  {r['project_name']:<25} {r['run_count']:<6} "
            f"{acc:<12} {lr:<12} {r.get('most_used_model') or '—':<15}"
        )


def main():
    # Verify server is up
    try:
        h = requests.get(f"{BASE}/api/health", timeout=3)
        h.raise_for_status()
    except requests.ConnectionError:
        print("ERROR: Flask server not running on localhost:5001")
        print("Start it first:  cd backend && flask run --port 5001")
        sys.exit(1)

    # ── BEFORE state ────────────────────────────────────────────
    sep("BEFORE — current runs and summary")
    before_runs = show_runs("BEFORE")
    show_summary("BEFORE")

    # ── 1. INSERT a new run ─────────────────────────────────────
    sep("STEP 1: INSERT — POST /api/runs")
    new_run = {
        "experiment_id": 1,
        "model_name": "EfficientNet-B0",
        "dataset": "CIFAR-10",
        "epochs": 25,
        "batch_size": 64,
        "learning_rate": 0.0003,
        "optimizer": "AdamW",
        "notes": "Demo run for CS 348 Stage 2",
    }
    resp = requests.post(f"{BASE}/api/runs", json=new_run)
    resp.raise_for_status()
    created = resp.json()
    run_id = created["run_id"]
    print(f"  Created run #{run_id}: {created['model_name']} on {created['dataset']}")
    print(f"  epochs={created['epochs']}, lr={created['learning_rate']}, optimizer={created['optimizer']}")

    show_runs("AFTER INSERT")

    # ── 2. UPDATE the run ───────────────────────────────────────
    sep("STEP 2: UPDATE — PUT /api/runs/" + str(run_id))
    update_data = {"epochs": 50, "learning_rate": 0.0001, "notes": "Updated: doubled epochs, halved LR"}
    resp = requests.put(f"{BASE}/api/runs/{run_id}", json=update_data)
    resp.raise_for_status()
    updated = resp.json()
    print(f"  Updated run #{run_id}:")
    print(f"    epochs: 25 → {updated['epochs']}")
    print(f"    learning_rate: 0.0003 → {updated['learning_rate']}")
    print(f"    notes: \"{updated['notes']}\"")

    show_runs("AFTER UPDATE")
    show_summary("AFTER UPDATE — notice run count increased")

    # ── 3. DELETE the run ───────────────────────────────────────
    sep("STEP 3: DELETE — DELETE /api/runs/" + str(run_id))
    resp = requests.delete(f"{BASE}/api/runs/{run_id}")
    resp.raise_for_status()
    print(f"  Deleted run #{run_id}: {resp.json()}")
    print(f"  (CASCADE also removed any metrics and tags for this run)")

    after_runs = show_runs("AFTER DELETE")
    show_summary("AFTER DELETE — run count back to original")

    # ── Verify ──────────────────────────────────────────────────
    sep("VERIFICATION")
    if len(after_runs) == len(before_runs):
        print("  PASS — run count returned to original after delete.")
    else:
        print(f"  MISMATCH — before: {len(before_runs)}, after: {len(after_runs)}")

    print("\nDemo complete.\n")


if __name__ == "__main__":
    main()
