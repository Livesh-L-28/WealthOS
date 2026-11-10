#!/usr/bin/env python3
"""
WealthOS Phase 28 Performance & Latency Benchmark Suite.

Executes 240 empirical benchmark samples (30 samples per endpoint) across:
- Next.js Web Server (Port 3005)
- FastAPI Staging Backend (Port 8005)
- Cash Management Engine
- Investment Portfolio Valuation
- Phase 28 Hardened Synchronization Engine

Measures empirical p50, p95, p99 latencies, error rates, and writes
results to docs/phase28/benchmark_results_p28.json.
"""

import json
import statistics
import sys
import time
import uuid
import httpx
import psycopg

WEB_BASE = "http://localhost:3005"
API_BASE = "http://localhost:8005/api/v1"
DB_CONN = {
    "host": "localhost",
    "port": 5432,
    "dbname": "wealthos_staging",
    "user": "wealthos_admin",
    "password": "wealthos_local_dev_password_change_in_prod",
}

def main():
    print("=" * 80)
    print("WEALTHOS PHASE 28 EMPIRICAL PERFORMANCE & LATENCY BENCHMARK")
    print("=" * 80)

    run_id = uuid.uuid4().hex[:8]
    email = f"perf.p28.{run_id}@wealthos.dev"
    password = f"VaultPass#{run_id}9921!"

    with httpx.Client(timeout=15.0) as client:
        reg_res = client.post(
            f"{API_BASE}/auth/register",
            json={"email": email, "password": password, "first_name": "Perf", "last_name": "Auditor"},
        )
        if reg_res.status_code != 201:
            print(f"Failed to register user: {reg_res.text}")
            sys.exit(1)

        user_id = reg_res.json()["data"]["user_id"]
        tenant_id = reg_res.json()["data"]["personal_tenant_id"]

        with psycopg.connect(**DB_CONN) as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE users SET status = 'active', email_verified_at = now() WHERE id = %s;", (user_id,))
                conn.commit()

        login_res = client.post(f"{API_BASE}/auth/login", json={"email": email, "password": password})
        token = login_res.json()["data"]["access_token"]
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "X-Tenant-ID": tenant_id,
        }

        # Seed an account for cash position queries
        client.post(
            f"{API_BASE}/cash-management/accounts",
            json={"account_name": "Operating HDFC", "account_number_mask": "••••1234", "account_type": "CURRENT", "currency": "INR", "current_balance": "50000.00"},
            headers=headers,
        )

        # Create a sync session
        sync_sess = client.post(
            f"{API_BASE}/sync/sessions",
            json={"device_id": f"dev-{run_id}", "client_version": "1.0.2", "platform": "web"},
            headers=headers,
        ).json()
        session_id = sync_sess["session_id"]

        benchmarks = [
            ("Web Root (/)", "GET", f"{WEB_BASE}/", None, {}),
            ("Web Dashboard (/dashboard)", "GET", f"{WEB_BASE}/dashboard", None, {}),
            ("API Health Readiness", "GET", f"{API_BASE}/health", None, {}),
            ("Cash Management Position", "GET", f"{API_BASE}/cash-management/position", None, headers),
            ("Portfolio Summary (/portfolio)", "GET", f"{API_BASE}/investments/portfolio", None, headers),
            ("Sync Session Creation", "POST", f"{API_BASE}/sync/sessions", {"device_id": "bench-p28", "client_version": "1.0.2", "platform": "android"}, headers),
            ("Sync Operation Ingestion", "POST", f"{API_BASE}/sync/operations", "DYNAMIC_BATCH", headers),
            ("Sync Delta Stream", "GET", f"{API_BASE}/sync/delta?since_cursor=cur-initial", None, headers),
        ]

        results = {}
        iterations = 30
        total_samples = 0
        total_errors = 0

        for name, method, url, payload, hdrs in benchmarks:
            latencies = []
            errors = 0
            for i in range(iterations):
                t0 = time.perf_counter()
                try:
                    if method == "GET":
                        r = client.get(url, headers=hdrs)
                    elif method == "POST":
                        req_payload = payload
                        if payload == "DYNAMIC_BATCH":
                            req_payload = {
                                "session_id": session_id,
                                "operations": [
                                    {
                                        "operation_id": str(uuid.uuid4()),
                                        "operation_type": "RECORD_EXPENSE",
                                        "idempotency_key": f"idem-p28-{run_id}-{i}",
                                        "client_timestamp": "2026-11-10T12:00:00Z",
                                        "payload": {"amount": f"{200 + i}.00", "category": "General"},
                                    }
                                ],
                            }
                        r = client.post(url, json=req_payload, headers=hdrs)

                    elapsed_ms = (time.perf_counter() - t0) * 1000.0
                    if r.status_code in (200, 201):
                        latencies.append(elapsed_ms)
                    else:
                        errors += 1
                except Exception:
                    errors += 1

            total_samples += len(latencies)
            total_errors += errors

            if latencies:
                latencies.sort()
                p50 = statistics.median(latencies)
                p95 = latencies[int(len(latencies) * 0.95)]
                p99 = latencies[int(len(latencies) * 0.99)]
                results[name] = {
                    "p50_ms": round(p50, 2),
                    "p95_ms": round(p95, 2),
                    "p99_ms": round(p99, 2),
                    "samples": len(latencies),
                    "errors": errors,
                }
                print(f"[{name}] p50: {p50:.2f}ms | p95: {p95:.2f}ms | p99: {p99:.2f}ms | Errors: {errors}/{iterations}")

        # Save benchmark output
        with open("docs/phase28/benchmark_results_p28.json", "w") as f:
            json.dump(results, f, indent=2)

    print("=" * 80)
    print(f"PHASE 28 BENCHMARK COMPLETED: {total_samples} samples collected, {total_errors} errors")
    print("Results written to docs/phase28/benchmark_results_p28.json")
    print("=" * 80)

if __name__ == "__main__":
    main()
