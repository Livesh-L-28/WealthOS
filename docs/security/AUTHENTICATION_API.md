# WealthOS Authentication & Multi-Tenant Security REST API Specification

## 1. Design & Protocol Conventions

- **Base URL:** `/api/v1`
- **Transport:** HTTPS / TLS 1.3
- **Data Exchange:** `application/json`
- **Standard Envelopes:**
  - **Success:** `{ "success": true, "data": { ... }, "correlation_id": "<uuid>" }`
  - **Error:** `{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human readable message", "details": [ ... ] }, "correlation_id": "<uuid>" }`
- **Authentication Headers:**
  - `Authorization: Bearer <access_jwt>`
  - `X-Tenant-ID: <uuid>` (Optional contextual hint; verified by server)

---

## 2. API Endpoints Catalog

### 2.1 Identity & Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required | Rate Limited |
| :--- | :--- | :--- | :---: | :---: |
| `POST` | `/auth/register` | Register new user account & provision personal tenant | No | Yes (5/min) |
| `POST` | `/auth/login` | Authenticate user with email + password; triggers MFA if enabled | No | Yes (5/min) |
| `POST` | `/auth/refresh` | Rotate refresh token; issue new Access JWT + Refresh Token | No (Cookie/RT) | Yes (30/min) |
| `POST` | `/auth/logout` | Revoke current refresh token and terminate active session | Yes | No |
| `POST` | `/auth/logout-all` | Revoke all sessions and refresh tokens for user | Yes | Yes (5/min) |
| `GET` | `/auth/me` | Retrieve authenticated user profile, active tenant & permissions | Yes | No |
| `POST` | `/auth/verify-email` | Verify email address using one-time token | No | Yes (10/min) |
| `POST` | `/auth/resend-verification` | Resend email verification link | Yes | Yes (3/min) |
| `POST` | `/auth/forgot-password` | Request password reset token via email (generic response) | No | Yes (3/min) |
| `POST` | `/auth/reset-password` | Reset password using one-time token | No | Yes (5/min) |
| `POST` | `/auth/change-password` | Change password for authenticated user (requires current pwd) | Yes | Yes (5/min) |
| `GET` | `/auth/sessions` | List active sessions for user with IP, device, and last active | Yes | No |
| `DELETE`| `/auth/sessions/{id}` | Terminate specific remote session | Yes | No |

### 2.2 Multi-Factor Authentication (`/api/v1/auth/mfa`)

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `POST` | `/auth/mfa/enroll` | Initialize TOTP setup; returns provisioning URI & recovery codes | Yes |
| `POST` | `/auth/mfa/verify-enrollment`| Confirm first TOTP code; officially activates MFA for account | Yes |
| `POST` | `/auth/mfa/challenge` | Complete MFA challenge during login using TOTP code or backup code | Temp Token |
| `POST` | `/auth/mfa/disable` | Deactivate MFA (requires current password + valid TOTP code) | Yes |
| `POST` | `/auth/mfa/recovery-codes` | Regenerate backup recovery codes (requires step-up auth) | Yes |

### 2.3 Tenant Management (`/api/v1/tenants`)

| Method | Endpoint | Description | Permission Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/tenants` | List all workspaces where user holds active membership | Authenticated |
| `POST` | `/tenants` | Create a new workspace (Household or Organization) | Authenticated |
| `GET` | `/tenants/{id}` | Get workspace metadata, role, and capabilities | `tenant:read` |
| `PUT` | `/tenants/{id}` | Update workspace name or preferences | `tenant:update` |
| `POST` | `/tenants/{id}/switch` | Switch active workspace context; returns updated Access JWT | Member of `{id}` |
| `GET` | `/tenants/{id}/members` | List members and their assigned roles | `members:read` |
| `POST` | `/tenants/{id}/invitations`| Invite a new member by email with specified role | `members:invite` |
| `GET` | `/tenants/{id}/invitations`| List pending invitations for tenant | `members:read` |
| `DELETE`| `/tenants/{id}/invitations/{inv_id}` | Cancel / revoke pending invitation | `members:manage` |
| `POST` | `/tenants/invitations/accept` | Accept workspace invitation using token | Authenticated |
| `PUT` | `/tenants/{id}/members/{mem_id}` | Update member role or status (active/suspended) | `members:manage` |
| `DELETE`| `/tenants/{id}/members/{mem_id}` | Remove member from workspace | `members:manage` |
| `POST` | `/tenants/{id}/transfer-ownership` | Transfer workspace ownership (Step-up auth) | `tenant:transfer` |
| `GET` | `/tenants/{id}/roles` | List all system and custom roles with permissions | `roles:read` |
| `GET` | `/tenants/{id}/audit-logs` | Query security audit log records with filters | `audit:read` |

---

## 3. Standard Request & Response Schemas

### 3.1 Register Request (`POST /api/v1/auth/register`)
```json
{
  "email": "user@example.com",
  "password": "CorrectHorseBatteryStaple123!",
  "first_name": "Livesh",
  "last_name": "L"
}
```
**Response (HTTP 201 Created):**
```json
{
  "success": true,
  "data": {
    "user_id": "8a09f3e8-8b9a-4e2a-89a1-6a2c3d4e5f60",
    "email": "user@example.com",
    "status": "pending_verification",
    "personal_tenant_id": "9b10a4f9-9c0b-5f3b-90b2-7b3d4e5f6071",
    "message": "Registration successful. Please verify your email."
  },
  "correlation_id": "c1f7a2d3-1234-5678-9abc-def012345678"
}
```

### 3.2 Login Request (`POST /api/v1/auth/login`)
```json
{
  "email": "user@example.com",
  "password": "CorrectHorseBatteryStaple123!"
}
```
**Response (Standard Login - HTTP 200 OK):**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "a4b8c9d0e1f2...",
    "token_type": "Bearer",
    "expires_in": 900,
    "user": {
      "id": "8a09f3e8-8b9a-4e2a-89a1-6a2c3d4e5f60",
      "email": "user@example.com",
      "name": "Livesh L",
      "mfa_enabled": false
    },
    "active_tenant": {
      "id": "9b10a4f9-9c0b-5f3b-90b2-7b3d4e5f6071",
      "name": "Personal Workspace",
      "role": "owner"
    }
  },
  "correlation_id": "c1f7a2d3-1234-5678-9abc-def012345678"
}
```

**Response (MFA Challenge Required - HTTP 200 OK):**
```json
{
  "success": true,
  "data": {
    "mfa_required": true,
    "mfa_token": "temp_mfa_challenge_token_string...",
    "mfa_type": "totp"
  },
  "correlation_id": "c1f7a2d3-1234-5678-9abc-def012345678"
}
```
