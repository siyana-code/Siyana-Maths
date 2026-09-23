# Decision Summary — MVP

**Status:** Core product and architecture decisions
**Last updated:** 2026-09-23

This is the tracked summary. Detailed working history remains in the private `.agent/DECISIONS.md` file.

## Accepted decisions

| Area | Decision |
|---|---|
| Product | Start with the latest/most recent O/L Mathematics paper, then add older papers. |
| Scope | Questions, Sinhala solutions, full marking schemes, external video links, public catalog, admin publishing, and contact flow. |
| Deferred | Other subjects, general lesson-based teaching, student portal, accounts, quizzes, progress, payments, and forums. |
| Interface | English. |
| Educational content | Sinhala. |
| Content format | Text with math notation; safe Markdown/LaTeX-style rendering. |
| Marking | Full marking scheme with ordered method/award-note items and mark values. |
| Metadata | Title, exam year, level/session, subject, paper number, medium, topics, description, thumbnail, total marks, and status. |
| Videos | Links attached to a paper and/or an individual question; embed when possible with an original-link fallback. |
| Accounts | Public student accounts not required; admin authentication only. |
| Frontend | Next.js + TypeScript + App Router. |
| Backend | FastAPI, planned for Render. |
| Database/auth | Supabase Postgres and Supabase Auth. |
| Repository | Monorepo with `apps/api`, `apps/web`, `supabase`, and `docs`. |
| Hosting | Start with the currently available Render tier; consider a paid Render plan later. |
| Contact | WhatsApp, phone, email, social links, and a stored website form. |
| Agent files | `.agent/` is private and must remain Git-ignored. |

## Operational details still open

- exact first exam year and Paper I/Paper II set;
- alternative marking-method representation;
- contact form fields and email notification behavior;
- number of admin accounts and roles;
- working brand, domain, and public contact details;
- analytics choice;
- privacy and data-retention periods.

## Change control

A decision is not changed silently. Record the new decision, rationale, date, and affected schema/API/frontend documents before implementation.
