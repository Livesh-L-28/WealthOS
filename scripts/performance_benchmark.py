#!/usr/bin/env python3
"""WealthOS Performance Benchmark & Latency Profiling Tool.

Executes reproducible HTTP benchmark requests against the WealthOS API stack,
calculating latency distribution percentiles (p50, p90, p95, p99), error rates,
and throughput (RPS).
"""

import argparse
import json
import math
import sys
import time
import urllib.error
import urllib.request
import uuid
from typing import Any


def percentile(data: list[float], p: float) -> float:
    """Calculate percentile value from sorted data list."""
    if not data:
        return 0.0
    k = (len(data) - 1) * (p / 100.0)
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return data[int(k)]
    d0 = data[int(f)] * (c - k)
    d1 = data[int(c)] * (k - f)
    return d0 + d1


def execute_request(
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    payload: bytes | None = None,
    timeout: float = 10.0,
) -> tuple[int, float, str | None]:
    """Execute a single HTTP request and measure latency in milliseconds."""
    req = urllib.request.Request(url, data=payload, headers=headers or {}, method=method)
    start = time.perf_counter()
    status_code = 0
    error_msg = None
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            status_code = response.status
            response.read()
    except urllib.error.HTTPError as e:
        status_code = e.code
        error_msg = f"HTTPError: {e.code}"
    except Exception as e:
        status_code = 500
        error_msg = str(e)
    latency_ms = (time.perf_counter() - start) * 1000.0
    return status_code, latency_ms, error_msg


def benchmark_endpoint(
    name: str,
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    payload: bytes | None = None,
    iterations: int = 100,
    warmup: int = 10,
) -> dict[str, Any]:
    """Run benchmark against a single endpoint with warm-up phase."""
    print(f"[*] Benchmarking {name} ({method} {url}) - {warmup} warm-up, {iterations} iterations...")

    # Warm-up phase
    for _ in range(warmup):
        execute_request(url, method=method, headers=headers, payload=payload)

    latencies: list[float] = []
    errors = 0
    start_total = time.perf_counter()

    for i in range(iterations):
        status_code, lat, err = execute_request(url, method=method, headers=headers, payload=payload)
        latencies.append(lat)
        if status_code >= 400:
            errors += 1

    total_time_sec = time.perf_counter() - start_total
    latencies.sort()

    mean_lat = sum(latencies) / len(latencies)
    variance = sum((x - mean_lat) ** 2 for x in latencies) / len(latencies)
    std_dev = math.sqrt(variance)

    result = {
        "endpoint": name,
        "method": method,
        "url": url,
        "iterations": iterations,
        "warmup": warmup,
        "error_count": errors,
        "error_rate_pct": round((errors / iterations) * 100.0, 2),
        "throughput_rps": round(iterations / total_time_sec, 2),
        "latency_ms": {
            "min": round(min(latencies), 2),
            "mean": round(mean_lat, 2),
            "p50": round(percentile(latencies, 50), 2),
            "p90": round(percentile(latencies, 90), 2),
            "p95": round(percentile(latencies, 95), 2),
            "p99": round(percentile(latencies, 99), 2),
            "max": round(max(latencies), 2),
            "std_dev": round(std_dev, 2),
        },
    }
    return result


def obtain_auth_token(base_url: str) -> tuple[str | None, str | None]:
    """Obtain a genuine JWT access token for performance testing."""
    login_url = f"{base_url}/api/v1/auth/login"
    login_body = json.dumps({"email": "perf.benchmark@example.com", "password": "SecurePassword#2026"}).encode("utf-8")
    req = urllib.request.Request(
        login_url,
        data=login_body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data.get("success") and "data" in data:
                token = data["data"].get("access_token")
                tenant_id = data["data"].get("active_tenant", {}).get("id")
                return token, tenant_id
    except Exception as e:
        print(f"[!] Unable to obtain JWT via login: {e}", file=sys.stderr)
    return None, None


def main() -> int:
    parser = argparse.ArgumentParser(description="WealthOS Performance Benchmark")
    parser.add_argument("--base-url", default="http://localhost:8000", help="API base URL")
    parser.add_argument("--iterations", type=int, default=100, help="Iterations per endpoint")
    parser.add_argument("--warmup", type=int, default=10, help="Warm-up requests")
    parser.add_argument("--output", default="benchmark_results.json", help="Output JSON file")
    args = parser.parse_args()

    print("==================================================================")
    print("WEALTHOS REPRODUCIBLE PERFORMANCE BENCHMARK")
    print(f"Target Base URL: {args.base_url}")
    print(f"Iterations: {args.iterations} | Warm-up: {args.warmup}")
    print(f"Timestamp: {time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}")
    print("==================================================================")

    results: list[dict[str, Any]] = []

    # 1. /health/live (Liveness probe)
    res_live = benchmark_endpoint(
        name="Liveness Probe (/health/live)",
        url=f"{args.base_url}/health/live",
        iterations=args.iterations,
        warmup=args.warmup,
    )
    results.append(res_live)

    # 2. /health/ready (Readiness probe)
    res_ready = benchmark_endpoint(
        name="Readiness Probe (/health/ready)",
        url=f"{args.base_url}/health/ready",
        iterations=args.iterations,
        warmup=args.warmup,
    )
    results.append(res_ready)

    # 3. /api/v1/health (Diagnostic health probe)
    res_diag = benchmark_endpoint(
        name="Detailed Health Probe (/api/v1/health)",
        url=f"{args.base_url}/api/v1/health",
        iterations=args.iterations,
        warmup=args.warmup,
    )
    results.append(res_diag)

    # 4. Authenticated Endpoint (/api/v1/auth/me)
    token, tenant_id = obtain_auth_token(args.base_url)
    auth_headers: dict[str, str] = {}
    if token:
        auth_headers["Authorization"] = f"Bearer {token}"
        if tenant_id:
            auth_headers["X-Tenant-ID"] = str(tenant_id)

        # Ensure accounts are seeded for the tenant
        try:
            seed_req = urllib.request.Request(
                f"{args.base_url}/api/v1/accounting/accounts/seed",
                data=b"{}",
                headers={**auth_headers, "Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(seed_req, timeout=5.0) as seed_resp:
                seed_resp.read()
        except Exception:
            pass  # Already seeded or ignored

        res_auth = benchmark_endpoint(
            name="Authenticated User Profile (/api/v1/auth/me)",
            url=f"{args.base_url}/api/v1/auth/me",
            headers=auth_headers,
            iterations=args.iterations,
            warmup=args.warmup,
        )
        results.append(res_auth)

        # 5. Authenticated DB-Backed Query (/api/v1/accounting/accounts)
        res_db = benchmark_endpoint(
            name="Authenticated DB-Backed Accounts (/api/v1/accounting/accounts)",
            url=f"{args.base_url}/api/v1/accounting/accounts",
            headers=auth_headers,
            iterations=args.iterations,
            warmup=args.warmup,
        )
        results.append(res_db)
    else:
        # Fallback to root endpoint if JWT provision failed
        res_root = benchmark_endpoint(
            name="Root Service Info (/)",
            url=f"{args.base_url}/",
            iterations=args.iterations,
            warmup=args.warmup,
        )
        results.append(res_root)

    # Output Summary Table
    print("\n" + "=" * 92)
    print(f"{'Endpoint':<40} | {'p50 (ms)':<9} | {'p95 (ms)':<9} | {'p99 (ms)':<9} | {'RPS':<8} | {'Errors':<6}")
    print("-" * 92)
    for r in results:
        l = r["latency_ms"]
        print(
            f"{r['endpoint']:<40} | {l['p50']:<9} | {l['p95']:<9} | {l['p99']:<9} | {r['throughput_rps']:<8} | {r['error_rate_pct']}%"
        )
    print("=" * 92)

    # Save to JSON
    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "target_base_url": args.base_url,
        "iterations": args.iterations,
        "warmup": args.warmup,
        "results": results,
    }
    with open(args.output, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[+] Raw benchmark data saved to: {args.output}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
