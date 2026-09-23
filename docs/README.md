# Siyana Maths Documentation

This directory contains the durable product and technical documents for the first release of the Siyana Maths platform.

**Document status:** MVP baseline; core scope and architecture are approved, with a small number of operational details still to confirm.

## Documents

| Document | Purpose |
|---|---|
| [Product specification](PRODUCT_SPEC.md) | MVP users, scope, journeys, content rules, and acceptance criteria |
| [UX brief](UX_BRIEF.md) | Information architecture, page behavior, content presentation, and mobile principles |
| [Architecture](ARCHITECTURE.md) | System boundaries, repository layout, request flows, and technology decisions |
| [Data model](DATA_MODEL.md) | Supabase-oriented tables, relationships, constraints, and access rules |
| [Supabase setup](../supabase/README.md) | Migration, seed, RLS, and local/production database workflow |
| [API contract](API_CONTRACT.md) | Versioned FastAPI endpoints, payloads, errors, and authorization rules |
| [Security and privacy](SECURITY.md) | Authentication, authorization, RLS, input validation, abuse controls, and operational safeguards |
| [Deployment](DEPLOYMENT.md) | Render, Vercel, Supabase, environment variables, release, and rollback procedures |
| [Domain setup](DOMAIN_SETUP.md) | `siyanamaths.dev`, Name.com DNS, Vercel, Render, HTTPS, and renewal checklist |
| [Development and branching](DEVELOPMENT.md) | `main`/`develop`/feature workflow, pull requests, and CI/CD behavior |
| [Roadmap](ROADMAP.md) | Delivery phases, action IDs, and launch gates |
| [Decision summary](DECISIONS.md) | Accepted decisions and intentionally deferred choices |

## Working agreement

- `.agent/` is private, Git-ignored planning memory and must not be pushed.
- Application code and durable documentation live in the repository.
- Secrets are supplied through deployment environment variables and are never committed.
- Do not deploy or push production changes without an explicit request.
- Keep this documentation synchronized with database migrations and API contracts.
