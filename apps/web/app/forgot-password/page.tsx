"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setSubmitting(false);
    if (resetError) {
      setError(`Could not send the reset link: ${resetError.message}`);
      return;
    }

    setNotice(
      "If that address has an account, a reset link is on its way. Check the inbox and the spam folder.",
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="forgot-heading">
        <Link className="brand" href="/">
          Siyana Maths
        </Link>
        <p className="eyebrow">Admin access</p>
        <h1 id="forgot-heading">Reset your password</h1>
        <p className="muted">
          Enter your admin email and we will send a link to set a new password.
        </p>
        <form className="stack-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          {notice ? <p className="form-success" role="status">{notice}</p> : null}
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <div className="inline-actions">
          <Link className="text-link" href="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
