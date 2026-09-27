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

## 2.1 Authentication and OpenAPI

Admin routes use a Supabase access token:

```http
Authorization: Bearer <supabase-access-token>
```

FastAPI verifies the token against the Supabase JWKS endpoint, checks issuer, audience, expiry, and subject, then loads the user's `profiles.role` through the protected backend. Only `admin` profiles may mutate content.

Interactive documentation is available at `/docs`; the raw contract is `/openapi.json`. The checked-in export and regeneration instructions are documented in [OPENAPI.md](OPENAPI.md).

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
- both paper parts with their question counts, selection limits, and mark values so the page can show "answer any 5 of 6";
- paper-level video sources;
- ordered questions grouped by part;
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

Returns the complete editable paper, including unpublished children. The response contains `parts` (the two paper parts with their question counts, selection limits, and mark values) alongside `questions`, `answers`, `marking_scheme_items`, and `video_sources`.

Parts are created by a database trigger from `paper_number` when the paper is created, so the create request does not accept part data.

### `PATCH /api/v1/admin/papers/{id}`

Updates metadata, topics, or thumbnail. Does not publish implicitly. Changing `paper_number` does not regenerate existing parts.

### `DELETE /api/v1/admin/papers/{id}`

Deletes an eligible draft or performs the explicitly approved archive/delete behavior for published content. The API must document and enforce the chosen rule.

## 8. Admin questions and answers

### `POST /api/v1/admin/papers/{id}/questions`

Creates a question inside one of the paper's parts.

```json
{
  "part_id": "uuid",
  "number_label": "1",
  "prompt_markdown": "$$...$$",
  "marks": 2,
  "answer_markdown": "සොලුමා ගලනය…"
}
```

The API verifies that `part_id` belongs to this paper, assigns the next free `position` inside that part, and rejects the request with `question_limit_reached` (422) once the part already holds `question_count` questions. A `part_id` from another paper returns `paper_part_not_found` (404).

`marks` is always supplied by the client from the part's `marks_per_question`; the admin UI does not let an author type it, and publishing rejects any question whose marks disagree with its part.

`answer_markdown` is optional. When present the answer is created in the same request, so the question editor can save a question and its Sinhala solution together and never leave a question without an answer. The response then includes a nested `answer` object.

### `PATCH /api/v1/admin/questions/{id}`

Updates prompt, label, position, or marks. Marks must stay consistent with the part's `marks_per_question` at publish time.

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

### Publication rules

Publishing is rejected with `paper_validation_failed` (422) and a per-item `errors` array unless all of the following hold:

| Check | Reason code |
|---|---|
| The paper has parts | `paper_parts_required` |
| Each part holds exactly `question_count` questions | `question_count_mismatch` |
| `selection_limit` does not exceed the questions present | `selection_limit_exceeds_questions` |
| `total_marks` equals `marks_per_question * selection_limit` | `part_total_mismatch` |
| Each question's marks equal its part's `marks_per_question` | `question_mark_mismatch` |
| Each question has a Sinhala answer | `answer_required` |
| Each question has at least one marking-scheme step | `marking_scheme_required` |
| Non-alternative marking steps sum to the question's marks | `mark_total_mismatch` |
| The paper has at least one question | `at_least_one_question_required` |
| The paper has at least one video source | `at_least_one_video_required` |
| Part totals sum to 100 | `paper_total_mismatch` |

Paper II carries 12 questions but the student answers 10, so the paper total is the sum of the part totals, not the sum of every question's marks.

## 10. Admin video sources

### `POST /api/v1/admin/papers/{id}/video-sources`

Adds a paper-level source.

### `POST /api/v1/admin/questions/{id}/video-sources`

Adds a question-level source. The API verifies that the question belongs to the supplied paper and normalizes the provider URL.

### `PATCH /api/v1/admin/video-sources/{id}`

Updates URL/provider/primary/position after validation.

### `DELETE /api/v1/admin/video-sources/{id}`

Deletes the source.

## 11. Admin images

Questions and answers can carry graphs, sketches, and diagrams. Images are uploaded from the question editor and stored in the public-read `content-media` bucket.

### `POST /api/v1/admin/media`

`multipart/form-data` with:

| Field | Type | Notes |
|---|---|---|
| `file` | file | PNG, JPEG, WebP, or GIF, 5 MB maximum |
| `question_id` | uuid | Exactly one of `question_id` or `answer_id` |
| `answer_id` | uuid | Exactly one of `question_id` or `answer_id` |
| `caption` | text | Optional, 300 characters |
| `alt_text` | text | Optional, 300 characters |

Returns the created `MediaAsset`. The API sniffs the file's magic bytes rather than trusting `content_type` or the filename.

| Condition | Status | `code` |
|---|---:|---|
| Neither or both owners supplied | 422 | `media_owner_required` |
| Zero bytes | 422 | `media_empty` |
| Larger than `MEDIA_MAX_BYTES` | 413 | `media_too_large` |
| Not a PNG, JPEG, WebP, or GIF | 415 | `media_type_not_allowed` |
| Bytes disagree with the declared type | 415 | `media_type_mismatch` |
| Owner question or answer missing | 404 | `media_owner_not_found` |

SVG is rejected on purpose: it is an active-content format and would become a stored-XSS vector.

### `DELETE /api/v1/admin/media/{id}`

Removes the storage object and the metadata row. Returns `204`.

## 12. Publishing

### `POST /api/v1/admin/papers/{id}/publish`

Runs validation and transitions a draft to `published`. Sets `published_at` transactionally.

### `POST /api/v1/admin/papers/{id}/archive`

Removes a published paper from public results without deleting its content.

### `POST /api/v1/admin/papers/{id}/unpublish`

Returns a published paper to draft state if the product workflow requires it.

## 13. Contact

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

## 14. HTTP status guidance

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

## 15. Contract rules

- Do not expose draft content through a public endpoint.
- Never trust a role, creator ID, published timestamp, total mark, or provider embed URL supplied by the browser.
- Keep public and admin schemas separate where that prevents accidental field exposure.
- Version breaking changes under `/api/v1` or introduce a new version rather than silently changing semantics.
