# Supabase setup

This directory contains the versioned database migration and safe reference seed data for Siyana Maths.

## Apply safely

1. Create or select a Supabase project.
2. Back up any existing data before applying a migration.
3. Apply the migrations in filename order:
   - `migrations/202609240001_initial_schema.sql`
   - `migrations/202609270001_paper_parts.sql`
4. Apply them through the Supabase CLI, SQL editor, or a controlled deployment process.
5. Run `seed.sql` for the O/L level, Mathematics subject, and public site settings.
6. Create the admin Auth user, then insert its matching row into `public.profiles` with `role = 'admin'`.
7. Configure Auth redirect URLs for local, Vercel preview, and `siyanamaths.dev`.
8. Set the API's `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the local `.env` or Render environment.

## Paper structure migration

`202609270001_paper_parts.sql` introduces the O/L paper structure:

- creates `public.paper_parts` with two parts per paper and the question count, selection limit, and mark values;
- adds a trigger that creates the parts automatically from `paper_number` (`I` or `II`) when a paper is inserted, and sets `papers.total_marks` to 100;
- backfills parts and `questions.part_id` for papers created before the migration;
- replaces the `(paper_id, position)` question constraint with `(part_id, position)`.

It is safe to re-run: every statement is `if not exists`, `drop ... if exists`, or an `on conflict do nothing` backfill.

Paper II holds 6 questions per part but the student answers 5, so `selection_limit` is 5 while `question_count` is 6, and the part total stays 50 marks.

## Local Supabase CLI

If the Supabase CLI and Docker are available:

```powershell
supabase start
supabase db reset
```

The project configuration can be added when the team chooses a local Supabase workflow. Until then, use a separate development Supabase project rather than production.

## Security

- RLS is enabled in the migration.
- Anonymous users can read only active taxonomy, published papers, and published paper children.
- Anonymous users cannot read profiles or contact messages.
- Contact submissions must go through the protected FastAPI endpoint.
- The service-role key is backend-only and must never be committed or placed in a `NEXT_PUBLIC_*` variable.
