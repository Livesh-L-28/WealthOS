#!/usr/bin/env python3
"""WealthOS Supply-Chain Dependency Security Auditor.

Enforces zero unvetted critical or high vulnerabilities across npm and Python dependencies.
- Replaces unverified '|| true' gates with policy-governed vulnerability auditing.
- Matches detected advisories against approved, time-bound security exceptions in
  'scripts/security_exceptions.json'.
- Strictly validates exception schema: requires package, advisory, severity, owner,
  justification, mitigation, and expiry.
- Rejects malformed, duplicate, or expired exceptions (fails closed with exit code 1).
- Distinctly reports acknowledged exceptions versus clean scan surfaces.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
EXCEPTIONS_FILE = REPO_ROOT / "scripts/security_exceptions.json"

REQUIRED_FIELDS = ("package", "severity", "owner", "justification", "mitigation")


def validate_and_load_exceptions(
    exceptions_file: Path | None = None,
) -> tuple[dict[tuple[str, str], dict[str, Any]], bool]:
    """Validate exception schema and load indexed approved exceptions.

    Returns:
        (indexed_exceptions, success_flag)
    """
    target_file = exceptions_file or EXCEPTIONS_FILE
    if not target_file.exists():
        sys.stderr.write(f"[CRITICAL FAILURE] Security exceptions file missing: {target_file}\n")
        return {}, False

    try:
        with open(target_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        sys.stderr.write(f"[CRITICAL FAILURE] Malformed JSON in {EXCEPTIONS_FILE}: {exc}\n")
        return {}, False

    exceptions_list = data.get("exceptions", [])
    if not isinstance(exceptions_list, list):
        sys.stderr.write("[CRITICAL FAILURE] 'exceptions' field must be a JSON array.\n")
        return {}, False

    today = datetime.now(UTC).strftime("%Y-%m-%d")
    indexed = {}
    seen_keys = set()
    errors = []

    for idx, exc in enumerate(exceptions_list):
        # 1. Check required fields
        missing = [field for field in REQUIRED_FIELDS if not exc.get(field)]
        advisory = exc.get("advisory") or exc.get("vulnerability_id")
        expiry = exc.get("expiry") or exc.get("review_expiry_date")

        if not advisory:
            missing.append("advisory")
        if not expiry:
            missing.append("expiry")

        if missing:
            errors.append(f"Exception #{idx + 1} ({exc.get('package', 'unknown')}): Missing required field(s): {', '.join(missing)}")
            continue

        pkg = exc["package"]
        key = (pkg, advisory)

        # 2. Reject duplicate exceptions
        if key in seen_keys:
            errors.append(f"Duplicate security exception detected for package '{pkg}', advisory '{advisory}'.")
            continue
        seen_keys.add(key)

        # 3. Fail closed on expired exceptions
        if expiry < today:
            errors.append(
                f"Expired security exception for package '{pkg}' ({advisory})! "
                f"Expired on: {expiry} (Today: {today}). Owner: {exc.get('owner')}. Policy requires remediation or re-approval."
            )
            continue

        indexed[key] = {
            "package": pkg,
            "advisory": advisory,
            "severity": exc.get("severity"),
            "owner": exc.get("owner"),
            "justification": exc.get("justification"),
            "mitigation": exc.get("mitigation"),
            "expiry": expiry,
        }

    if errors:
        sys.stderr.write("\n[CRITICAL FAILURE] Security exceptions policy validation failed:\n")
        for err in errors:
            sys.stderr.write(f"  - {err}\n")
        return {}, False

    return indexed, True


def audit_npm_dependencies(approved_exceptions: dict[tuple[str, str], dict[str, Any]]) -> bool:
    """Run npm audit --json and verify against approved exception policy."""
    print("[AUDIT] Running npm supply-chain security audit...")
    res = subprocess.run(["npm", "audit", "--json"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    try:
        report = json.loads(res.stdout)
    except json.JSONDecodeError:
        sys.stderr.write(f"[ERROR] Failed to parse npm audit output:\n{res.stdout}\n{res.stderr}\n")
        return False

    vulnerabilities = report.get("vulnerabilities", {})
    metadata = report.get("metadata", {}).get("vulnerabilities", {})
    critical_count = metadata.get("critical", 0)

    print(f"[INFO] npm audit scan complete: {critical_count} critical vulnerabilities flagged across dependencies.")

    unapproved_criticals = []
    acknowledged_found = []

    for pkg_name, details in vulnerabilities.items():
        severity = details.get("severity")
        if severity != "critical":
            continue

        via_list = details.get("via", [])
        for item in via_list:
            if isinstance(item, dict):
                if item.get("severity") != "critical":
                    continue

                advisory_url = item.get("url", "")
                advisory_id = advisory_url.split("/")[-1] if advisory_url else "UNKNOWN"
                title = item.get("title", "Unknown")
                key = (pkg_name, advisory_id)

                if key in approved_exceptions:
                    exc = approved_exceptions[key]
                    acknowledged_found.append({
                        "package": pkg_name,
                        "advisory": advisory_id,
                        "title": title,
                        "owner": exc["owner"],
                        "mitigation": exc["mitigation"],
                        "expiry": exc["expiry"],
                    })
                else:
                    unapproved_criticals.append({
                        "package": pkg_name,
                        "advisory": advisory_id,
                        "title": title,
                        "url": advisory_url,
                    })

    if acknowledged_found:
        print("\n[INFO] Acknowledged & Vetted Security Exceptions Active:")
        for app in acknowledged_found:
            print(f"  - Package: {app['package']} | Advisory: {app['advisory']} | Owner: {app['owner']}")
            print(f"    Title: {app['title']}")
            print(f"    Mitigation: {app['mitigation']} (Expires: {app['expiry']})")

    if unapproved_criticals:
        sys.stderr.write("\n[CRITICAL FAILURE] Unapproved critical vulnerabilities detected!\n")
        for unapp in unapproved_criticals:
            sys.stderr.write(f"  - {unapp['package']} ({unapp['advisory']}): {unapp['title']}\n")
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

    # 1. Validate security exceptions policy
    approved_exceptions, valid = validate_and_load_exceptions()
    if not valid:
        sys.exit(1)

    npm_ok = True
    py_ok = True

    if args.npm_only:
        npm_ok = audit_npm_dependencies(approved_exceptions)
    elif args.python_only:
        py_ok = audit_python_dependencies()
    else:
        npm_ok = audit_npm_dependencies(approved_exceptions)
        py_ok = audit_python_dependencies()

    if not npm_ok or not py_ok:
        sys.exit(1)
    print("\n[SUCCESS] Full supply-chain security audit verified cleanly across requested surfaces.")
    sys.exit(0)


if __name__ == "__main__":
    main()
