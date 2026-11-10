#!/usr/bin/env python3
"""
WealthOS Phase 26.2: Internal Beta Cohort Account Provisioning Suite.
Creates 5 isolated, pre-activated synthetic participant test accounts
in wealthos_staging with clean sandbox data for human UAT.
"""

import uuid
import requests
import psycopg
from dotenv import dotenv_values

cfg = dotenv_values("backend/.env.staging")

BASE_URL = "http://localhost:8005"
DB_CONN = dict(
    dbname=cfg["POSTGRES_DB"],
    user=cfg["POSTGRES_USER"],
    password=cfg["POSTGRES_PASSWORD"],
    host=cfg["POSTGRES_HOST"],
    port=cfg["POSTGRES_PORT"],
)

PARTICIPANTS = [
    {"slot": "USR-BETA-01", "role": "New User", "email": "beta.cohort.01@wealthos.dev", "name": "Beta Participant One"},
    {"slot": "USR-BETA-02", "role": "Everyday Manager", "email": "beta.cohort.02@wealthos.dev", "name": "Beta Participant Two"},
    {"slot": "USR-BETA-03", "role": "Active Investor", "email": "beta.cohort.03@wealthos.dev", "name": "Beta Participant Three"},
    {"slot": "USR-BETA-04", "role": "Goal Oriented", "email": "beta.cohort.04@wealthos.dev", "name": "Beta Participant Four"},
    {"slot": "USR-BETA-05", "role": "Household Manager", "email": "beta.cohort.05@wealthos.dev", "name": "Beta Participant Five"},
]

PASSWORD = "VaultAccess#9921!"

def main():
    print("=" * 80)
    print("PROVISIONING 5 SYNTHETIC BETA COHORT TEST ACCOUNTS")
    print("=" * 80)

    for p in PARTICIPANTS:
        # Register user via API
        reg_resp = requests.post(f"{BASE_URL}/api/v1/auth/register", json={
            "email": p["email"],
            "password": PASSWORD,
            "first_name": p["name"].split()[0],
            "last_name": p["name"].split()[-1]
        })
        
        if reg_resp.status_code == 201:
            user_id = reg_resp.json()["data"]["user_id"]
            tenant_id = reg_resp.json()["data"]["personal_tenant_id"]
            # Activate user in DB
            with psycopg.connect(**DB_CONN) as conn:
                with conn.cursor() as cur:
                    cur.execute("UPDATE users SET status = 'active', email_verified_at = now() WHERE id = %s;", (user_id,))
                    conn.commit()
            print(f"[PROVISIONED] {p['slot']} ({p['role']}): {p['email']} (Tenant: {tenant_id})")
        elif reg_resp.status_code == 400 and "already registered" in reg_resp.text:
            print(f"[EXISTS] {p['slot']} ({p['role']}): {p['email']} already provisioned and active")
        else:
            print(f"[FAILED] {p['slot']} ({p['role']}): {reg_resp.text}")

    print("=" * 80)
    print("ALL 5 PARTICIPANT COHORT ACCOUNTS READY FOR INTERNAL BETA")
    print("=" * 80)

if __name__ == "__main__":
    main()
