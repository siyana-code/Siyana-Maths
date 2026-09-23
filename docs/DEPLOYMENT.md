# Deployment and Operations — MVP

**Status:** Deployment design; commands and project IDs to be added during setup
**Last updated:** 2026-09-23

## 0. Branch-driven CD

The GitHub Actions workflow at `.github/workflows/ci-cd.yml` is the deployment pipeline:

- pull requests and `develop` run CI and may create a Vercel preview;
- `main` runs CI, applies Supabase migrations when present, then deploys the API and frontend;
- production deployment jobs use the protected GitHub `production` environment;
- jobs are safely skipped until the corresponding application folders and required secrets exist.

The complete branch policy is documented in [DEVELOPMENT.md](DEVELOPMENT.md).

## 1. Target topology

```text
GitHub repository
    ├── Vercel project       -> Next.js frontend
    ├── Render web service   -> FastAPI backend
    └── Supabase project     -> Auth + Postgres
```

The backend and frontend may be deployed from the same monorepo. Set each platform's root/build configuration explicitly.

## 2. Environments

Maintain separate configuration for:

- local development;
- preview/staging;
- production.

Use separate Supabase projects or clearly separated credentials. Never use production contact messages or real admin data while testing locally.

## 3. Supabase setup

1. Create a Supabase project for development and, when ready, production.
2. Create the database schema using versioned SQL migrations.
3. Enable RLS before loading real data.
4. Create the approved admin Auth user(s).
5. Add the corresponding `profiles` rows with the `admin` role.
6. Configure allowed Auth redirect URLs for local, Vercel preview, and production domains.
7. Configure backups and retention.
8. Store the project URL, anon key, service-role key, and any JWT settings in the deployment platforms.

The service-role key is backend-only. Do not put it in a `NEXT_PUBLIC_*` variable or commit it.

## 4. Render backend

### Service type

Create a Render Web Service connected to the GitHub repository.

### Build and start commands

The exact commands will be finalized with the Python project layout. The intended runtime is:

```text
Install: install Python dependencies from the API project
Start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
Health: /health
```

Use the Render-supported Python version and a pinned dependency lock file. Do not rely on an implicit global Python environment.

### Required backend environment variables

Names are proposed and must match the application settings module:

```text
APP_ENV=development|preview|production
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_AUDIENCE=...
ALLOWED_ORIGINS=https://your-vercel-domain
LOG_LEVEL=INFO
CONTACT_RATE_LIMIT_PER_HOUR=...
```

Do not place real values in this document. Use `.env.example` locally and Render's environment settings remotely.

### Free-to-paid upgrade path

Start with the currently available Render tier for the MVP. Upgrade when one of the following becomes true:

- cold starts materially harm the user experience;
- the service is regularly sleeping during expected traffic;
- runtime limits or availability become unreliable;
- production monitoring requires a stable instance;
- the owner accepts the recurring cost.

## 5. Vercel frontend

1. Import the GitHub repository into Vercel.
2. Set the project root to `apps/web` (or the finalized equivalent).
3. Use the detected or configured Next.js build command.
4. Add environment variables:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-render-service.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

5. Configure the production domain.
6. Add preview origins to the backend CORS configuration.
7. Configure Supabase Auth redirect URLs for the Vercel domain.
8. Verify metadata, sitemap, robots, and a production build.

Do not put the Supabase service-role key in Vercel.

### GitHub Actions deployment secrets

Configure these as environment/repository secrets only after the corresponding service exists:

```text
RENDER_API_KEY
RENDER_API_SERVICE_ID
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF
SUPABASE_DB_PASSWORD
```

Use a protected GitHub environment named `production` for production secrets and require reviewer approval for production deployments. Preview secrets may be kept in a separate `preview` environment.

## 6. CORS and URL configuration

The backend must allow:

- local frontend origin(s);
- the production frontend origin;
- explicitly approved preview origins if preview deployments need API access.

Use exact origins. Do not enable wildcard CORS in production.

## 7. Database migration procedure

For each environment:

1. Take/verify a backup where data already exists.
2. Review the migration SQL and API contract changes.
3. Apply the migration with the Supabase CLI or controlled dashboard process.
4. Run schema/RLS checks.
5. Run a representative public read and admin write test.
6. Record the migration and result in the release log.

Never edit production tables manually without a migration and a rollback/forward-fix plan.

## 8. Release procedure

1. Confirm `.agent/` is ignored and no secrets are staged.
2. Run backend lint, tests, and frontend lint/typecheck/build locally.
3. Review migrations and API/frontend contract changes.
4. Deploy the API to Render.
5. Verify `/health`, CORS, and a public paper read.
6. Deploy the frontend to Vercel.
7. Verify admin login, create/edit, publish, video validation, and contact submission.
8. Run the MVP acceptance journey on a mobile viewport.
9. Monitor errors and provider embeds.
10. Record the release in the durable roadmap/operations log.

## 9. Rollback and recovery

- Keep the previous Vercel deployment available for frontend rollback.
- Keep the previous Render deployment available for API rollback.
- Prefer forward database migrations when a migration is already applied; do not destructively roll back production data.
- Restore from a Supabase backup only after confirming the target and testing in staging.
- Preserve request IDs and deployment versions when investigating incidents.

## 10. Pre-launch operational checklist

- [ ] Supabase RLS policies reviewed.
- [ ] Production admin account and recovery method tested.
- [ ] Render health check works.
- [ ] Vercel production build works.
- [ ] CORS allows only approved origins.
- [ ] First O/L Mathematics paper is seeded and validated.
- [ ] Public mobile reading journey passes.
- [ ] Admin publish journey passes.
- [ ] YouTube, TikTok, and Facebook links behave with fallbacks.
- [ ] Contact form spam controls are active.
- [ ] Privacy/contact information is published.
- [ ] Backup and rollback procedures are understood.
