# WealthOS — Long-Term Capacity Planning & Cost Optimization Model

**Programme:** WealthOS Enterprise Architecture & Production Readiness  
**Document:** Capacity Planning Model  
**Date:** 2026-11-08  
**Status:** Approved Engineering Forecast  
**Author:** Principal Cloud Architect & SRE Lead  

---

## 1. Multi-Tier Scaling Projections

WealthOS capacity planning projects compute, storage, and networking requirements across three user growth milestones:

| Resource Dimension | 10,000 Users (Current Baseline) | 100,000 Users (Target Phase 1) | 1,000,000 Users (Enterprise Scale) |
|---|---|---|---|
| **Daily Transactions** | 25,000 | 250,000 | 2,500,000 |
| **API Compute Instances**| 2 instances (2 vCPU / 4GB) | 4 instances (4 vCPU / 8GB) | 12 instances (8 vCPU / 16GB) |
| **Worker Instances** | 3 containers (2 vCPU / 4GB) | 6 containers (4 vCPU / 8GB) | 16 containers (4 vCPU / 8GB) |
| **PostgreSQL Primary** | 4 vCPU / 16GB RAM | 8 vCPU / 32GB RAM | 16 vCPU / 64GB RAM |
| **PostgreSQL Read Replicas**| 1 Replica (4 vCPU / 16GB) | 2 Replicas (8 vCPU / 32GB) | 3 Replicas (16 vCPU / 64GB) |
| **DB Storage (Annual)** | 40 GB NVMe | 350 GB NVMe | 3.2 TB NVMe |
| **MinIO Document Storage**| 250 GB | 2.5 TB | 25 TB |
| **Redis RAM Capacity** | 2 GB | 8 GB | 32 GB |
| **Monthly Cloud Cost (Est.)**| ~$350 / month | ~$1,400 / month | ~$6,500 / month |

---

## 2. Cost Control & Resource Optimization Strategies

1. **Transaction Mode Connection Pooling:**
   - PgBouncer eliminates the need to over-provision PostgreSQL RAM for idle connections, saving up to 60% on database compute instance costs.
2. **Object Storage Lifecycle Policies:**
   - Bank statement PDFs and quarantine uploads are transitioned from S3 Standard to S3 Infrequent Access (IA) after 30 days, and archived to Glacier after 365 days, reducing storage costs by over 70%.
3. **Automated Autovacuum Tuning:**
   - Aggressive vacuum scale factors prevent table bloat, ensuring high index cache locality and avoiding premature NVMe block storage expansions.

