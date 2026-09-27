"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { AlertIcon, CheckCircleIcon } from "@/components/ui/Icons";
import { Brand } from "@/components/ui/Primitives";
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

    setNotice("Password updated. Sending you to the admin workspace.");
    router.replace("/admin");
    router.refresh();
  }

  if (!ready) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <p className="muted">Checking your reset link</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="reset-heading">
        <Brand href="/" subtitle="Admin access" />
        <div style={{ height: 20 }} />
        <h1 id="reset-heading">Set a new password</h1>

        {hasRecoverySession ? (
          <form className="stack-form" onSubmit={handleSubmit}>
            <p className="muted" style={{ margin: 0 }}>
              Choose a new password for your admin account.
            </p>
            <TextInput
              label="New password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <TextInput
              label="Confirm new password"
              name="confirm"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />

            {error ? (
              <p className="banner banner--error">
                <AlertIcon size={18} />
                <span>{error}</span>
              </p>
            ) : null}
            {notice ? (
              <p className="banner banner--success">
                <CheckCircleIcon size={18} />
                <span>{notice}</span>
              </p>
            ) : null}

            <Button type="submit" variant="filled" loading={submitting} block>
              {submitting ? "Saving" : "Save new password"}
            </Button>
          </form>
        ) : (
          <div className="stack-form">
            <p className="banner banner--error" style={{ marginTop: 0 }}>
              <AlertIcon size={18} />
              <span>This reset link is missing, expired, or already used. Request a new one.</span>
            </p>
            <Link className="btn btn--filled" href="/forgot-password" style={{ textDecoration: "none" }}>
              Request a new link
            </Link>
          </div>
        )}

        <div className="row" style={{ marginTop: 20 }}>
          <Link className="text-link" href="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
