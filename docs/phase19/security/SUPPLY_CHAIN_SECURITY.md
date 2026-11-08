# WealthOS Phase 19 — Supply Chain & Dependency Hardening

## 1. Principles
Third-party libraries represent a primary vector for supply chain attacks. WealthOS adopts strict supply-chain controls:

1. **Pinned Dependency Lockfiles**:
   - Python: pinned exact hashes in `pyproject.toml` and uv lockfile.
   - Node / Web: strict `package-lock.json` with npm audit gating.
2. **Automated Vulnerability Scanning**:
   - Continuous scanning of all Python dependencies via `pip-audit` / `safety`.
   - Continuous scanning of JavaScript packages via `npm audit --audit-level=high`.
   - Base image vulnerability scanning for all production Docker containers (Trivy).
3. **Reproducible Builds**:
   - Multi-stage Docker builds separating compiler toolchains and development packages from runtime runtime containers.
   - Non-root user execution (`USER appuser`) inside all production container images.
