#!/usr/bin/env python3
"""
WealthOS Phase 26.4: Real-World Reliability & Performance Benchmark Suite.
Measures true p50, p95, and p99 latency percentiles across key user operations
against the deployed staging web and API servers.
"""

import math
import statistics
import time
import uuid
import requests
import psycopg
from dotenv import dotenv_values

cfg = dotenv_values("backend/.env.staging")

API_BASE = "http://localhost:8005"
WEB_BASE = "http://localhost:3005"
DB_CONN = dict(
    dbname=cfg["POSTGRES_DB"],
    user=cfg["POSTGRES_USER"],
    password=cfg["POSTGRES_PASSWORD"],
    host=cfg["POSTGRES_HOST"],
    port=cfg["POSTGRES_PORT"],
)

def percentile(data, p):
    if not data:
        return 0.0
    sorted_d = sorted(data)
    idx = (len(sorted_d) - 1) * p
    floor = math.floor(idx)
    ceil = math.ceil(idx)
    if floor == ceil:
        return sorted_d[int(idx)]
    return sorted_d[floor] * (ceil - idx) + sorted_d[ceil] * (idx - floor)

def main():
    print("=" * 80)
    print("WEALTHOS PHASE 26.4: STAGING PERFORMANCE & LATENCY BENCHMARK")
    print("=" * 80)

    # 1. Setup authenticated benchmark tenant
    run_id = uuid.uuid4().hex[:8]
    email = f"staging.p26.perf.{run_id}@wealthos.dev"
    password = f"PerfBench#2026!"
    reg_res = requests.post(f"{API_BASE}/api/v1/auth/register", json={
        "email": email, "password": password, "first_name": "Performance", "last_name": "Benchmark"
    })
    user_id = reg_res.json()["data"]["user_id"]
    tenant_id = reg_res.json()["data"]["personal_tenant_id"]

    with psycopg.connect(**DB_CONN) as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE users SET status = 'active', email_verified_at = now() WHERE id = %s;", (user_id,))
            conn.commit()

    token = requests.post(f"{API_BASE}/api/v1/auth/login", json={"email": email, "password": password}).json()["data"]["access_token"]
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "X-Tenant-ID": tenant_id
    }

    # Pre-seed 2 accounts for transfer tests
    acc1 = requests.post(f"{API_BASE}/api/v1/cash-management/accounts", json={
        "account_name": "Source Account", "account_number_mask": "••••1111", "account_type": "SAVINGS", "currency": "INR", "current_balance": "500000.00"
    }, headers=headers).json()
    acc1_id = acc1.get("id") or acc1.get("data", {}).get("id")

    acc2 = requests.post(f"{API_BASE}/api/v1/cash-management/accounts", json={
        "account_name": "Destination Account", "account_number_mask": "••••2222", "account_type": "SAVINGS", "currency": "INR", "current_balance": "10000.00"
    }, headers=headers).json()
    acc2_id = acc2.get("id") or acc2.get("data", {}).get("id")

    # Benchmark operations
    benchmark_ops = [
        ("Web Initial Load (Root)", lambda: requests.get(f"{WEB_BASE}/")),
        ("Web Dashboard Page", lambda: requests.get(f"{WEB_BASE}/dashboard", cookies={"wealthos_access_token": token})),
        ("Account Position API", lambda: requests.get(f"{API_BASE}/api/v1/cash-management/position", headers=headers)),
        ("Portfolio Analytics API", lambda: requests.get(f"{API_BASE}/api/v1/investments/portfolio", headers=headers)),
        ("Transaction Search API", lambda: requests.get(f"{API_BASE}/api/v1/investments/transactions", headers=headers)),
        ("Copilot Session API", lambda: requests.post(f"{API_BASE}/api/v1/copilot/conversations", json={"title": "Perf Test"}, headers=headers)),
        ("Document Registration API", lambda: requests.post(f"{API_BASE}/api/v1/documents", json={
            "filename": f"bench_{uuid.uuid4().hex[:6]}.pdf", "file_size_bytes": 10240, "mime_type": "application/pdf",
            "storage_path": f"documents/{uuid.uuid4()}.pdf", "file_hash": uuid.uuid4().hex * 2, "document_type": "STATEMENT"
        }, headers=headers)),
        ("Internal Transfer POST", lambda: requests.post(f"{API_BASE}/api/v1/cash-management/transfers", json={
            "source_account_id": acc1_id, "destination_account_id": acc2_id, "amount": "10.00", "currency": "INR"
        }, headers=headers)),
        ("Deep Readiness Probe", lambda: requests.get(f"{API_BASE}/health/ready")),
    ]

    NUM_SAMPLES = 30
    report_data = []

    print(f"Executing {NUM_SAMPLES} iterations per benchmark operation...")
    print("-" * 80)

    for op_name, fn in benchmark_ops:
        latencies = []
        err_count = 0
        for _ in range(NUM_SAMPLES):
            t0 = time.time()
            try:
                res = fn()
                dur_ms = (time.time() - t0) * 1000.0
                if res.status_code in (200, 201, 204):
                    latencies.append(dur_ms)
                else:
                    err_count += 1
            except Exception:
                err_count += 1

        if latencies:
            p50 = round(percentile(latencies, 0.50), 2)
            p95 = round(percentile(latencies, 0.95), 2)
            p99 = round(percentile(latencies, 0.99), 2)
            avg = round(statistics.mean(latencies), 2)
            min_l = round(min(latencies), 2)
            max_l = round(max(latencies), 2)
        else:
            p50 = p95 = p99 = avg = min_l = max_l = 0.0

        report_data.append({
            "operation": op_name,
            "p50": p50,
            "p95": p95,
            "p99": p99,
            "mean": avg,
            "min": min_l,
            "max": max_l,
            "errors": err_count,
            "samples": NUM_SAMPLES
        })
        print(f"%-28s | p50: %6.2fms | p95: %6.2fms | p99: %6.2fms | Errors: %d" % (op_name, p50, p95, p99, err_count))

    print("=" * 80)
    print("BENCHMARK COMPLETED SUCCESSFULLY!")
    print("=" * 80)

    # Output JSON summary for documentation integration
    import json
    with open("docs/phase26/benchmark_results.json", "w") as f:
        json.dump(report_data, f, indent=2)

if __name__ == "__main__":
    main()
