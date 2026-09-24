# Siyana Maths API

FastAPI service for the Siyana Maths O/L Mathematics paper platform.

## Requirements

- Python 3.12+
- A Supabase project when paper data endpoints are enabled

## Local setup

From `apps/api`:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev]"
Copy-Item .env.example .env
```

Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the local `.env` when the Supabase project is ready. Never commit `.env`.

## Run

```powershell
python -m uvicorn app.main:app --reload --port 8000
```

Useful URLs:

- `http://localhost:8000/health` — liveness check
- `http://localhost:8000/ready` — configuration readiness
- `http://localhost:8000/docs` — interactive OpenAPI documentation
- `http://localhost:8000/openapi.json` — raw OpenAPI contract
- `http://localhost:8000/api/v1/papers` — public published-paper list
- `http://localhost:8000/api/v1/admin/me` — authenticated admin identity

Admin routes require a Supabase access token in `Authorization: Bearer <token>` and a matching `profiles.role = 'admin'` row.

`/health` works without Supabase configuration. The paper endpoint returns a safe `503` until the Supabase settings and database schema are available.

## Checks

```powershell
python -m ruff check .
python -m pytest -q
```

The API uses the public Supabase/PostgREST key for public reads. The service-role key is reserved for future authenticated admin writes and must never be exposed to the browser or committed.
