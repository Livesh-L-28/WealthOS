import React from "react";
import Link from "next/link";
import { ArrowLeft, FileCheck, AlertTriangle } from "lucide-react";

export const metadata = {
  title: "Terms of Service | WealthOS",
  description: "Terms and Conditions of Use for the WealthOS Platform",
};

export default function TermsPage() {
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
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Terms of Service</h1>
            <p className="text-sm text-slate-500">Last Updated: November 8, 2026</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing or using the WealthOS web application or mobile application, you agree to be bound by these Terms of Service.
              If you do not agree with any part of these terms, you must discontinue use of the platform immediately.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3 flex items-center text-amber-700">
              <AlertTriangle className="w-5 h-5 mr-2 inline" />
              2. Financial Information & Non-Advisory Disclaimer
            </h2>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm leading-relaxed">
              <strong>IMPORTANT NOTICE:</strong> WealthOS is a personal financial accounting, portfolio tracking, and intelligence software tool.
              WealthOS is <strong>NOT</strong> a registered SEBI Investment Adviser (RIA), Research Analyst, Portfolio Management Service (PMS), or Chartered Accountant.
              All calculations, XIRR returns, tax estimates, and Copilot suggestions are provided for informational and analytical purposes only.
              You should consult with a certified financial planner or chartered accountant before executing major investment or tax decisions.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">3. Account Integrity & Security Responsibilities</h2>
            <p>
              You are responsible for maintaining the confidentiality of your authentication credentials, passwords, and multi-factor
              authentication codes. You agree to notify us immediately at <a href="mailto:security@wealthos.app" className="text-blue-600 hover:underline">security@wealthos.app</a> upon
              suspecting any unauthorized access or compromise of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-3">4. Account Termination & Deletion</h2>
            <p>
              You may terminate your account at any time without penalty by initiating account deletion in your Settings or via our
              public <Link href="/delete-account" className="text-blue-600 hover:underline">Account Deletion Page</Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
