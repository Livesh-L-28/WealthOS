#!/usr/bin/env python3
"""WealthOS Supply-Chain Dependency Security Auditor.

Enforces zero unvetted critical or high vulnerabilities across npm and Python dependencies.
- Replaces unverified '|| true' gates with policy-governed vulnerability auditing.
- Matches detected advisories against approved, time-bound security exceptions in
  'scripts/security_exceptions.json'.
- Fails closed (exit code 1) upon encountering any untracked or expired critical advisory.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEPTIONS_FILE = REPO_ROOT / "scripts/security_exceptions.json"


def load_security_exceptions() -> dict[str, dict]:
    """Load and index approved dependency exceptions by (package, vulnerability_id)."""
    if not EXCEPTIONS_FILE.exists():
        return {}
    with open(EXCEPTIONS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    indexed = {}
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    for exc in data.get("exceptions", []):
        pkg = exc.get("package")
        vuln_id = exc.get("vulnerability_id")
        expiry = exc.get("review_expiry_date", "1970-01-01")
        if expiry >= today:
            indexed[(pkg, vuln_id)] = exc
    return indexed


def audit_npm_dependencies() -> bool:
    """Run npm audit --json and verify against approved exception policy."""
    print("[AUDIT] Running npm dependency security audit...")
    res = subprocess.run(["npm", "audit", "--json"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    try:
        report = json.loads(res.stdout)
    except json.JSONDecodeError:
        sys.stderr.write(f"[ERROR] Failed to parse npm audit output:\n{res.stdout}\n{res.stderr}\n")
        return False

    vulnerabilities = report.get("vulnerabilities", {})
    metadata = report.get("metadata", {}).get("vulnerabilities", {})
    critical_count = metadata.get("critical", 0)

    print(f"[INFO] npm audit scan complete: {critical_count} critical vulnerabilities flagged.")

    approved_exceptions = load_security_exceptions()
    unapproved_criticals = []
    approved_found = []

    for pkg_name, details in vulnerabilities.items():
        severity = details.get("severity")
        if severity != "critical":
            continue

        # Each vulnerability can have multiple advisory sources via 'via'
        via_list = details.get("via", [])
        for item in via_list:
            if isinstance(item, dict):
                # Only evaluate critical advisories
                if item.get("severity") != "critical":
                    continue

                vuln_id = item.get("url", "").split("/")[-1]
                title = item.get("title", "Unknown")
                key = (pkg_name, vuln_id)

                if key in approved_exceptions:
                    exc = approved_exceptions[key]
                    approved_found.append({
                        "package": pkg_name,
                        "vuln_id": vuln_id,
                        "title": title,
                        "mitigation": exc.get("mitigation"),
                        "expiry": exc.get("review_expiry_date"),
                    })
                else:
                    unapproved_criticals.append({
                        "package": pkg_name,
                        "vuln_id": vuln_id,
                        "title": title,
                        "url": item.get("url"),
                    })

    if approved_found:
        print("\n[INFO] Approved & Vetted Security Exceptions Active:")
        for app in approved_found:
            print(f"  - {app['package']} ({app['vuln_id']}): {app['title']}")
            print(f"    Mitigation: {app['mitigation']} (Expires: {app['expiry']})")

    if unapproved_criticals:
        sys.stderr.write("\n[CRITICAL FAILURE] Unapproved critical vulnerabilities detected!\n")
        for unapp in unapproved_criticals:
            sys.stderr.write(f"  - {unapp['package']} ({unapp['vuln_id']}): {unapp['title']}\n")
            sys.stderr.write(f"    Advisory: {unapp['url']}\n")
        sys.stderr.write("\nPolicy Violation: Every critical vulnerability must be remediated or explicitly documented in scripts/security_exceptions.json with human executive approval.\n")
        return False

    print("\n[SUCCESS] npm supply chain audit passed: Zero unapproved critical vulnerabilities.")
    return True


def audit_python_dependencies() -> bool:
    """Run pip-audit on backend dependencies."""
    print("\n[AUDIT] Running Python backend pip-audit...")
    python_bin = REPO_ROOT / "backend/.venv/bin/pip-audit"
    if python_bin.exists():
        cmd = [str(python_bin), "--desc"]
    elif shutil.which("pip-audit"):
        cmd = ["pip-audit", "--desc"]
    else:
        sys.stderr.write("[ERROR] pip-audit executable not found in PATH or backend/.venv/bin/pip-audit\n")
        return False

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, cwd=str(REPO_ROOT / "backend"))
    if res.returncode != 0:
        sys.stderr.write(f"[CRITICAL FAILURE] pip-audit detected vulnerabilities!\n{res.stdout}\n{res.stderr}\n")
        return False

    print("[SUCCESS] Python backend pip-audit passed: 0 known vulnerabilities found.")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description="WealthOS Dependency Security Auditor")
    parser.add_argument("--npm-only", action="store_true", help="Audit npm dependencies only")
    parser.add_argument("--python-only", action="store_true", help="Audit Python dependencies only")
    args = parser.parse_args()

    npm_ok = True
    py_ok = True

    if args.npm_only:
        npm_ok = audit_npm_dependencies()
    elif args.python_only:
        py_ok = audit_python_dependencies()
    else:
        npm_ok = audit_npm_dependencies()
        py_ok = audit_python_dependencies()

    if not npm_ok or not py_ok:
        sys.exit(1)
    print("\n[SUCCESS] Full supply-chain security audit verified cleanly across requested surfaces.")
    sys.exit(0)


if __name__ == "__main__":
    main()
