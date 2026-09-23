-- Siyana Maths initial Supabase schema.
-- Apply to a Supabase project only after reviewing the migration in staging.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'student' check (role in ('admin', 'student')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exam_levels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_en text not null,
  name_si text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_en text not null,
  name_si text,
  sort_order integer not null default 0 check (sort_order >= 0),
  is_active boolean not null default true
);

create table if not exists public.exam_years (
  id uuid primary key default gen_random_uuid(),
  year smallint not null unique check (year between 1900 and 2200)
);

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  parent_id uuid references public.topics(id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_en text not null,
  name_si text,
  is_active boolean not null default true,
  unique (subject_id, slug)
);

create table if not exists public.papers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null check (length(trim(title)) > 0),
  description text,
  level_id uuid not null references public.exam_levels(id) on delete restrict,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  exam_year_id uuid not null references public.exam_years(id) on delete restrict,
  paper_number text not null check (length(trim(paper_number)) > 0),
  medium text not null check (medium in ('en', 'si', 'ta')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  total_marks numeric(8, 2) check (total_marks is null or total_marks >= 0),
  thumbnail_url text,
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level_id, subject_id, exam_year_id, paper_number, medium)
);

create table if not exists public.paper_topics (
  paper_id uuid not null references public.papers(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  primary key (paper_id, topic_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  number_label text not null check (length(trim(number_label)) > 0),
  position integer not null check (position > 0),
  prompt_markdown text not null check (length(trim(prompt_markdown)) > 0),
  marks numeric(8, 2) not null check (marks >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (paper_id, position),
  unique (paper_id, number_label),
  unique (id, paper_id)
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions(id) on delete cascade,
  solution_markdown text not null check (length(trim(solution_markdown)) > 0),
  explanation_markdown text,
  content_language text not null default 'si' check (content_language in ('si', 'en', 'ta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.marking_scheme_items (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  position integer not null check (position > 0),
  item_type text not null default 'method' check (item_type in ('method', 'alternative', 'note')),
  method_label text,
  criterion_markdown text not null check (length(trim(criterion_markdown)) > 0),
  mark_value numeric(8, 2) not null check (mark_value >= 0),
  award_note_markdown text,
  is_alternative boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, position)
);

create table if not exists public.video_sources (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  question_id uuid,
  provider text not null check (provider in ('youtube', 'tiktok', 'facebook', 'other')),
  original_url text not null check (original_url ~* '^https://'),
  embed_url text check (embed_url is null or embed_url ~* '^https://'),
  is_primary boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_sources_question_paper_fkey
    foreign key (question_id, paper_id)
    references public.questions(id, paper_id)
    on delete cascade
);

create table if not exists public.site_settings (
  id boolean primary key default true check (id),
  site_name text not null default 'Siyana Maths',
  tagline text,
  whatsapp_number text,
  phone_number text,
  contact_email text,
  youtube_url text,
  tiktok_url text,
  facebook_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  email text,
  phone text,
  grade_level text,
  message text not null check (length(trim(message)) between 1 and 5000),
  consent_at timestamptz,
  honeypot_value text,
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'archived', 'spam')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists papers_public_catalog_idx
  on public.papers (status, exam_year_id, subject_id, paper_number, published_at desc);
create index if not exists papers_title_search_idx
  on public.papers using gin ((title || ' ' || coalesce(description, '')) gin_trgm_ops);
create index if not exists questions_paper_position_idx
  on public.questions (paper_id, position);
create index if not exists marking_scheme_question_position_idx
  on public.marking_scheme_items (question_id, position);
create index if not exists video_sources_paper_idx
  on public.video_sources (paper_id, position);
create index if not exists video_sources_question_idx
  on public.video_sources (question_id, position);
create index if not exists contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);

create unique index if not exists video_sources_paper_primary_idx
  on public.video_sources (paper_id)
  where question_id is null and is_primary;
create unique index if not exists video_sources_question_primary_idx
  on public.video_sources (question_id)
  where question_id is not null and is_primary;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_row_updated_at();
drop trigger if exists papers_set_updated_at on public.papers;
create trigger papers_set_updated_at
before update on public.papers
for each row execute function public.set_row_updated_at();
drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_row_updated_at();
drop trigger if exists answers_set_updated_at on public.answers;
create trigger answers_set_updated_at
before update on public.answers
for each row execute function public.set_row_updated_at();
drop trigger if exists marking_scheme_items_set_updated_at on public.marking_scheme_items;
create trigger marking_scheme_items_set_updated_at
before update on public.marking_scheme_items
for each row execute function public.set_row_updated_at();
drop trigger if exists video_sources_set_updated_at on public.video_sources;
create trigger video_sources_set_updated_at
before update on public.video_sources
for each row execute function public.set_row_updated_at();
drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function public.set_row_updated_at();
drop trigger if exists contact_messages_set_updated_at on public.contact_messages;
create trigger contact_messages_set_updated_at
before update on public.contact_messages
for each row execute function public.set_row_updated_at();

alter table public.profiles enable row level security;
alter table public.exam_levels enable row level security;
alter table public.subjects enable row level security;
alter table public.exam_years enable row level security;
alter table public.topics enable row level security;
alter table public.papers enable row level security;
alter table public.paper_topics enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.marking_scheme_items enable row level security;
alter table public.video_sources enable row level security;
alter table public.site_settings enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists users_read_own_profile on public.profiles;
create policy users_read_own_profile
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists public_read_active_levels on public.exam_levels;
create policy public_read_active_levels
on public.exam_levels for select to anon, authenticated
using (is_active);

drop policy if exists public_read_active_subjects on public.subjects;
create policy public_read_active_subjects
on public.subjects for select to anon, authenticated
using (is_active);

drop policy if exists public_read_exam_years on public.exam_years;
create policy public_read_exam_years
on public.exam_years for select to anon, authenticated
using (true);

drop policy if exists public_read_active_topics on public.topics;
create policy public_read_active_topics
on public.topics for select to anon, authenticated
using (is_active);

drop policy if exists public_read_published_papers on public.papers;
create policy public_read_published_papers
on public.papers for select to anon, authenticated
using (status = 'published' and published_at is not null);

drop policy if exists public_read_published_paper_topics on public.paper_topics;
create policy public_read_published_paper_topics
on public.paper_topics for select to anon, authenticated
using (
  exists (
    select 1 from public.papers p
    where p.id = paper_topics.paper_id
      and p.status = 'published'
      and p.published_at is not null
  )
);

drop policy if exists public_read_published_questions on public.questions;
create policy public_read_published_questions
on public.questions for select to anon, authenticated
using (
  exists (
    select 1 from public.papers p
    where p.id = questions.paper_id
      and p.status = 'published'
      and p.published_at is not null
  )
);

drop policy if exists public_read_published_answers on public.answers;
create policy public_read_published_answers
on public.answers for select to anon, authenticated
using (
  exists (
    select 1
    from public.questions q
    join public.papers p on p.id = q.paper_id
    where q.id = answers.question_id
      and p.status = 'published'
      and p.published_at is not null
  )
);

drop policy if exists public_read_published_marking_scheme on public.marking_scheme_items;
create policy public_read_published_marking_scheme
on public.marking_scheme_items for select to anon, authenticated
using (
  exists (
    select 1
    from public.questions q
    join public.papers p on p.id = q.paper_id
    where q.id = marking_scheme_items.question_id
      and p.status = 'published'
      and p.published_at is not null
  )
);

drop policy if exists public_read_published_video_sources on public.video_sources;
create policy public_read_published_video_sources
on public.video_sources for select to anon, authenticated
using (
  exists (
    select 1 from public.papers p
    where p.id = video_sources.paper_id
      and p.status = 'published'
      and p.published_at is not null
  )
);

drop policy if exists public_read_site_settings on public.site_settings;
create policy public_read_site_settings
on public.site_settings for select to anon, authenticated
using (true);

-- Contact messages intentionally have no anonymous insert/select policies.
-- The FastAPI service uses its protected backend path for contact submission.

grant usage on schema public to anon, authenticated;
grant select on public.exam_levels, public.subjects, public.exam_years, public.topics,
  public.papers, public.paper_topics, public.questions, public.answers,
  public.marking_scheme_items, public.video_sources, public.site_settings
  to anon, authenticated;
grant select on public.profiles to authenticated;
