-- O/L paper structure: two parts per paper with fixed question/selection rules.

create table if not exists public.paper_parts (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  part_code text not null check (part_code in ('A', 'B')),
  title text not null,
  part_type text not null check (part_type in ('short', 'structured', 'easy')),
  question_count integer not null check (question_count > 0),
  selection_limit integer not null check (selection_limit > 0),
  marks_per_question numeric(8, 2) not null check (marks_per_question > 0),
  total_marks numeric(8, 2) not null check (total_marks > 0),
  sort_order smallint not null default 1 check (sort_order > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (paper_id, part_code),
  check (selection_limit <= question_count)
);

create or replace function public.set_default_paper_total_marks()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if upper(regexp_replace(coalesce(new.paper_number, ''), '[^A-Za-z0-9]', '', 'g')) in ('I', '1', 'II', '2') then
    new.total_marks := 100;
  end if;
  return new;
end;
$$;

drop trigger if exists papers_set_default_total_marks on public.papers;
create trigger papers_set_default_total_marks
before insert on public.papers
for each row execute function public.set_default_paper_total_marks();

create or replace function public.create_default_paper_parts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text;
begin
  normalized_code := upper(regexp_replace(coalesce(new.paper_number, ''), '[^A-Za-z0-9]', '', 'g'));

  if normalized_code in ('I', '1') then
    insert into public.paper_parts (
      paper_id, part_code, title, part_type, question_count, selection_limit,
      marks_per_question, total_marks, sort_order
    ) values
      (new.id, 'A', 'Part A — Short questions', 'short', 25, 25, 2, 50, 1),
      (new.id, 'B', 'Part B — Structured questions', 'structured', 5, 5, 10, 50, 2)
    on conflict (paper_id, part_code) do nothing;
  elsif normalized_code in ('II', '2') then
    insert into public.paper_parts (
      paper_id, part_code, title, part_type, question_count, selection_limit,
      marks_per_question, total_marks, sort_order
    ) values
      (new.id, 'A', 'Part A — Easy questions', 'easy', 6, 5, 10, 50, 1),
      (new.id, 'B', 'Part B — Easy questions', 'easy', 6, 5, 10, 50, 2)
    on conflict (paper_id, part_code) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists papers_create_default_parts on public.papers;
create trigger papers_create_default_parts
after insert on public.papers
for each row execute function public.create_default_paper_parts();

-- Backfill parts for papers created before this migration.
-- Paper I -> A: 25 short (2 marks), B: 5 structured (10 marks).
-- Paper II -> A/B: 6 easy (10 marks), answer any 5.
insert into public.paper_parts (
  paper_id, part_code, title, part_type, question_count, selection_limit,
  marks_per_question, total_marks, sort_order
)
select
  p.id,
  'A',
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 'Part A — Short questions'
    else 'Part A — Easy questions'
  end,
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 'short'
    else 'easy'
  end,
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 25
    else 6
  end,
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 25
    else 5
  end,
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 2
    else 10
  end,
  50,
  1
from public.papers p
where upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1', 'II', '2')
on conflict (paper_id, part_code) do nothing;

insert into public.paper_parts (
  paper_id, part_code, title, part_type, question_count, selection_limit,
  marks_per_question, total_marks, sort_order
)
select
  p.id,
  'B',
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 'Part B — Structured questions'
    else 'Part B — Easy questions'
  end,
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 'structured'
    else 'easy'
  end,
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 5
    else 6
  end,
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 5
    else 5
  end,
  case
    when upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      then 10
    else 10
  end,
  50,
  2
from public.papers p
where upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1', 'II', '2')
on conflict (paper_id, part_code) do nothing;

update public.papers
set total_marks = 100
where upper(regexp_replace(coalesce(paper_number, ''), '[^A-Za-z0-9]', '', 'g')) in ('I', '1', 'II', '2');

alter table public.questions
  add column if not exists part_id uuid references public.paper_parts(id) on delete cascade;

-- Best-effort backfill for questions created before parts existed.
update public.questions q
set part_id = pp.id
from public.papers p
join public.paper_parts pp on pp.paper_id = p.id
where q.paper_id = p.id
  and q.part_id is null
  and (
    (upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('I', '1')
      and ((pp.part_code = 'A' and q.position <= 25) or (pp.part_code = 'B' and q.position > 25)))
    or
    (upper(regexp_replace(p.paper_number, '[^A-Za-z0-9]', '', 'g')) in ('II', '2')
      and ((pp.part_code = 'A' and q.position <= 6) or (pp.part_code = 'B' and q.position > 6)))
  );

alter table public.questions
  drop constraint if exists questions_paper_id_position_key;
create unique index if not exists questions_part_position_idx
  on public.questions (part_id, position)
  where part_id is not null;

drop trigger if exists paper_parts_set_updated_at on public.paper_parts;
create trigger paper_parts_set_updated_at
before update on public.paper_parts
for each row execute function public.set_row_updated_at();

alter table public.paper_parts enable row level security;

drop policy if exists public_read_published_paper_parts on public.paper_parts;
create policy public_read_published_paper_parts
on public.paper_parts for select to anon, authenticated
using (
  exists (
    select 1 from public.papers p
    where p.id = paper_parts.paper_id
      and p.status = 'published'
      and p.published_at is not null
  )
);

drop policy if exists public_read_published_questions_with_parts on public.questions;
drop policy if exists public_read_published_questions on public.questions;
create policy public_read_published_questions
on public.questions for select to anon, authenticated
using (
  part_id is not null
  and exists (
    select 1
    from public.papers p
    where p.id = questions.paper_id
      and p.status = 'published'
      and p.published_at is not null
  )
);

grant select on public.paper_parts to anon, authenticated;
