# Delivery Roadmap — MVP

**Status:** Planning baseline
**Last updated:** 2026-09-23

## Phase 0 — Product and architecture lock

**Goal:** turn the owner's requirements into an implementable baseline.

- [x] Create private `.agent/` planning workspace and ignore rule.
- [x] Capture the O/L Mathematics paper-first MVP.
- [x] Select Next.js + TypeScript.
- [x] Confirm FastAPI/Render, Vercel, and Supabase direction.
- [x] Confirm text/math authoring and Sinhala content/English interface.
- [x] Confirm full marking-scheme support.
- [x] Confirm paper- and question-level video links with fallback.
- [x] Confirm WhatsApp, phone, email, social, and website form channels.
- [ ] Confirm exact first exam year/paper set.
- [ ] Confirm contact form fields and admin roles.
- [ ] Confirm brand/domain and privacy/retention details.

**Exit gate:** owner accepts the MVP baseline and the unresolved operational items are recorded.

## Phase 1 — Repository and tooling foundation

**Goal:** create a reproducible monorepo skeleton.

- [ ] Create `apps/api` and `apps/web`.
- [ ] Select and pin Python and Node package managers.
- [ ] Add backend lint, format, and test commands.
- [ ] Add frontend lint, typecheck, and production build commands.
- [ ] Add `.env.example` files with placeholders only.
- [ ] Add CI checks for lint, tests, and builds.
- [ ] Add local setup documentation.

**Exit gate:** clean setup from a fresh checkout; baseline checks pass.

## Phase 2 — Supabase foundation

**Goal:** create the safe database/auth foundation.

- [ ] Create versioned migrations and seed workflow.
- [ ] Create profiles, exam levels, subjects, years, topics, and papers.
- [ ] Create questions, answers, and full marking-scheme items.
- [ ] Create paper/question video sources and contact messages.
- [ ] Add constraints, indexes, mark validation, and deletion behavior.
- [ ] Add RLS and service-role boundaries.
- [ ] Configure Auth redirects and an admin test account.
- [ ] Test migrations from an empty database.

**Exit gate:** repeatable migrations, blocked unauthorized access, and representative O/L seed content.

## Phase 3 — FastAPI backend

**Goal:** expose secure, documented APIs.

- [ ] Add settings, logging, request IDs, and health endpoints.
- [ ] Add Supabase JWT and admin-role verification.
- [ ] Add public taxonomy and published-paper endpoints.
- [ ] Add question, answer, and marking-scheme responses.
- [ ] Add admin paper/question/solution/marking/video CRUD.
- [ ] Add publication validation and status transitions.
- [ ] Add provider-aware URL validation and embed generation.
- [ ] Add contact submission and admin message review endpoints.
- [ ] Add tests and OpenAPI contract checks.

**Exit gate:** draft content cannot leak; admin operations and contact protections are tested.

## Phase 4 — Public Next.js frontend

**Goal:** deliver the student reading and discovery experience.

- [ ] Create responsive shell, navigation, footer, and design tokens.
- [ ] Build home page and latest-paper sections.
- [ ] Build O/L Mathematics catalog with filters and search.
- [ ] Build paper detail page with questions and Sinhala solutions.
- [ ] Build full marking-scheme view.
- [ ] Build video embeds and direct-link fallbacks.
- [ ] Build about/contact page and contact form.
- [ ] Add loading, empty, error, and not-found states.
- [ ] Add metadata, canonical URLs, sitemap, and robots configuration.

**Exit gate:** a student can complete the reading journey on a phone and desktop.

## Phase 5 — Admin publishing workflow

**Goal:** let the tutor manage content without database access.

- [ ] Build secure admin sign-in and protected routes.
- [ ] Build paper list and status/search filters.
- [ ] Build standard metadata editor.
- [ ] Build ordered question and solution editor.
- [ ] Build full marking-scheme editor with mark totals.
- [ ] Build paper/question video source editor.
- [ ] Build preview, publish, archive, and delete confirmation flows.
- [ ] Build contact-submission review.
- [ ] Test the complete publish-to-public journey.

**Exit gate:** only an admin can mutate content and publish a valid paper.

## Phase 6 — Deployment and operations

**Goal:** deploy repeatable staging and production environments.

- [ ] Configure Render API service and health check.
- [ ] Configure Vercel Next.js project and domain.
- [ ] Configure production Supabase Auth/RLS/backups.
- [ ] Configure exact CORS origins.
- [ ] Add error monitoring and uptime monitoring.
- [ ] Document migration, rollback, restore, and incident procedures.

**Exit gate:** staging and production pass the MVP acceptance journey independently.

## Phase 7 — Launch hardening

**Goal:** release a stable first version.

- [ ] Seed and review the first latest O/L Mathematics paper.
- [ ] Run accessibility, performance, browser, and SEO checks.
- [ ] Run security and dependency review.
- [ ] Publish privacy/contact information.
- [ ] Choose and configure analytics only if approved.
- [ ] Run launch checklist with the owner.
- [ ] Record release notes and operational handoff.

**Exit gate:** owner accepts the release and knows how to publish future papers.

## Deferred roadmap

After a successful MVP, evaluate in this order:

1. additional O/L Mathematics years;
2. improved search and browsing;
3. Tamil/English educational content;
4. lesson-based teaching;
5. student bookmarks and accounts;
6. quizzes/progress tracking;
7. image/PDF paper ingestion;
8. payments and enrollment;
9. richer video library and analytics.
