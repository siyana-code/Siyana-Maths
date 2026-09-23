# Supabase setup

This directory contains the versioned database migration and safe reference seed data for Siyana Maths.

## Apply safely

1. Create or select a Supabase project.
2. Back up any existing data before applying a migration.
3. Review `migrations/202609240001_initial_schema.sql`.
4. Apply the migration through the Supabase CLI, SQL editor, or a controlled deployment process.
5. Run `seed.sql` for the O/L level, Mathematics subject, and public site settings.
6. Create the admin Auth user, then insert its matching row into `public.profiles` with `role = 'admin'`.
7. Configure Auth redirect URLs for local, Vercel preview, and `siyanamaths.dev`.
8. Set the API's `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the local `.env` or Render environment.

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
