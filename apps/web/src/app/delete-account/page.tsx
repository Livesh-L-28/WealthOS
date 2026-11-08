"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, AlertCircle, CheckCircle, ShieldAlert } from "lucide-react";

export default function DeleteAccountPublicPage() {
  const [password, setPassword] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmPhrase.trim().toUpperCase() !== "DELETE MY ACCOUNT") {
      setStatusMsg({
        type: "error",
        text: "You must type 'DELETE MY ACCOUNT' exactly to confirm deletion.",
      });
      return;
    }

    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch("/api/v1/auth/me", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          confirmation_phrase: confirmPhrase,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.detail || "Account deletion request failed.");
      }

      setStatusMsg({
        type: "success",
        text: "Your WealthOS account has been successfully deleted and personal data permanently purged.",
      });
      setPassword("");
      setConfirmPhrase("");
    } catch (err: any) {
      setStatusMsg({
        type: "error",
        text: err.message || "An error occurred while processing your request.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 sm:p-10">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to WealthOS
        </Link>

        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Account & Data Deletion
            </h1>
            <p className="text-sm text-slate-500">Google Play & GDPR Self-Service Portal</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 mb-8 text-rose-900 text-sm leading-relaxed flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
          <div>
            <strong className="font-semibold block mb-1">Permanent Deletion Warning:</strong>
            Deleting your account will immediately revoke all active sessions across web and mobile devices,
            delete your login credentials, purge quarantined documents in object storage, and permanently
            anonymize your personal information. This action is irreversible.
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-base font-semibold text-slate-900 mb-2">What Happens When You Delete:</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5">
            <li>Your personal details (name, email, phone) are permanently anonymized.</li>
            <li>All active mobile and web login sessions are immediately revoked.</li>
            <li>Stored MFA secrets and recovery codes are deleted.</li>
            <li>Uploaded statements and receipts in object storage are deleted.</li>
            <li>Numerical accounting records are preserved in pseudonymized form to comply with statutory Indian tax laws (Section 44AA of Income Tax Act 1961).</li>
          </ul>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl mb-6 text-sm flex items-start space-x-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleDelete} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Current Account Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your current password"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Type <span className="font-mono text-rose-600 font-bold">DELETE MY ACCOUNT</span> to confirm
            </label>
            <input
              type="text"
              required
              value={confirmPhrase}
              onChange={(e) => setConfirmPhrase(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading || confirmPhrase.trim().toUpperCase() !== "DELETE MY ACCOUNT"}
            className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
          >
            {loading ? "Processing Permanent Deletion..." : "Permanently Delete My Account"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 text-center">
          Having trouble? You can also request manual account deletion by emailing our Data Protection Officer directly at{" "}
          <a href="mailto:privacy@wealthos.app" className="text-blue-600 hover:underline">
            privacy@wealthos.app
          </a>{" "}
          from your registered email address.
        </div>
      </div>
    </div>
  );
}

