# Development and Branching

This document defines the repository workflow for contributors and automated agents.

## Branch model

```text
feature/<short-description>  ──PR──>  develop  ──release PR──>  main
                                      │
                                      └── preview deployment
```

### `main`

- Protected production branch.
- Contains only production-ready, tested releases.
- Production Render and Vercel deployments run from successful `main` builds.
- Use annotated/signed release tags such as `v0.1.0` after production deployment succeeds.

### `develop`

- Integration branch for completed, reviewed features.
- Pull requests from `feature/*` merge here after CI passes.
- Vercel preview deployments may run from this branch.
- Do not make unreviewed production releases directly here.

### `feature/*`

- Always create from the latest `develop`.
- Keep one coherent change per branch.
- Use a descriptive name such as `feature/paper-editor` or `feature/render-deploy`.
- Open a pull request to `develop` when ready.

### `release/*` (optional)

For a release requiring staging or coordinated preparation:

1. Create `release/<version>` from `develop`.
2. Apply only release preparation changes.
3. Open a pull request to `main` after staging verification.
4. Tag the merged production commit.

## Standard feature workflow

```powershell
git switch develop
git pull --ff-only origin develop
git switch -c feature/short-description
# implement and test
git add <files>
git commit -m "feat: short description"
git push -u origin feature/short-description
gh pr create --base develop --head feature/short-description
```

Do not use `git add -f` for `.agent/`; that directory is private and ignored.

## Pull-request requirements

Every feature pull request should explain:

- the user or operational problem being solved;
- files and behavior changed;
- database migrations and rollback/forward-fix plan;
- tests and checks run;
- environment variables or deployment changes;
- screenshots for visible UI changes;
- security, privacy, and content-rendering implications.

The template is located at `.github/pull_request_template.md`.

## CI/CD behavior

The GitHub Actions workflow is `.github/workflows/ci-cd.yml`.

### Pull requests and integration branches

- repository, documentation, backend, and frontend checks run when applicable;
- Vercel preview deployment runs for web changes when preview credentials exist;
- no production Render deployment is triggered.

### Production `main`

- all available quality checks must pass;
- Supabase migrations run first when migrations are present, behind the protected `production` environment;
- the FastAPI service is deployed through Render;
- the Next.js frontend is deployed through Vercel;
- failed or missing deployment credentials stop the release rather than silently skipping it.

The workflow is safe before application code exists: deployment jobs are skipped until `apps/api`, `apps/web`, or migrations are present.

## Required GitHub configuration

Create a protected GitHub environment named `production` and add these secrets only when the corresponding service is ready:

### Render

- `RENDER_API_KEY`
- `RENDER_API_SERVICE_ID`

### Vercel

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

### Supabase migrations

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`

Use separate Supabase projects/credentials for development and production. Never place these values in source files, `.env` files committed to Git, pull requests, or logs.

## Branch protection recommendation

Protect both `main` and `develop`:

- require a pull request;
- require approval before merging;
- disallow force pushes and deletion;
- require the repository CI checks;
- require branches to be up to date where appropriate;
- use the `production` environment approval for production deployment secrets.

The exact required status-check names should be selected after the first successful workflow run.
