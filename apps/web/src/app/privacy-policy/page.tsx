import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | WealthOS",
  description: "Official Privacy Policy and Data Governance Statement for WealthOS",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-12">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to WealthOS
        </Link>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Privacy Policy</h1>
            <p className="text-sm text-slate-500">Effective Date: November 8, 2026 | Version 2.0</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-blue-600 inline" />
              1. Our Core Privacy Commitment
            </h2>
            <p>
              WealthOS is engineered with a strict <strong>Security-First, Zero-Trust</strong> philosophy. 
              We do not sell, rent, monetize, or broker your personal financial records or transaction data to third-party advertisers.
              All data ingested into WealthOS is processed exclusively to deliver double-entry ledger calculations, portfolio accounting,
              tax readiness estimates, and personal financial intelligence.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Credentials:</strong> Email address, name, salted Argon2id password hash, and MFA secret tokens.</li>
              <li><strong>Financial Transaction Records:</strong> Account balances, transaction descriptions, amounts, currencies, and dates.</li>
              <li><strong>Financial Documents:</strong> Quarantined bank statements, broker Consolidated Account Statements (CAS), and invoices.</li>
              <li><strong>Technical Metadata:</strong> IP address, device fingerprints, and timestamps collected strictly for security audit logging and fraud prevention.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. How Your Data Is Secured</h2>
            <p>
              WealthOS enforces multi-layered enterprise security controls:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-sm mb-1">PostgreSQL Row-Level Security</h3>
                <p className="text-xs text-slate-600">65 database tables enforced at the kernel level. Tenant organizations are cryptographically segregated.</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h3 className="font-semibold text-slate-900 text-sm mb-1">AES-256-GCM Envelope Encryption</h3>
                <p className="text-xs text-slate-600">Bank connection tokens and credentials are encrypted at rest with per-record derived keys.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Statutory Data Retention</h2>
            <p>
              Under Indian law (Section 44AA of the Income Tax Act, 1961) and general financial auditing standards,
              numerical accounting records and balanced journal entries must be preserved for up to 8 financial years.
              When an account deletion is requested, all personal identifiable information (name, email, credentials) is permanently
              purged and anonymized, while double-entry transaction ledgers are retained in a pseudonymized state.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">5. User Rights & Account Deletion</h2>
            <p>
              You maintain full authority over your data. You may request data export or permanent account deletion at any time
              directly within the application settings or via our public self-service portal:
            </p>
            <div className="mt-4">
              <Link
                href="/delete-account"
                className="inline-flex items-center px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-sm font-semibold transition-colors border border-rose-200"
              >
                Go to Account & Data Deletion Portal
              </Link>
            </div>
          </section>

          <section className="pt-6 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Contact Privacy Officer</h2>
            <p className="text-sm text-slate-600">
              For inquiries regarding data governance, contact: <br />
              <strong>Data Protection & Privacy Officer</strong><br />
              Email: <a href="mailto:privacy@wealthos.app" className="text-blue-600 hover:underline">privacy@wealthos.app</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

