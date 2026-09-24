# OpenAPI documentation

FastAPI generates the API contract automatically from the route definitions.

## Interactive documentation

When the API is running locally:

```text
http://127.0.0.1:8000/docs
```

The raw OpenAPI document is available at:

```text
http://127.0.0.1:8000/openapi.json
```

In production it will be available at:

```text
https://api.siyanamaths.dev/docs
https://api.siyanamaths.dev/openapi.json
```

## What is documented

- health and readiness endpoints;
- public published-paper catalog;
- admin current-user endpoint;
- draft paper creation and metadata updates;
- ordered question creation;
- Sinhala answer creation/replacement;
- full marking-scheme item creation;
- paper/question video-source creation;
- validated paper publishing;
- bearer authentication requirements;
- request and response schemas;
- standard error envelopes.

Admin operations use:

```http
Authorization: Bearer <supabase-access-token>
```

The service-role Supabase key is never accepted from the browser and is not part of the public OpenAPI security scheme.

## Export the checked-in contract

From `apps/api`:

```powershell
python scripts/export_openapi.py
```

This writes:

```text
docs/openapi.json
```

Review and commit that file whenever the API routes or schemas change. The generated file must not contain environment-specific secrets or private values.

## API groups

| Tag | Purpose |
|---|---|
| `health` | Liveness and Supabase readiness |
| `papers` | Public published-paper catalog |
| `admin` | Authenticated paper/content management |

The OpenAPI document is generated from code, so the source route definitions remain the authority. The checked-in JSON is a convenient review and integration artifact.
