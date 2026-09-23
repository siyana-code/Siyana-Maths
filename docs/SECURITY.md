# Security and Privacy — MVP

**Status:** Baseline requirements
**Last updated:** 2026-09-23

## 1. Security objectives

- Keep unpublished educational content private.
- Ensure only approved admins can mutate content.
- Keep provider keys and Supabase privileged credentials off the client and out of Git.
- Render author-supplied text and URLs safely.
- Prevent contact-form abuse without making the form unusable.
- Avoid collecting unnecessary personal data.

## 2. Authentication and authorization

### Authentication

- Supabase Auth owns admin credentials, sessions, recovery, and email verification.
- Public visitors do not need accounts in MVP.
- The frontend obtains a short-lived Supabase access token for admin requests.

### Authorization

- FastAPI verifies token signature, issuer, audience, expiry, and subject.
- The API loads the user's profile role; it does not trust a role supplied by the browser.
- Every admin mutation checks the `admin` role.
- Public endpoints filter by `published` status in the repository query.
- RLS provides defense in depth but does not replace API authorization, especially when the backend uses the service-role key.

### Account lifecycle

- Public self-registration is disabled for MVP.
- Only the owner enables additional admin accounts.
- Account deletion and profile cleanup follow the documented retention policy.

## 3. Secrets and configuration

- Store Supabase service-role credentials only in Render environment variables.
- Store the public Supabase URL/anon key in Vercel where Auth requires it; the anon key is not a secret.
- Store database URLs, JWT settings, CORS origins, and environment flags in the platform dashboards.
- Commit only `.env.example` files with placeholders.
- Never log authorization headers, access tokens, service-role keys, or full contact submissions.
- Rotate credentials immediately if they appear in a commit, log, screenshot, or issue.

## 4. Input and content validation

- Validate all API input with Pydantic and enforce maximum lengths.
- Generate slugs on the server; never trust client-provided IDs or ownership fields.
- Validate exam year, paper number, medium, marks, and status transitions.
- Validate mark totals and marking-scheme items before publication.
- Sanitize Markdown and render math with a maintained safe library.
- Do not execute raw author-provided HTML or scripts.
- Escape or sanitize all user-generated text in the frontend.
- Use parameterized queries through the Supabase/Postgres client.

## 5. External video safety

- Accept only HTTPS URLs for approved providers: YouTube, TikTok, Facebook, and an explicitly reviewed fallback provider.
- Parse and normalize provider URLs on the backend.
- Generate embed URLs from the normalized provider and video ID.
- Never accept an arbitrary iframe URL from the admin form.
- Do not fetch arbitrary admin-provided URLs from the backend; this avoids SSRF.
- Always show a direct provider link as a fallback.
- Treat provider embed failures as expected and display a safe fallback state.

## 6. Contact-form protection

- Apply IP/session-based and global rate limits at the API boundary.
- Limit name, email, phone, grade, and message lengths.
- Use a honeypot field and, if needed, a privacy-friendly CAPTCHA.
- Reject scripts, suspicious URLs, and obvious spam patterns without exposing internal rules.
- Avoid raw IP storage; if abuse investigation needs it, use a short-lived hash and document retention.
- Add a privacy acknowledgement and a clear privacy contact route.
- Provide rate-limit and validation feedback that does not reveal whether an email already exists.

## 7. CORS and browser security

- Allow only known local, preview, and production frontend origins in CORS.
- Do not use wildcard origins for credentialed browser requests.
- Set sensible security headers through Vercel and/or the API gateway.
- Use HTTPS for all production traffic.
- Do not place secrets in `NEXT_PUBLIC_*` variables.

## 8. Supabase protections

- Enable RLS on every application table before adding real data.
- Public read policies expose only published paper data.
- Do not expose contact messages or profiles to anonymous clients.
- Keep service-role usage inside the backend repository layer.
- Use separate projects or credentials for development/staging and production where practical.
- Enable backups and test a restore procedure before relying on production data.

## 9. Logging and monitoring

- Generate a request ID for every API request.
- Log method, route template, status, duration, and safe error category.
- Redact authorization headers, tokens, secrets, and contact content.
- Monitor health checks, elevated 4xx/5xx rates, and unexpected authorization failures.
- Review dependency and platform security updates before releases.

## 10. Privacy baseline

The privacy policy must explain:

- what account data exists for admins;
- what contact information is collected and why;
- how to contact the site owner;
- how long contact submissions are retained;
- whether analytics are used;
- that external video providers receive a request when a visitor opens an embedded video.

## 11. Security release checklist

Before production launch:

- [ ] no secrets or real contact data in Git;
- [ ] RLS enabled and policies reviewed;
- [ ] public/admin authorization tests pass;
- [ ] draft/archived content leak tests pass;
- [ ] Markdown/math XSS tests pass;
- [ ] provider URL validation tests pass;
- [ ] CORS origins are exact and production-only where appropriate;
- [ ] contact rate limiting and spam controls are active;
- [ ] backups and restore procedure are documented;
- [ ] dependency scan and production build checks pass.
