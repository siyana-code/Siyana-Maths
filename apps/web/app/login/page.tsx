"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { createClient } from "@/lib/supabase/client";

/** Keeps the real Supabase reason visible so a failed sign-in is diagnosable. */
function describeSignInError(signInError: { message: string; status?: number }) {
  const message = signInError.message.toLowerCase();
  if (message.includes("invalid login")) {
    return "That email and password do not match an account. Use the reset link below if you have forgotten the password.";
  }
  if (message.includes("email not confirmed")) {
    return "This email address is not confirmed yet. Check the confirmation link Supabase sent you.";
  }
  if (message.includes("rate limit") || (signInError.status ?? 0) === 429) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (message.includes("fetch")) {
    return "Could not reach Supabase. Check your internet connection and that the API keys are loaded.";
  }
  return `Sign-in failed: ${signInError.message}`;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(describeSignInError(signInError));
      setSubmitting(false);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-heading">
        <Link className="brand" href="/">
          Siyana Maths
        </Link>
        <p className="eyebrow">Tutor workspace</p>
        <h1 id="login-heading">Admin sign in</h1>
        <p className="muted">
          Sign in with the approved administrator account to manage O/L papers.
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
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="muted">
          Admin account: <code>rchkaushalya@gmail.com</code>
        </p>
        <div className="inline-actions">
          <Link className="text-link" href="/forgot-password">
            Forgot your password?
          </Link>
          <Link className="text-link" href="/">
            Return to home
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-shell"><p>Loading sign in…</p></main>}>
      <LoginForm />
    </Suspense>
  );
}
