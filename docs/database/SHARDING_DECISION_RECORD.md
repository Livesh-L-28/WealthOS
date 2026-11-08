# WealthOS — Database Sharding Architectural Decision & Feasibility Record

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Sharding Decision Record  
**Date:** 2026-11-08  
**Status:** Architecture Decision: **SHARDING REJECTED**  
**Author:** Principal Software Architect & Database Architect  

---

## 1. Executive Decision Summary

WealthOS **explicitly rejects the introduction of application-level or database-level sharding** for the current and medium-term production horizon. The platform will rely on vertical primary scaling, asynchronous read replicas, and PgBouncer connection pooling.

---

## 2. Technical Evaluation: The Cost of Sharding in Fintech

Sharding partitions a database horizontally across multiple independent database instances based on a shard key (e.g. `tenant_id` or `user_id`). While sharding offers theoretical infinite horizontal write scaling, in a financial intelligence operating system it introduces catastrophic engineering and integrity liabilities:

### 2.1 Destruction of Double-Entry Ledger Invariance
- In WealthOS, every financial movement is a balanced journal entry:
  $$\sum \text{Debit} - \sum \text{Credit} = 0.0000$$
- In Household accounts and multi-member organizational structures, users transfer funds between accounts belonging to different household members.
- If Member A resides on Shard 1 and Member B resides on Shard 2, an internal transfer requires a **Distributed Transaction across Shards**.
- Distributed transactions require Two-Phase Commit (2PC) or Saga orchestrators. Under network partitions, 2PC blocks transactions indefinitely; Sagas require eventual consistency with compensating transactions, exposing the ledger to transient unbalanced states, negative balances, and double-spend exploits.

### 2.2 Inability to Enforce Relational Integrity & Unique Constraints
- PostgreSQL foreign keys cannot span physical databases.
- Relational integrity between users, accounts, journal entries, and transactions would have to be moved into application code, removing kernel-level consistency guarantees.

### 2.3 Reporting & Analytical Aggregation Bottlenecks
- Generating a Household consolidated balance sheet, cross-organization tax summary, or universal audit report requires scatter-gather queries across every shard, increasing P99 latency and network overhead.

### 2.4 Resharding & Data Rebalancing Complexity
- As tenants grow at uneven rates, shards become unbalanced (hot shards). Resharding requires migrating live financial ledgers between physical database instances without downtime or transaction loss—an extraordinarily complex operational undertaking.

---

## 3. Proven Capacity Ceiling of the Non-Sharded Architecture

A single modern PostgreSQL 16 primary instance with NVMe storage and tuned memory configuration provides the following verified headroom:

| Resource Dimension | Modern PostgreSQL Primary Capacity | WealthOS Projected Demand (100k Active Users) | Headroom Factor |
|---|---|---|---|
| **Write Throughput** | 10,000 – 25,000 transactions/sec | 50 – 150 transactions/sec | **> 100x** |
| **Read Throughput** | Scalable to 100,000+ QPS via Read Replicas | 500 – 2,000 QPS | **> 50x** |
| **Row Capacity** | Billions of rows with B-Tree indexes | 20 – 50 million rows annually | **Comfortable** |
| **Storage Capacity** | Up to 64 TB on standard cloud block storage | < 250 GB compressed | **> 200x** |

---

## 4. Re-evaluation Triggers

Sharding will only be re-evaluated if all of the following conditions are met:
1. Active registered user base exceeds **5,000,000 users**.
2. Sustained write transactions exceed **10,000 writes/sec** on the largest available cloud instance class (e.g. 128 vCPUs, 512 GB RAM).
3. Regulatory data sovereignty laws mandate physical storage of data in separate sovereign jurisdictions (e.g. Reserve Bank of India vs European Union GDPR physical residency mandates).
