# API Contract — MVP

**Status:** Draft contract for implementation
**Base URL:** `/api/v1`
**Authentication:** Supabase access token in `Authorization: Bearer <token>`

This document defines the intended FastAPI surface. Field-level schemas will be generated from Pydantic models and checked in OpenAPI during Phase 3.

## 1. Conventions

- JSON request and response bodies use `snake_case`.
- Public resources expose stable UUIDs and slugs where appropriate.
- List endpoints use bounded pagination.
- All timestamps are UTC ISO 8601 strings.
- Mutating requests accept an `Idempotency-Key` where retries could create duplicate content.
- Every response includes an `X-Request-ID` header.
- Public APIs return only `published` papers and their visible children.
- Admin APIs require an enabled `admin` profile.

## 2. Response envelope

Successful list response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 0
  }
}
```

Successful resource response:

```json
{
  "data": {}
}
```

Error response:

```json
{
  "error": {
    "code": "validation_error",
    "message": "The request could not be validated.",
    "details": {}
  },
  "request_id": "..."
}
```

Never return raw database exceptions, provider responses, tokens, or internal stack traces.

## 3. Health and site

### `GET /health`

Returns service status and version/build information without secrets.

### `GET /api/v1/site`

Returns public brand/contact settings used by the header, footer, and contact page.

## 4. Public taxonomy

### `GET /api/v1/levels`

Returns active examination levels. Initial data: O/L.

### `GET /api/v1/subjects`

Returns active subjects. Initial data: Mathematics.

### `GET /api/v1/exam-years`

Returns years that have published papers, newest first.

### `GET /api/v1/topics`

Optional filters:

- `subject=mathematics`
- `parent_id`
- `active=true`

## 5. Public papers

### `GET /api/v1/papers`

Query parameters:

| Parameter | Type | Notes |
|---|---|---|
| `level` | string | Initially `ordinary-level` |
| `subject` | string | Initially `mathematics` |
| `year` | integer | Exam year |
| `paper_number` | string | `I`, `II`, or configured value |
| `medium` | string | `en`, `si`, or `ta` |
| `q` | string | Optional bounded search text |
| `page` | integer | Default 1 |
| `page_size` | integer | Default 20, capped server-side |

Returns published paper summaries. Drafts and archived papers are excluded in the repository query.

### `GET /api/v1/papers/{slug}`

Returns one published paper with:

- metadata and total marks;
- ordered topics;
- paper-level video sources;
- ordered questions;
- each question's Sinhala answer;
- ordered marking-scheme items;
- question-level video sources.

If the paper is not published, return `404` for public requests rather than revealing that it exists.

## 6. Current user

### `GET /api/v1/me`

Requires a valid Supabase access token. Returns the authenticated user's ID, display name, and role. This endpoint is also used by the frontend to decide whether to show admin navigation.

## 7. Admin papers and questions

All endpoints in this section require `Authorization: Bearer <token>` and an `admin` profile.

### `GET /api/v1/admin/papers`

Supports status, year, subject, search, and pagination filters.

### `POST /api/v1/admin/papers`

Creates a draft paper. Required initial fields:

```json
{
  "title": "...",
  "level_id": "...",
  "subject_id": "...",
  "exam_year_id": "...",
  "paper_number": "I",
  "medium": "si",
  "description": null
}
```

The server generates the slug, timestamps, and creator identity.

### `GET /api/v1/admin/papers/{id}`

Returns the complete editable paper, including unpublished children.

### `PATCH /api/v1/admin/papers/{id}`

Updates metadata, topics, or thumbnail. Does not publish implicitly.

### `DELETE /api/v1/admin/papers/{id}`

Deletes an eligible draft or performs the explicitly approved archive/delete behavior for published content. The API must document and enforce the chosen rule.

## 8. Admin questions and answers

### `POST /api/v1/admin/papers/{id}/questions`

Creates an ordered question with prompt text/math and mark value.

### `PATCH /api/v1/admin/questions/{id}`

Updates prompt, label, position, or marks.

### `DELETE /api/v1/admin/questions/{id}`

Deletes or archives a question according to the approved paper deletion policy.

### `PUT /api/v1/admin/questions/{id}/answer`

Creates or replaces the Sinhala solution for a question.

## 9. Admin marking scheme

### `POST /api/v1/admin/questions/{id}/marking-scheme-items`

Creates an ordered item with method/step label, criterion, award note, item type, and mark value.

### `PATCH /api/v1/admin/marking-scheme-items/{id}`

Updates one item.

### `DELETE /api/v1/admin/marking-scheme-items/{id}`

Deletes one item after authorization and validation.

### `POST /api/v1/admin/papers/{id}/validate`

Runs the full publication validation without changing state. It checks required metadata, ordered questions, answers, marking scheme, video sources, and mark totals.

## 10. Admin video sources

### `POST /api/v1/admin/papers/{id}/video-sources`

Adds a paper-level source.

### `POST /api/v1/admin/questions/{id}/video-sources`

Adds a question-level source. The API verifies that the question belongs to the supplied paper and normalizes the provider URL.

### `PATCH /api/v1/admin/video-sources/{id}`

Updates URL/provider/primary/position after validation.

### `DELETE /api/v1/admin/video-sources/{id}`

Deletes the source.

## 11. Publishing

### `POST /api/v1/admin/papers/{id}/publish`

Runs validation and transitions a draft to `published`. Sets `published_at` transactionally.

### `POST /api/v1/admin/papers/{id}/archive`

Removes a published paper from public results without deleting its content.

### `POST /api/v1/admin/papers/{id}/unpublish`

Returns a published paper to draft state if the product workflow requires it.

## 12. Contact

### `POST /api/v1/contact`

Public, rate-limited endpoint. Initial fields:

```json
{
  "name": "Student name",
  "email": "student@example.com",
  "phone": "+94...",
  "grade_level": "Grade 11",
  "message": "..."
}
```

The server validates length and format, rejects honeypot submissions, applies rate limits, and stores a message. A future email notification is optional.

### `GET /api/v1/admin/contact-messages`

Admin-only list with status and date filters.

### `PATCH /api/v1/admin/contact-messages/{id}`

Update read/replied/archived/spam status.

## 13. HTTP status guidance

- `200` successful read/update.
- `201` resource created.
- `204` successful deletion with no body.
- `400` malformed request or invalid provider URL.
- `401` missing/invalid access token.
- `403` authenticated but not an admin.
- `404` public resource does not exist.
- `409` duplicate slug, invalid state transition, or uniqueness conflict.
- `422` request validation failed.
- `429` rate limit exceeded.
- `500` unexpected server error; return a request ID only.

## 14. Contract rules

- Do not expose draft content through a public endpoint.
- Never trust a role, creator ID, published timestamp, total mark, or provider embed URL supplied by the browser.
- Keep public and admin schemas separate where that prevents accidental field exposure.
- Version breaking changes under `/api/v1` or introduce a new version rather than silently changing semantics.
