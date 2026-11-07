# WealthOS Role-Based Access Control (RBAC) Specification

## 1. Authorization Philosophy

WealthOS implements an enterprise-grade **Role-Based Access Control (RBAC) with Granular Permission Tokens**.
- **Deny-by-Default:** Every protected endpoint requires specific permissions. If no matching permission is granted to the user's role in the active tenant, access is denied (HTTP 403 Forbidden).
- **Backend Authority:** Frontend role and permission indicators are purely advisory for user experience. The backend authoritatively enforces permissions on every request.
- **Tenant Contextual Roles:** A user's role is scoped strictly to a specific tenant membership. A user may be an `owner` in their personal tenant, an `admin` in their household tenant, and a `viewer` in an organization tenant.

---

## 2. Built-in Roles & Hierarchy

```
+----------------------------------------------------------------------------------------------------+
|                                    ROLE HIERARCHY & CAPABILITIES                                   |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    [OWNER]                                                                                         |
|      - Immutable workspace creator or transferred owner                                            |
|      - Full control over tenant lifecycle (delete workspace, transfer ownership)                  |
|      - Manage billing, subscriptions, and top-level settings                                        |
|         |                                                                                          |
|         v (inherits all permissions of)                                                            |
|    [ADMIN]                                                                                         |
|      - Invite, edit, suspend, and remove members                                                   |
|      - Create and assign custom roles and permissions                                              |
|      - Configure workspace security and integration parameters                                      |
|         |                                                                                          |
|         v (inherits all permissions of)                                                            |
|    [MEMBER]                                                                                        |
|      - Standard collaborative financial user                                                       |
|      - Create, edit, and view financial accounts, transactions, and documents                      |
|      - Execute reconciliations and generate analytics                                              |
|         |                                                                                          |
|         v (inherits all permissions of)                                                            |
|    [VIEWER]                                                                                        |
|      - Read-only observer (accountant, auditor, family dependent)                                  |
|      - View reports, transaction history, audit trail, and portfolio summaries                     |
|      - Zero write, modification, or configuration privileges                                       |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Granular Permission Registry

Permissions follow the standard `<domain>:<action>` format:

| Permission Token | Description | Assigned Built-in Roles |
| :--- | :--- | :--- |
| **`tenant:read`** | View workspace metadata, plan, and member count | Owner, Admin, Member, Viewer |
| **`tenant:update`** | Update workspace display name and preferences | Owner, Admin |
| **`tenant:delete`** | Permanently archive or delete the workspace | Owner |
| **`tenant:transfer`** | Initiate or complete ownership transfer | Owner |
| **`members:read`** | List members and pending invitations | Owner, Admin, Member, Viewer |
| **`members:invite`** | Dispatch membership invitations to email addresses | Owner, Admin |
| **`members:manage`** | Change member roles, suspend or remove memberships | Owner, Admin |
| **`roles:read`** | List workspace roles and associated permissions | Owner, Admin, Member, Viewer |
| **`roles:manage`** | Create, update, or delete custom roles | Owner, Admin |
| **`security:read`** | View workspace security posture and MFA enforcement | Owner, Admin |
| **`security:manage`** | Enforce tenant-wide MFA, session limits, or IP allowlists| Owner, Admin |
| **`audit:read`** | Search, filter, and inspect security audit logs | Owner, Admin, Viewer |
| **`audit:export`** | Export security and forensic audit records to CSV/JSON | Owner, Admin |

*(Note: Financial domain permissions such as `accounts:*`, `transactions:*`, `investments:*`, `documents:*` will be registered in subsequent phases, adhering to the same RBAC architecture).*

---

## 4. FastAPI Dependency & Authorization Implementation

Endpoint protection is implemented using composable FastAPI dependencies:

```python
# 1. Require Authenticated Active User
@router.get("/me")
async def get_current_user_profile(
    user: User = Depends(get_current_active_user)
): ...

# 2. Require Membership in Target Tenant
@router.get("/tenants/{tenant_id}/members")
async def list_tenant_members(
    tenant_id: UUID,
    membership: TenantMembership = Depends(get_current_tenant_membership)
): ...

# 3. Require Specific Granular Permission
@router.post("/tenants/{tenant_id}/invitations")
async def invite_member(
    tenant_id: UUID,
    payload: InviteMemberRequest,
    auth: AuthContext = Depends(require_permission("members:invite"))
): ...

# 4. Require High-Level Role
@router.post("/tenants/{tenant_id}/transfer-ownership")
async def transfer_ownership(
    tenant_id: UUID,
    payload: TransferOwnershipRequest,
    auth: AuthContext = Depends(require_role("owner"))
): ...
```

### Deny-by-Default Policy Execution:
1. `require_permission(perm)` extracts the authenticated user and resolved tenant.
2. It queries the user's role permissions within that tenant.
3. If `perm` is absent: Immediately raises `HTTPException(status_code=403, detail="Permission denied")`.
4. Emits a security audit log for authorization denial to detect probing or privilege escalation attempts.
