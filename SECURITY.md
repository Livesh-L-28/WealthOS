# Security Policy — WealthOS

## Security Standards & Reporting

WealthOS is designed to manage sensitive personal financial assets, banking records, and identity documentation. We maintain the highest standards of application security, data confidentiality, and system integrity.

### Reporting a Vulnerability

If you discover a security vulnerability within WealthOS, **do not open a public GitHub issue.** Instead, report it immediately to our security engineering team:

- **Email:** `security@wealthos.internal` / `liveshjaidj@gmail.com`
- **Response SLA:** Within 24 hours of receipt.
- **PGP Encryption:** Available upon request.

### Security Principles Enforced
1. **Zero-Trust Multi-Tenancy:** Strict row-level data partitioning (`tenant_id`) enforced across all database queries.
2. **Immutable Double-Entry Ledger:** Balance invariants enforced with DB constraints; zero historical ledger modification.
3. **Argon2id & TOTP MFA:** Memory-hard cryptographic hashing and time-step verification for all credentials.
4. **Envelope Encryption:** AES-256-GCM envelope encryption for all third-party integration tokens.
5. **Private Pre-Signed URLs:** Ephemeral 300-second download links for documents in private S3 storage.
