"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { AlertIcon, CheckCircleIcon } from "@/components/ui/Icons";
import { Brand } from "@/components/ui/Primitives";
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
        <Brand href="/" subtitle="Admin access" />
        <div style={{ height: 20 }} />
        <h1 id="forgot-heading">Reset your password</h1>
        <p className="muted">
          Enter your admin email and we will send a link to set a new password.
        </p>

        <form className="stack-form" onSubmit={handleSubmit}>
          <TextInput
            label="Email address"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
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
            {submitting ? "Sending" : "Send reset link"}
          </Button>
        </form>

        <div className="row" style={{ marginTop: 20 }}>
          <Link className="text-link" href="/login">
            Back to sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
