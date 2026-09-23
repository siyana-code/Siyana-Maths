# Data Model — Supabase MVP

**Status:** Logical design baseline; SQL migration names and final constraints to be implemented in Phase 2
**Last updated:** 2026-09-23

## 1. Design principles

- Keep the first schema relational and small.
- Separate paper metadata, questions, solutions, marking-scheme items, and video sources.
- Store stable IDs and slugs; generate slugs server-side.
- Use UTC timestamps.
- Use database constraints for relationships and mark validation where practical.
- Keep the backend as the privileged domain boundary and use RLS as defense in depth.
- Do not store passwords; Supabase Auth owns credentials.

## 2. Relationship overview

```text
profiles                 (1) ──< papers (creator/updater)
exam_levels               (1) ──< papers >──(1) subjects
exam_years                (1) ──< papers
papers                    (1) ──< questions
questions                 (1) ──(1) answers
questions                 (1) ──< marking_scheme_items
papers                    (1) ──< video_sources
questions                 (1) ──< video_sources (optional target)
papers                    (1) ──< paper_topics >──(1) topics
site_settings             (singleton)
contact_messages          (standalone service data)
```

## 3. Tables

The following is a logical schema. Exact SQL types, generated columns, triggers, and policy names will be finalized in migrations.

### `profiles`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key; references `auth.users.id` |
| `display_name` | text | Admin display name |
| `role` | enum/text | `admin` initially; `student` reserved for future use |
| `created_at` | timestamptz | UTC |
| `updated_at` | timestamptz | UTC |

Only the approved admin account is enabled for the MVP. Public sign-up is not part of the public product.

### `exam_levels`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `slug` | text | Unique, stable; initially `ordinary-level` |
| `name_en` | text | Interface label |
| `name_si` | text nullable | Optional localized label |
| `sort_order` | integer | Display order |
| `is_active` | boolean | Soft deactivation |

### `subjects`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `slug` | text | Unique, stable; initially `mathematics` |
| `name_en` | text | Interface label |
| `name_si` | text nullable | Optional localized label |
| `sort_order` | integer | Display order |
| `is_active` | boolean | Soft deactivation |

### `exam_years`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `year` | smallint | Unique four-digit year |

### `topics`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `subject_id` | uuid | References `subjects` |
| `parent_id` | uuid nullable | Future topic hierarchy |
| `slug` | text | Unique within subject |
| `name_en` | text | Filter/interface label |
| `name_si` | text nullable | Optional localized label |
| `is_active` | boolean | Soft deactivation |

### `papers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `slug` | text | Unique, stable, generated server-side |
| `title` | text | Content title, initially Sinhala |
| `description` | text nullable | Short public description |
| `level_id` | uuid | References `exam_levels` |
| `subject_id` | uuid | References `subjects` |
| `exam_year_id` | uuid | References `exam_years` |
| `paper_number` | text | For example `I`, `II`, or `Q1` |
| `medium` | enum/text | `en`, `si`, or `ta`; initial content `si` |
| `status` | enum/text | `draft`, `published`, `archived` |
| `total_marks` | numeric | Cached/validated total; do not trust without server validation |
| `thumbnail_url` | text nullable | External image URL for MVP |
| `published_at` | timestamptz nullable | Set on publish |
| `created_by` | uuid | References `profiles` |
| `updated_by` | uuid | References `profiles` |
| `created_at` | timestamptz | UTC |
| `updated_at` | timestamptz | UTC |

`total_marks` should be recalculated by the backend from question marks or maintained through a database generated/validated mechanism. The API must reject inconsistent publication data.

### `paper_topics`

| Column | Type | Notes |
|---|---|---|
| `paper_id` | uuid | References `papers` |
| `topic_id` | uuid | References `topics` |

Composite primary key: `(paper_id, topic_id)`.

### `questions`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `paper_id` | uuid | References `papers` |
| `number_label` | text | For example `1`, `1(a)`, or `2(i)` |
| `position` | integer | Stable display order within paper |
| `prompt_markdown` | text | Text/math authoring format |
| `marks` | numeric | Maximum marks for the question |
| `created_at` | timestamptz | UTC |
| `updated_at` | timestamptz | UTC |

Unique constraint: `(paper_id, position)` and a server-side uniqueness check for `number_label` where appropriate.

### `answers`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `question_id` | uuid | Unique reference to `questions` |
| `solution_markdown` | text | Sinhala answer and working |
| `explanation_markdown` | text nullable | Optional additional explanation |
| `content_language` | enum/text | `si` initially |
| `created_at` | timestamptz | UTC |
| `updated_at` | timestamptz | UTC |

### `marking_scheme_items`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `question_id` | uuid | References `questions` |
| `position` | integer | Display order |
| `item_type` | enum/text | `method`, `alternative`, or `note` |
| `method_label` | text nullable | Short label for a method/step |
| `criterion_markdown` | text | Award condition or method description |
| `mark_value` | numeric | Marks awarded by this item |
| `award_note_markdown` | text nullable | Explanation of award/partial credit |
| `is_alternative` | boolean | Supports alternative methods without a separate table initially |
| `created_at` | timestamptz | UTC |
| `updated_at` | timestamptz | UTC |

Unique constraint: `(question_id, position)`. The backend validates the relationship between item marks and the question's `marks` before publication. Alternative-method behavior is an open operational decision.

### `video_sources`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `paper_id` | uuid | Required; references `papers` |
| `question_id` | uuid nullable | Optional target; must belong to `paper_id` |
| `provider` | enum/text | `youtube`, `tiktok`, `facebook`, or `other` |
| `original_url` | text | Validated HTTPS source URL |
| `embed_url` | text nullable | Backend-generated provider URL, never arbitrary iframe input |
| `is_primary` | boolean | One primary source per attachment scope |
| `position` | integer | Display order |
| `created_at` | timestamptz | UTC |
| `updated_at` | timestamptz | UTC |

Use a composite foreign key or equivalent trigger to ensure that a non-null `question_id` belongs to the same paper. Enforce one primary source for the paper scope and one primary source per question scope.

### `site_settings`

Singleton configuration for public contact details:

- `site_name`;
- `tagline` nullable;
- `whatsapp_number` nullable;
- `phone_number` nullable;
- `contact_email` nullable;
- `youtube_url`, `tiktok_url`, `facebook_url` nullable;
- `updated_at`.

Values are public. The admin API should validate URL formats and phone/email values.

### `contact_messages`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `name` | text | Required, bounded length |
| `email` | text nullable | Validated if supplied |
| `phone` | text nullable | Validated if supplied |
| `grade_level` | text nullable | Bounded select/free text |
| `message` | text | Required, bounded length |
| `consent_at` | timestamptz nullable | Set when privacy acknowledgement is shown |
| `honeypot_value` | text nullable | Must remain empty for normal submissions |
| `status` | enum/text | `new`, `read`, `replied`, `archived`, `spam` |
| `created_at` | timestamptz | UTC |
| `updated_at` | timestamptz | UTC |

Avoid storing raw IP addresses unless there is a documented need. If abuse investigation requires it, store a short-lived hash and define retention.

## 4. Indexes

At minimum index:

- published papers by status, exam year, subject, paper number, and published time;
- slug lookups;
- questions by `(paper_id, position)`;
- answers by `question_id`;
- marking-scheme items by `(question_id, position)`;
- video sources by `paper_id`, `question_id`, and provider;
- topics by subject and active status;
- contact messages by status and creation time.

Use a search strategy that works for Sinhala. Start with bounded `ILIKE` search on titles/descriptions/topics or PostgreSQL trigram support; do not assume English tokenization is suitable.

## 5. RLS and access rules

- Enable RLS on all application tables.
- Public read policies expose only published papers and their published child records.
- Profiles and contact messages are not publicly readable.
- Public contact submission goes through FastAPI rate limiting and server-side validation; do not expose unrestricted anonymous inserts.
- Admin-only writes are enforced by FastAPI after token/role validation and reinforced by RLS/service-role boundaries.
- The service-role key is never shipped to the browser.

The exact policy implementation must be reviewed with the first migration because service-role access bypasses RLS.

## 6. Deletion and retention

- Deleting a paper should be restricted to drafts or use an explicit archive/delete policy for published content.
- Decide whether deleting a paper cascades to questions, answers, marking items, and videos.
- Contact messages require an explicit retention period and admin deletion workflow.
- Auth account deletion must remove or anonymize the associated profile according to the privacy policy.
- Backups are operational data and must have their own retention policy.

## 7. Migration rule

Every schema change requires:

1. a timestamped SQL migration;
2. a corresponding API/frontend contract update when applicable;
3. a rollback or forward-fix note;
4. a test against an empty database and a representative seed dataset.
