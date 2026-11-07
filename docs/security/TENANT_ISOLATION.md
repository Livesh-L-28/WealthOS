# WealthOS Multi-Tenant Isolation Architecture

## 1. Multi-Tenancy Strategy

WealthOS uses a **Pooled Architecture with Row-Level Discriminator Columns and Contextual Session Scoping**. All tenants share the same PostgreSQL database schema, while strict logical isolation is guaranteed through multiple layers of enforcement.

```
+----------------------------------------------------------------------------------------------------+
|                                  MULTI-TIER TENANT ISOLATION                                      |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|  [Tier 1: Ingress / Gateway Dependency Gate]                                                       |
|    - Authenticates User                                                                            |
|    - Resolves requested Tenant ID from token claim or X-Tenant-ID header                           |
|    - Validates User's active membership in tenant_memberships WHERE status = 'active'              |
|    - REJECTS WITH 403 FORBIDDEN if user is not an active member                                    |
|                                                                                                    |
|  [Tier 2: Application Context Layer]                                                               |
|    - Sets current_tenant_id in Python ContextVar for current request lifecycle                     |
|    - Available across all domain services and repositories                                         |
|                                                                                                    |
|  [Tier 3: Repository / ORM Query Scoping]                                                          |
|    - All repository base classes automatically append WHERE tenant_id = :current_tenant_id         |
|    - Write operations automatically populate entity.tenant_id = :current_tenant_id                 |
|                                                                                                    |
|  [Tier 4: PostgreSQL Session Setting & Connection Sanitization]                                   |
|    - On acquiring connection: SET LOCAL app.current_tenant_id = '<uuid>'                           |
|    - Connection Pool Listener: Resets session on checkin (DISCARD ALL / RESET ALL)                 |
|    - Guarantees pooled connection reuse NEVER leaks previous tenant context                        |
|                                                                                                    |
|  [Tier 5: Distributed Workers, Caches & Object Storage]                                           |
|    - Celery Tasks: Payload must contain signed, verified tenant_id                                 |
|    - Redis Caching: All keys prefixed with tenant:{tenant_id}:...                                  |
|    - MinIO Storage: Object paths strictly namespaced tenants/{tenant_id}/...                       |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+
```

---

## 2. Invariant Rules of Tenant Isolation

1. **Client Disregard Rule:**
   $$\text{Access Granted} \iff \exists m \in \text{tenant\_memberships} : m.\text{user\_id} = \text{auth\_user\_id} \land m.\text{tenant\_id} = \text{target\_tenant\_id} \land m.\text{status} = \text{'active'}$$
   A client-provided `X-Tenant-ID` header is **never** accepted on faith. It is validated against the user's persisted memberships. If the header is absent, the user's primary/default personal tenant is used.

2. **Connection Pooling Leakage Prevention:**
   When using asynchronous database connection pooling (e.g. asyncpg + SQLAlchemy), PostgreSQL connection state can persist across queries unless properly scoped:
   - All tenant context variables are set using `SET LOCAL`, scoping them strictly to the current active transaction.
   - When a connection is released back into the connection pool, SQLAlchemy's `reset_on_return` or an explicit pool event listener executes `RESET ALL` to ensure a completely sterile state for the next request.

3. **Background Worker Context Injection:**
   Celery workers execute asynchronously outside the HTTP request lifecycle. A worker must never inherit an unverified tenant ID from a client:
   - The API task dispatcher verifies the active tenant and binds `tenant_id` into the signed task payload.
   - The worker initializes its transactional repository context with the verified `tenant_id` from the task argument before touching the database or storage.

4. **Redis Cache Key Partitioning:**
   Cross-tenant cache contamination is strictly prevented by requiring all Redis cache keys to adhere to:
   ```
   tenant:{tenant_id}:{subsystem}:{resource_type}:{resource_id}
   ```
   Example: `tenant:7d8a9b...:market:quote:INFY` or `tenant:7d8a9b...:auth:ratelimit:login`

5. **Object Storage Namespace Partitioning:**
   All files uploaded to MinIO/S3 reside in tenant-isolated paths:
   ```
   tenants/{tenant_id}/{bucket_name}/{year}/{month}/{unique_file_id}_{filename}
   ```
   Any presigned upload or download URL restricts the S3 key prefix to the user's active `tenant_id`.

---

## 3. Mandatory Tenant Isolation Test Matrix

To pass the release gate, automated integration tests must prove that Tenant A cannot access or infer Tenant B's data under the following test conditions:

| Scenario | Test Action | Expected Result |
| :--- | :--- | :--- |
| **Direct REST IDOR** | Tenant A attempts `GET /api/v1/tenants/{tenant_B_id}` | HTTP 403 Forbidden |
| **Spoofed Tenant Header** | Tenant A passes `X-Tenant-ID: {tenant_B_id}` to any resource API | HTTP 403 Forbidden |
| **Cross-Tenant Repository Read** | Repository query for resource owned by Tenant B using Tenant A context | Returns `None` or raises `EntityNotFoundError` |
| **Cross-Tenant Resource Update** | Tenant A attempts `PUT /api/v1/.../{resource_B_id}` | HTTP 404 Not Found (zero information disclosure) |
| **Cross-Tenant Resource Delete** | Tenant A attempts `DELETE /api/v1/.../{resource_B_id}` | HTTP 404 Not Found |
| **Revoked Member Access** | Revoke Tenant A member membership; member attempts request | HTTP 403 Forbidden |
| **Suspended Tenant Access** | Set Tenant status to `suspended`; user attempts request | HTTP 403 Forbidden (`Tenant suspended`) |
| **Cache Isolation** | Tenant A writes to cache key; Tenant B queries cache | Tenant B cache miss; no data leak |
| **Storage Isolation** | Tenant A generates presigned URL for Tenant B object path | Validation rejection (`InvalidObjectKeyError`) |
