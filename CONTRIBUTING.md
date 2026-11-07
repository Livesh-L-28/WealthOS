# Contributing to WealthOS

Thank you for contributing to WealthOS. To maintain our high engineering and security standards, all contributions must strictly adhere to the project development guidelines.

## Core Development Guidelines

1. **Architecture Integrity:**
   - Maintain the Modular Monolith architecture.
   - Do not bypass domain boundaries; interact strictly through service interfaces.
   - All financial balance calculations must use `Decimal` (zero IEEE-754 floats).
   - Invariant: $\sum \text{Debit} \equiv \sum \text{Credit}$ for every journal entry.
2. **UI/UX Policy:**
   - **Zero AI-generated frontend code.** Handcraft all layouts, components, and interaction states.
   - Use Tailwind CSS, custom design tokens, and shadcn/ui primitives.
3. **Multi-Tenancy:**
   - Never write a query without scoping by `tenant_id`.
   - Always write multi-tenant isolation unit tests for new endpoints.
4. **Git Workflow:**
   - Feature branches: `feature/<feature-name>`
   - Meaningful commit messages following Conventional Commits format (`feat:`, `fix:`, `docs:`, `test:`).
   - Pass all automated unit, integration, and type checks before submitting a PR.
