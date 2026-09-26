# Siyana Maths Web

Next.js App Router frontend for the public site and tutor admin workspace.

## Local setup

Requirements:

- Node.js 20.9 or newer;
- the FastAPI API running locally;
- a Supabase project with the admin Auth user/profile configured.

From this directory:

```powershell
npm install
Copy-Item .env.example .env.local
notepad .env.local
```

Set:

```text
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

Do not put the Supabase service-role key in this frontend. It belongs only in the FastAPI/Render environment.

## Run

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

Admin sign-in:

```text
http://localhost:3000/login
```

The admin workspace calls the protected FastAPI endpoints under `/api/v1/admin` using the signed-in Supabase user access token.

## Checks

```powershell
npm run lint
npm run typecheck
npm run build
```

## Current scope

- Supabase email/password login;
- server-protected `/admin` routes;
- paper list and draft creation;
- paper metadata editing;
- ordered question creation;
- Sinhala answer editing;
- full marking-scheme item creation;
- YouTube/TikTok/Facebook source creation;
- publish action with API validation.

Public student pages and the full production design will be added after the admin workflow is verified.
