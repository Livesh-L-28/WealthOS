"""Regression tests for Gate 1 Release Remediation Fixes.

Covers:
- scripts/restore_database.sh fail-closed exit-code enforcement and safeguards.
- scripts/audit_dependencies.py policy verification (schema validation, expiration rejection, duplicate rejection).
"""

import json
import os
import subprocess
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RESTORE_SCRIPT = REPO_ROOT / "scripts/restore_database.sh"
AUDIT_SCRIPT = REPO_ROOT / "scripts/audit_dependencies.py"


def test_restore_script_rejects_missing_target():
    """Verify restore_database.sh fails closed when no target database is specified."""
    res = subprocess.run(
        ["bash", str(RESTORE_SCRIPT), "/nonexistent/path.dump.enc"],
        capture_output=True,
        text=True,
    )
    assert res.returncode != 0
    assert (
        "Backup file not found" in res.stderr
        or "Target database must be explicitly specified" in res.stderr
    )


def test_restore_script_rejects_system_catalog_target(tmp_path):
    """Verify restore_database.sh blocks overwriting system catalog databases like 'postgres'."""
    fake_enc = tmp_path / "test.dump.enc"
    fake_enc.write_bytes(b"dummy")
    fake_json = tmp_path / "test.json"
    fake_json.write_text('{"sha256": "dummy"}', encoding="utf-8")

    env = os.environ.copy()
    env["WEALTHOS_BACKUP_ENCRYPTION_KEY"] = "dummy_key_12345678901234567890"
    env["CONFIRM_RESTORE"] = "true"

    res = subprocess.run(
        ["bash", str(RESTORE_SCRIPT), str(fake_enc), "postgres"],
        capture_output=True,
        text=True,
        env=env,
    )
    assert res.returncode != 0
    assert "is a system catalog and cannot be overwritten" in res.stderr


def test_restore_script_requires_explicit_confirmation(tmp_path):
    """Verify restore_database.sh rejects restore without CONFIRM_RESTORE=true."""
    fake_enc = tmp_path / "test.dump.enc"
    fake_enc.write_bytes(b"dummy")
    fake_json = tmp_path / "test.json"
    fake_json.write_text('{"sha256": "dummy"}', encoding="utf-8")

    env = os.environ.copy()
    env["CONFIRM_RESTORE"] = "false"

    res = subprocess.run(
        ["bash", str(RESTORE_SCRIPT), str(fake_enc), "wealthos_disposable_test"],
        capture_output=True,
        text=True,
        env=env,
    )
    assert res.returncode != 0
    assert "Destructive restore confirmation not set" in res.stderr


def test_audit_dependencies_passes_on_current_repo():
    """Verify scripts/audit_dependencies.py passes cleanly with vetted exceptions."""
    res = subprocess.run(
        ["python3", str(AUDIT_SCRIPT), "--npm-only"],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
    )
    assert res.returncode == 0
    assert "npm supply chain audit passed: Zero unapproved critical vulnerabilities" in res.stdout


def test_audit_dependencies_rejects_expired_exception(tmp_path):
    """Verify scripts/audit_dependencies.py fails closed when an exception has expired."""
    test_exceptions = tmp_path / "expired_exceptions.json"
    test_exceptions.write_text(
        json.dumps(
            {
                "exceptions": [
                    {
                        "package": "vitest",
                        "advisory": "GHSA-5xrq-8626-4rwp",
                        "severity": "critical",
                        "owner": "QA Lead",
                        "justification": "Test justification",
                        "mitigation": "Test mitigation",
                        "expiry": "2020-01-01",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    import importlib.util

    spec = importlib.util.spec_from_file_location("audit_deps", str(AUDIT_SCRIPT))
    assert spec is not None and spec.loader is not None
    audit_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit_mod)

    _, valid = audit_mod.validate_and_load_exceptions(test_exceptions)
    assert valid is False


def test_audit_dependencies_rejects_malformed_exception(tmp_path):
    """Verify scripts/audit_dependencies.py fails closed when required fields are missing."""
    test_exceptions = tmp_path / "malformed_exceptions.json"
    test_exceptions.write_text(
        json.dumps(
            {
                "exceptions": [
                    {
                        "package": "vitest",
                        "severity": "critical",
                        # Missing advisory, owner, justification, mitigation, expiry
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    import importlib.util

    spec = importlib.util.spec_from_file_location("audit_deps", str(AUDIT_SCRIPT))
    assert spec is not None and spec.loader is not None
    audit_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit_mod)

    _, valid = audit_mod.validate_and_load_exceptions(test_exceptions)
    assert valid is False


def test_audit_dependencies_rejects_duplicate_exception(tmp_path):
    """Verify scripts/audit_dependencies.py fails closed when duplicate exceptions exist."""
    test_exceptions = tmp_path / "duplicate_exceptions.json"
    entry = {
        "package": "vitest",
        "advisory": "GHSA-5xrq-8626-4rwp",
        "severity": "critical",
        "owner": "QA Lead",
        "justification": "Test justification",
        "mitigation": "Test mitigation",
        "expiry": "2026-12-31",
    }
    test_exceptions.write_text(
        json.dumps({"exceptions": [entry, entry]}),
        encoding="utf-8",
    )

    import importlib.util

    spec = importlib.util.spec_from_file_location("audit_deps", str(AUDIT_SCRIPT))
    assert spec is not None and spec.loader is not None
    audit_mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(audit_mod)

    _, valid = audit_mod.validate_and_load_exceptions(test_exceptions)
    assert valid is False
