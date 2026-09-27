# Data Model — Supabase MVP

**Status:** Implemented in `202609240001_initial_schema.sql` and `202609270001_paper_parts.sql`
**Last updated:** 2026-09-27

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
papers                    (1) ──< paper_parts
paper_parts               (1) ──< questions
questions                 (1) ──(1) answers
questions                 (1) ──< marking_scheme_items
questions                 (1) ──< media_assets (graphs, sketches)
answers                   (1) ──< media_assets (working diagrams)
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

`total_marks` is derived from the sum of `paper_parts.total_marks` at publish time. The API must reject inconsistent publication data.

### `paper_parts`

Each paper has exactly two parts, `A` and `B`. The part stores the exam's own rules so the public site and the publish validator agree without hard-coding the structure in application code.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `paper_id` | uuid | References `papers`; cascade delete |
| `part_code` | text | `A` or `B` |
| `title` | text | Display title, for example `Part A — Short questions` |
| `part_type` | enum/text | `short`, `structured`, or `easy` |
| `question_count` | integer | Questions that exist in the part |
| `selection_limit` | integer | Questions the student actually answers; `<= question_count` |
| `marks_per_question` | numeric | Marks for each question in the part |
| `total_marks` | numeric | `selection_limit * marks_per_question` |
| `sort_order` | smallint | Display order; `A` is 1, `B` is 2 |
| `created_at` | timestamptz | UTC |
| `updated_at` | timestamptz | UTC |

Unique constraint: `(paper_id, part_code)`.

#### O/L Mathematics defaults

Parts are created automatically by a database trigger on `papers` insert, derived from `paper_number`:

| `paper_number` | Part | `part_type` | Questions | Answer | Marks each | Part total |
|---|---|---|---:|---:|---:|---:|
| `I` | A | `short` | 25 | all 25 | 2 | 50 |
| `I` | B | `structured` | 5 | all 5 | 10 | 50 |
| `II` | A | `easy` | 6 | any 5 | 10 | 50 |
| `II` | B | `easy` | 6 | any 5 | 10 | 50 |

Every paper totals 100 marks. Paper II holds 12 questions but only 10 are answered, so the paper total is the sum of the part totals, never the sum of every question's marks.

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
| `part_id` | uuid | References `paper_parts`; must belong to the same paper |
| `number_label` | text | For example `1`, `1(a)`, or `2(i)` |
| `position` | integer | Stable display order within the part |
| `prompt_markdown` | text | Text/math authoring format |
| `marks` | numeric | Maximum marks; must equal the part's `marks_per_question` |
| `created_at` | timestamptz | UTC |
| `updated_at` | timestamptz | UTC |

Unique constraint: `(part_id, position)`. Positions restart at 1 in each part, so Paper I Part A uses 1–25 and Part B uses 1–5. The API rejects a question whose part has already reached `question_count`.

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

### `media_assets`

Images attached to a question or to its answer: graphs, sketches, and diagrams.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `question_id` | uuid nullable | References `questions`; cascade delete |
| `answer_id` | uuid nullable | References `answers`; cascade delete |
| `storage_path` | text | Unique object key inside the storage bucket |
| `public_url` | text | Public-read URL returned by Storage |
| `caption` | text nullable | Shown under the image |
| `alt_text` | text nullable | Accessibility description |
| `mime_type` | text | Detected from the bytes, not the filename |
| `byte_size` | bigint | Enforced maximum of 5 MB |
| `position` | smallint | Display order within the owner |
| `created_by` | uuid | References `profiles` |
| `created_at` | timestamptz | UTC |

Check constraint `media_assets_single_owner` requires exactly one of `question_id` or `answer_id`, so an image can never be orphaned or attached twice.

Files live in the public-read `content-media` bucket. The bucket's own `allowed_mime_types` and `file_size_limit` are the first line of defence, and the API additionally sniffs the magic bytes and rejects SVG, which would otherwise be a script-injection vector. Uploads require the service-role key, so anonymous clients cannot write to the bucket.

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
- paper parts by `(paper_id, sort_order)`;
- questions by `(part_id, position)`;
- answers by `question_id`;
- media assets by `(question_id, position)` and `(answer_id, position)`;
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
