-- Images (graphs, sketches, diagrams) attached to questions and answers.

-- Public-read bucket for published learning content. Uploads are only possible
-- with the service-role key, which never leaves the backend.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'content-media',
  'content-media',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade,
  answer_id uuid references public.answers(id) on delete cascade,
  storage_path text not null unique,
  public_url text not null,
  caption text,
  alt_text text,
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0),
  position smallint not null default 1 check (position > 0),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  -- Exactly one owner, so an asset can never be orphaned or double-attached.
  constraint media_assets_single_owner check (
    (case when question_id is not null then 1 else 0 end)
    + (case when answer_id is not null then 1 else 0 end) = 1
  )
);

create index if not exists media_assets_question_idx on public.media_assets (question_id, position);
create index if not exists media_assets_answer_idx on public.media_assets (answer_id, position);

alter table public.media_assets enable row level security;

-- Readable only when the owning question belongs to a published paper.
drop policy if exists public_read_media_assets on public.media_assets;
create policy public_read_media_assets
on public.media_assets for select to anon, authenticated
using (
  (
    question_id is not null
    and exists (
      select 1
      from public.questions q
      join public.papers p on p.id = q.paper_id
      where q.id = media_assets.question_id
        and p.status = 'published'
        and p.published_at is not null
    )
  )
  or
  (
    answer_id is not null
    and exists (
      select 1
      from public.answers a
      join public.questions q on q.id = a.question_id
      join public.papers p on p.id = q.paper_id
      where a.id = media_assets.answer_id
        and p.status = 'published'
        and p.published_at is not null
    )
  )
);

-- No public insert or update policy: uploads go through FastAPI only.
grant select on public.media_assets to anon, authenticated;

-- The bucket itself is public-read, so stored URLs render without a token.
drop policy if exists public_read_content_media on storage.objects;
create policy public_read_content_media
on storage.objects for select to anon, authenticated
using (bucket_id = 'content-media');
