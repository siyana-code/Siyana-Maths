# Siyana Maths

**A focused O/L Mathematics past-paper platform for Sri Lankan students.**

Siyana Maths brings past-paper questions, Sinhala solutions, detailed marking schemes, and the tutor's YouTube/TikTok/Facebook discussions into one searchable, mobile-friendly place.

> **Project status:** MVP foundation. The public application has not launched yet. The first release is planned around the latest O/L Mathematics paper, followed by older papers and future lesson-based teaching.

## MVP

The first release is designed to let a student:

- browse O/L Mathematics past papers;
- filter by examination year, paper number, and medium;
- read each question and its Sinhala solution;
- study a full, step-by-step marking scheme;
- watch an embedded video discussion when the provider permits it;
- open the original YouTube, TikTok, or Facebook video directly;
- contact the tutor through WhatsApp, phone, email, social links, or the website form.

The tutor will have a protected publishing area for creating, editing, previewing, publishing, and archiving papers.

## Technology

| Layer | Choice |
|---|---|
| Frontend | Next.js, TypeScript, App Router |
| Frontend hosting | Vercel |
| Backend | FastAPI |
| Backend hosting | Render |
| Database and authentication | Supabase Postgres + Supabase Auth |
| Content format | Text with mathematical notation and a full marking scheme |
| Video hosting | Existing YouTube, TikTok, and Facebook channels |

## Planned architecture

```text
Browser
   │
   ▼
Next.js on Vercel
   │  JSON/HTTPS + Supabase access token
   ▼
FastAPI on Render
   │  server-side Supabase access
   ▼
Supabase Auth + PostgreSQL
```

The website links to external videos; it does not host or upload video files in the MVP.

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [UX brief](docs/UX_BRIEF.md)
- [System architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [API contract](docs/API_CONTRACT.md)
- [Security and privacy](docs/SECURITY.md)
- [Deployment and operations](docs/DEPLOYMENT.md)
- [Development and branching](docs/DEVELOPMENT.md)
- [Delivery roadmap](docs/ROADMAP.md)
- [Decision summary](docs/DECISIONS.md)

## Branch and release policy

- `main` is the protected production branch. It contains only production-ready releases.
- `develop` is the integration branch.
- Future work uses `feature/*` branches created from `develop`.
- Feature branches merge into `develop` through pull requests.
- A tested `develop` release is promoted to `main` through a pull request.
- GitHub Actions validates pull requests and publishes production deployments only after `main` passes CI.

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the complete workflow.

## Local setup

Application setup will be added when `apps/api` and `apps/web` are implemented. Until then, the repository contains the approved product, architecture, API, data-model, security, deployment, and roadmap documentation.

Never commit `.env` files, access tokens, service-role keys, or real contact data.

## Contributing

Use a feature branch from `develop`, keep changes focused, and complete the pull-request checklist in `.github/pull_request_template.md`.

## License

A project license has not yet been selected. It will be added before the public production launch.
