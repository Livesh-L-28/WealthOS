# WealthOS Phase 27 — Infrastructure Cost & Sizing Analysis (India Region)

**Phase ID:** `WEALTHOS-PHASE-27`  
**Execution Timestamp:** 2026-11-10T12:06:00+05:30  
**Currency:** Indian Rupee (INR ₹)  
**Assumed Exchange Rate:** 1 USD = ₹84.50 (Nov 2026 Benchmark)  
**Primary Region:** AWS Mumbai (`ap-south-1`) / GCP Mumbai (`asia-south1`)

---

## 1. Executive Summary

To comply with the **Digital Personal Data Protection Act (DPDPA), 2023** and **RBI Account Aggregator Data Localization Directives**, all WealthOS production computing, relational storage, and backup infrastructure must reside within the territory of the Republic of India.

This document evaluates three infrastructure deployment tiers designed to balance fiscal prudence with strict high-availability, encryption, and performance SLAs.

---

## 2. Infrastructure Deployment Tiers

### Tier 1: Minimum Viable Production (Early Beta: Up to 1,000 Active Users)
- **Target:** Controlled rollout, internal team, and first 1,000 beta users.
- **Topology:** Single-region container host (ECS / DigitalOcean Bangalore Droplets) + Managed PostgreSQL.

| Resource Component | Specifications | Provider & Region | Monthly Cost (USD) | Monthly Cost (INR ₹) |
| :--- | :--- | :--- | :--- | :--- |
| **API & Web Compute** | 2x Shared Compute (2 vCPU, 4GB RAM) | DigitalOcean Bangalore / AWS Lightsail | $48.00 | ₹4,056 |
| **Managed PostgreSQL** | Managed DB (2 vCPU, 4GB RAM, 50GB NVMe) | DigitalOcean / AWS RDS db.t4g.medium | $60.00 | ₹5,070 |
| **Redis Cache** | Managed Redis (1GB RAM, High Availability) | DigitalOcean / AWS ElastiCache | $15.00 | ₹1,268 |
| **Encrypted S3 Storage**| 100GB S3 Standard + Backup Vault | AWS Mumbai (`ap-south-1`) | $3.50 | ₹296 |
| **Domain & Edge TLS** | Cloudflare Pro Plan (WAF, DDoS, Edge SSL) | Cloudflare Edge | $20.00 | ₹1,690 |
| **Centralized Logging** | Axiom / BetterStack Log Ingestion (50GB) | Managed SaaS | $25.00 | ₹2,112 |
| **TOTAL (Tier 1 MVP)** | | | **$171.50** | **₹14,492 / month** |

---

### Tier 2: Recommended Production (Scale: 1,000 to 25,000 Active Users)
- **Target:** General public launch, full regulatory compliance, SOC2/RBI audit readiness.
- **Topology:** Multi-AZ Amazon ECS Fargate + RDS PostgreSQL Multi-AZ with Read Replica + AWS KMS.

| Resource Component | Specifications | Provider & Region | Monthly Cost (USD) | Monthly Cost (INR ₹) |
| :--- | :--- | :--- | :--- | :--- |
| **Backend API (Fargate)**| 2x Fargate tasks (1 vCPU, 2GB RAM, Multi-AZ) | AWS Mumbai (`ap-south-1`) | $62.00 | ₹5,239 |
| **Web Frontend (Fargate)**| 2x Fargate tasks (1 vCPU, 2GB RAM, Multi-AZ) | AWS Mumbai (`ap-south-1`) | $62.00 | ₹5,239 |
| **Celery Workers (Fargate)**| 2x Document OCR / Task workers | AWS Mumbai (`ap-south-1`) | $62.00 | ₹5,239 |
| **RDS PostgreSQL Primary**| `db.m6g.large` (2 vCPU, 8GB RAM, Multi-AZ, 100GB GP3) | AWS Mumbai (`ap-south-1`) | $215.00 | ₹18,168 |
| **RDS PostgreSQL Replica**| `db.m6g.large` (Read replica for analytics) | AWS Mumbai (`ap-south-1`) | $110.00 | ₹9,295 |
| **AWS ElastiCache Redis** | `cache.m6g.large` (Cluster Mode, Multi-AZ) | AWS Mumbai (`ap-south-1`) | $98.00 | ₹8,281 |
| **AWS KMS & Secrets** | Master encryption keys & automated rotation | AWS Mumbai (`ap-south-1`) | $12.00 | ₹1,014 |
| **S3 Vault & Backups** | 500GB S3 Standard + Glacier Object Lock | AWS Mumbai (`ap-south-1`) | $16.50 | ₹1,394 |
| **Application Load Balancer**| AWS ALB with AWS WAF rules | AWS Mumbai (`ap-south-1`) | $45.00 | ₹3,803 |
| **Observability (Datadog)**| APM, Logs & Infrastructure Monitoring | Datadog SaaS | $120.00 | ₹10,140 |
| **TOTAL (Tier 2 Recommended)**| | | **$802.50** | **₹67,812 / month** |

---

### Tier 3: Growth Architecture (High Concurrency: 25,000 to 100,000+ Active Users)
- **Target:** Nationwide enterprise scale, high-frequency portfolio sync, real-time analytics.
- **Topology:** Elastic Kubernetes Service (EKS) across 3 AZs + Aurora PostgreSQL Serverless v2 + Dedicated Vector DB nodes.

| Resource Component | Specifications | Provider & Region | Monthly Cost (USD) | Monthly Cost (INR ₹) |
| :--- | :--- | :--- | :--- | :--- |
| **EKS Kubernetes Cluster**| 6x `c6g.xlarge` nodes (Worker node group) | AWS Mumbai (`ap-south-1`) | $590.00 | ₹49,855 |
| **Amazon Aurora PostgreSQL**| Multi-AZ Serverless v2 (0.5 to 16 ACUs) + Read Replica | AWS Mumbai (`ap-south-1`) | $650.00 | ₹54,925 |
| **ElastiCache Redis Cluster**| 3-node distributed Redis cluster | AWS Mumbai (`ap-south-1`) | $240.00 | ₹20,280 |
| **S3 Vault & Media CDN** | 2TB S3 + CloudFront India Edge Caching | AWS Mumbai & Indian PoPs | $65.00 | ₹5,492 |
| **Security & Compliance** | CloudHSM / AWS KMS, AWS GuardDuty, SecurityHub | AWS Mumbai (`ap-south-1`) | $180.00 | ₹15,210 |
| **Enterprise APM & SRE** | Datadog Enterprise with PagerDuty Integration | Managed SaaS | $350.00 | ₹29,575 |
| **TOTAL (Tier 3 Growth)**| | | **$2,075.00** | **₹1,75,337 / month** |

---

## 3. Cost Optimization Recommendations

1. **Savings Plans & Reserved Instances:** Committing to a 1-year or 3-year Compute Savings Plan reduces EC2/Fargate costs by 32% to 54%.
2. **PostgreSQL Read-Replica Offloading:** Routing analytical dashboard and export queries to the read replica reduces CPU pressure on the write-master by up to 60%, avoiding premature vertical scaling.
3. **S3 Intelligent Tiering:** Automatically transitioning financial PDF documents older than 90 days to Glacier Flexible Retrieval cuts storage costs by 75%.
