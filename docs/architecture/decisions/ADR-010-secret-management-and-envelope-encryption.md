# ADR-010: SECRET MANAGEMENT & ENVELOPE ENCRYPTION

**Status:** ACCEPTED  
**Date:** 2026-11-07  
**Deciders:** Principal Software Architect, Application Security Engineer  
**Context:**  
WealthOS interacts with external financial providers, brokers, and banking integration endpoints requiring client credentials, access tokens, and refresh tokens. Storing these tokens in plaintext in the database creates unacceptable exposure in the event of database backup theft or SQL injection.

**Decision:**  
We implement **Envelope Encryption using AES-256-GCM**:
1. A Key Encryption Key (KEK) is injected into the application environment via secure configuration or cloud KMS (never stored in database or source code).
2. For each encrypted credential, the application generates a cryptographically random 256-bit Data Encryption Key (DEK).
3. The credential is encrypted with the DEK using **AES-256-GCM** (providing authenticated encryption with an initialization vector and a 128-bit authentication tag).
4. The DEK is encrypted using the KEK. Both the encrypted DEK and the ciphertext are stored in the database.
5. In addition, user passwords use Argon2id and TOTP MFA secrets are encrypted using the same envelope architecture.

**Consequences:**  
- **Positive:** A database dump alone does not reveal sensitive integration credentials or user MFA secrets; supports straightforward key rotation policies.
- **Negative:** Minor computational overhead on token read/write operations (negligible for web workloads).
