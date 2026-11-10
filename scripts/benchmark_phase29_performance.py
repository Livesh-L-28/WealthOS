#!/usr/bin/env python3
"""
WealthOS Phase 29 Empirical Performance & Reliability Benchmark Suite.

Executes 240 benchmark requests (30 samples per endpoint across 8 critical paths)
against the isolated staging environment (Backend: 8005, Web: 3005, DB: 5432).
Measures empirical p50, p95, p99 latencies, error rates, and writes results
to docs/phase29/benchmark_results_p29.json.
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
    print("WEALTHOS PHASE 29 EMPIRICAL PERFORMANCE & RELIABILITY BENCHMARK")
    print("=" * 80)

    run_id = uuid.uuid4().hex[:8]
    email = f"perf.p29.{run_id}@wealthos.dev"
    password = f"VaultPass#{run_id}9921!"

    with httpx.Client(timeout=15.0) as client:
        # Register benchmark user
        reg_res = client.post(
            f"{API_BASE}/auth/register",
            json={"email": email, "password": password, "first_name": "Perf29", "last_name": "Auditor"},
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
            json={"device_id": f"dev-p29-{run_id}", "client_version": "1.0.1", "platform": "web"},
            headers=headers,
        ).json()
        session_id = sync_sess["session_id"]

        benchmarks = [
            ("Web Root (/)", "GET", f"{WEB_BASE}/", None, {}),
            ("Web Dashboard (/dashboard)", "GET", f"{WEB_BASE}/dashboard", None, {}),
            ("API Health Probe", "GET", f"{API_BASE}/health", None, {}),
            ("Cash Position (/cash-management/position)", "GET", f"{API_BASE}/cash-management/position", None, headers),
            ("Portfolio Summary (/investments/portfolio)", "GET", f"{API_BASE}/investments/portfolio", None, headers),
            ("Sync Session Init (/sync/sessions)", "POST", f"{API_BASE}/sync/sessions", {"device_id": f"bench-p29-{run_id}", "client_version": "1.0.1", "platform": "android"}, headers),
            ("Sync Operation Ingestion (/sync/operations)", "POST", f"{API_BASE}/sync/operations", "DYNAMIC_BATCH", headers),
            ("Sync Delta Stream (/sync/delta)", "GET", f"{API_BASE}/sync/delta?since_cursor=cur-initial", None, headers),
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
                                        "idempotency_key": f"idem-p29-{run_id}-{i}",
                                        "client_timestamp": "2026-11-10T12:00:00Z",
                                        "payload": {"amount": f"{300 + i}.00", "category": "General"},
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

        with open("docs/phase29/benchmark_results_p29.json", "w") as f:
            json.dump(results, f, indent=2)

    print("=" * 80)
    print(f"PHASE 29 BENCHMARK COMPLETE: {total_samples} samples collected, {total_errors} errors")
    print("=" * 80)

if __name__ == "__main__":
    main()

