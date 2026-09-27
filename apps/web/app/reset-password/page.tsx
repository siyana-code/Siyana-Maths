"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // The recovery link carries its tokens in the URL fragment, so the session
    // is only readable after the browser client has processed the redirect.
    supabase.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
      setReady(true);
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The two passwords do not match.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (updateError) {
      setError(`Could not update the password: ${updateError.message}`);
      return;
    }

    setNotice("Password updated. Sending you to the admin workspace…");
    router.replace("/admin");
    router.refresh();
  }

  if (!ready) return <main className="auth-shell"><p className="muted">Checking your reset link…</p></main>;

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="reset-heading">
        <Link className="brand" href="/">
          Siyana Maths
        </Link>
        <p className="eyebrow">Admin access</p>
        <h1 id="reset-heading">Set a new password</h1>

        {hasRecoverySession ? (
          <form className="stack-form" onSubmit={handleSubmit}>
            <p className="muted">Choose a new password for your admin account.</p>
            <label htmlFor="password">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <label htmlFor="confirm">Confirm new password</label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {notice ? <p className="form-success" role="status">{notice}</p> : null}
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save new password"}
            </button>
          </form>
        ) : (
          <div className="stack-form">
            <p className="form-error" role="alert">
              This reset link is missing, expired, or already used. Request a new one.
            </p>
            <Link className="button button-primary" href="/forgot-password">
              Request a new link
            </Link>
          </div>
        )}

        <div className="inline-actions">
          <Link className="text-link" href="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
