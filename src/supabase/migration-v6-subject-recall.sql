begin;

alter table public.subjects drop constraint if exists subjects_level_check;
alter table public.subjects add constraint subjects_level_check check (char_length(btrim(level)) between 1 and 120);

create table if not exists public.recall_lessons (
  id uuid primary key default gen_random_uuid(),
  subject_id bigint not null references public.subjects(id),
  title text not null check (char_length(btrim(title)) between 2 and 120),
  introduction text not null default '' check (char_length(introduction) <= 10000),
  is_published boolean not null default false,
  revision integer not null default 1,
  created_at timestamptz not null default now()
);
create table if not exists public.recall_cards (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.recall_lessons(id) on delete cascade,
  section_id uuid not null default gen_random_uuid(),
  heading text not null check (char_length(btrim(heading)) between 2 and 120),
  kind text not null check (kind in ('definition', 'terminology', 'importance', 'features', 'other')),
  prompt text not null check (char_length(btrim(prompt)) between 2 and 400),
  answer text not null check (char_length(btrim(answer)) between 1 and 1000),
  explanation text not null default '' check (char_length(explanation) <= 2000),
  position smallint not null check (position between 0 and 49)
);
create table if not exists public.recall_progress (
  student_name text not null check (char_length(btrim(student_name)) between 1 and 80),
  school_name text not null default '' check (char_length(school_name) <= 120),
  card_id uuid not null references public.recall_cards(id) on delete cascade,
  step smallint not null default 0 check (step between 0 and 6),
  due_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  first_attempts integer not null default 0,
  first_correct integer not null default 0,
  delayed_attempts integer not null default 0,
  delayed_correct integer not null default 0,
  delayed_streak integer not null default 0,
  needs_delayed_check boolean not null default true,
  review_id uuid,
  review_started_at timestamptz,
  review_delayed boolean not null default false,
  review_done boolean not null default true,
  attempt_ids uuid[] not null default '{}',
  attempt_results boolean[] not null default '{}',
  primary key (student_name, school_name, card_id),
  check (cardinality(attempt_ids) = cardinality(attempt_results) and cardinality(attempt_ids) <= 5)
);
-- Existing installs keep their column default, so align it with instant first checks.
alter table public.recall_progress alter column due_at set default now();
-- Existing installs need the section grouping and the narrowed kind list applied in place.
alter table public.recall_cards add column if not exists section_id uuid;
update public.recall_cards set section_id = id where section_id is null;
alter table public.recall_cards alter column section_id set default gen_random_uuid();
alter table public.recall_cards alter column section_id set not null;
alter table public.recall_cards drop constraint if exists recall_cards_kind_check;
alter table public.recall_cards add constraint recall_cards_kind_check check (kind in ('definition', 'terminology', 'importance', 'features', 'other'));
create index if not exists recall_cards_section_idx on public.recall_cards(section_id);
create index if not exists recall_lessons_subject_idx on public.recall_lessons(subject_id);
create index if not exists recall_cards_lesson_idx on public.recall_cards(lesson_id, position);
create index if not exists recall_progress_due_idx on public.recall_progress(student_name, school_name, due_at);
create index if not exists recall_progress_card_idx on public.recall_progress(card_id);
create unique index if not exists recall_progress_review_idx on public.recall_progress(review_id) where review_id is not null;

alter table public.recall_lessons enable row level security;
alter table public.recall_cards enable row level security;
alter table public.recall_progress enable row level security;
revoke all on public.recall_lessons, public.recall_cards, public.recall_progress from public, anon, authenticated;
grant all on public.recall_lessons, public.recall_cards, public.recall_progress to service_role;

create or replace function public.recall_normalize(p_text text)
returns text language sql immutable strict set search_path = public as $$
  select lower(btrim(regexp_replace(replace(p_text, chr(160), ' '), '[[:space:]]+', ' ', 'g')));
$$;

create or replace function public.recall_card_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.lesson_id is distinct from old.lesson_id then raise exception 'A section cannot move between lessons.'; end if;
  if public.recall_normalize(new.answer) is distinct from public.recall_normalize(old.answer)
    or new.prompt is distinct from old.prompt then
    delete from public.recall_progress where card_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists recall_card_changed on public.recall_cards;
create trigger recall_card_changed before update on public.recall_cards
  for each row execute function public.recall_card_changed();

create or replace function public.save_recall_lesson(
  p_id uuid, p_subject_id bigint, p_title text, p_introduction text,
  p_published boolean, p_revision integer, p_cards jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_revision integer; v_card jsonb; v_ids uuid[] := '{}'; v_position integer := 0;
begin
  if jsonb_typeof(p_cards) is distinct from 'array' or jsonb_array_length(p_cards) > 50 then
    raise exception 'Use up to 50 short sections per lesson.';
  end if;
  if p_published and jsonb_array_length(p_cards) = 0 then raise exception 'Add a section before publishing.'; end if;
  if p_id is null then
    insert into public.recall_lessons(subject_id, title, introduction, is_published)
      values(p_subject_id, p_title, p_introduction, p_published) returning id into v_id;
  else
    select revision into v_revision from public.recall_lessons where id = p_id for update;
    if not found then raise exception 'Lesson not found.'; end if;
    if v_revision is distinct from p_revision then raise exception 'This lesson changed. Reload before saving.'; end if;
    v_id := p_id;
    update public.recall_lessons set subject_id = p_subject_id, title = p_title,
      introduction = p_introduction, is_published = p_published, revision = revision + 1 where id = v_id;
  end if;
  for v_card in select value from jsonb_array_elements(p_cards) loop
    if (v_card->>'id')::uuid = any(v_ids) then raise exception 'Section IDs must be unique.'; end if;
    if exists(select 1 from public.recall_cards where id = (v_card->>'id')::uuid and lesson_id <> v_id) then
      raise exception 'This section belongs to another lesson.';
    end if;
    insert into public.recall_cards(id, lesson_id, section_id, heading, kind, prompt, answer, explanation, position)
      values((v_card->>'id')::uuid, v_id, coalesce((v_card->>'section_id')::uuid, (v_card->>'id')::uuid),
        v_card->>'heading', v_card->>'kind', v_card->>'prompt', v_card->>'answer',
        coalesce(v_card->>'explanation', ''), v_position)
      on conflict(id) do update set heading = excluded.heading, kind = excluded.kind,
        section_id = coalesce((v_card->>'section_id')::uuid, public.recall_cards.section_id),
        prompt = excluded.prompt, answer = excluded.answer, explanation = excluded.explanation, position = excluded.position;
    v_ids := array_append(v_ids, (v_card->>'id')::uuid);
    v_position := v_position + 1;
  end loop;
  delete from public.recall_cards where lesson_id = v_id and not(id = any(v_ids));
  return v_id;
end;
$$;

create or replace function public.recall_lesson_stats(p_student text, p_school text)
returns table(id uuid, title text, introduction text, subject_id bigint, subject_name text, level text,
  total_cards bigint, studied_cards bigint, due_cards bigint, retained_cards bigint,
  first_attempts bigint, first_correct bigint, delayed_attempts bigint, delayed_correct bigint,
  practised_today bigint, next_due_at timestamptz)
language sql stable security definer set search_path = public as $$
  select l.id, l.title, l.introduction, l.subject_id, s.name::text, s.level::text,
    count(c.id), count(p.card_id), count(p.card_id) filter(where p.due_at <= now()),
    count(p.card_id) filter(where p.delayed_streak >= 3 and not p.needs_delayed_check and p.due_at > now()),
    coalesce(sum(p.first_attempts), 0)::bigint, coalesce(sum(p.first_correct), 0)::bigint,
    coalesce(sum(p.delayed_attempts), 0)::bigint, coalesce(sum(p.delayed_correct), 0)::bigint,
    count(p.card_id) filter(where (p.last_reviewed_at at time zone 'Africa/Lagos')::date = (now() at time zone 'Africa/Lagos')::date),
    min(p.due_at)
  from public.recall_lessons l join public.subjects s on s.id = l.subject_id
  left join public.recall_cards c on c.lesson_id = l.id
  left join public.recall_progress p on p.card_id = c.id and p.student_name = btrim(p_student) and p.school_name = btrim(p_school)
  where l.is_published group by l.id, s.name, s.level;
$$;

create or replace function public.recall_library(p_student text, p_school text,
  p_subject_id bigint default null, p_lesson_id uuid default null, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = public as $$
  with all_lessons as materialized (select * from public.recall_lesson_stats(p_student, p_school)),
  filtered as (select * from all_lessons where (p_subject_id is null or subject_id = p_subject_id)
    and (p_lesson_id is null or id = p_lesson_id)),
  page as (select * from filtered order by subject_name, title, id limit 12 offset greatest(p_offset, 0))
  select jsonb_build_object(
    'lessons', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb),
    'count', (select count(*) from filtered),
    'subjects', coalesce((select jsonb_agg(to_jsonb(s)) from (
      select distinct subject_id as id, subject_name as name, level from all_lessons order by name, level
    ) s), '[]'::jsonb),
    'stats', (select jsonb_build_object('total_cards', coalesce(sum(total_cards), 0),
      'studied_cards', coalesce(sum(studied_cards), 0), 'due_cards', coalesce(sum(due_cards), 0),
      'retained_cards', coalesce(sum(retained_cards), 0), 'first_attempts', coalesce(sum(first_attempts), 0),
      'first_correct', coalesce(sum(first_correct), 0), 'delayed_attempts', coalesce(sum(delayed_attempts), 0),
      'delayed_correct', coalesce(sum(delayed_correct), 0), 'practised_today', coalesce(sum(practised_today), 0),
      'next_due_at', min(next_due_at)) from all_lessons));
$$;

create or replace function public.read_recall_lesson(p_student text, p_school text, p_lesson_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cards jsonb;
begin
  if char_length(btrim(p_student)) not between 1 and 80 or p_student is null or p_school is null or char_length(p_school) > 120 then
    raise exception 'Enter your nickname and school before practising.';
  end if;
  if not exists(select 1 from public.recall_lessons where id = p_lesson_id and is_published) then
    raise exception 'This lesson is not available.';
  end if;
  insert into public.recall_progress(student_name, school_name, card_id)
    select btrim(p_student), btrim(p_school), id from public.recall_cards where lesson_id = p_lesson_id order by id
  on conflict(student_name, school_name, card_id) do update set
    step = 0, last_seen_at = now(), due_at = now(),
    needs_delayed_check = true, review_id = null, review_done = true, attempt_ids = '{}', attempt_results = '{}';
  select coalesce(jsonb_agg(to_jsonb(c) order by position, id), '[]'::jsonb) into v_cards
    from public.recall_cards c where lesson_id = p_lesson_id;
  return jsonb_build_object('cards', v_cards, 'due_at', now());
end;
$$;

create or replace function public.begin_recall_review(p_student text, p_school text,
  p_lesson_id uuid default null, p_previous_card_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_progress public.recall_progress; v_card record; v_due timestamptz;
begin
  if char_length(btrim(p_student)) not between 1 and 80 or p_student is null or p_school is null or char_length(p_school) > 120 then
    raise exception 'Enter your nickname and school before practising.';
  end if;
  if p_lesson_id is not null and not exists(select 1 from public.recall_lessons where id = p_lesson_id and is_published) then
    raise exception 'This lesson is not available.';
  end if;
  select p.* into v_progress from public.recall_progress p
    join public.recall_cards c on c.id = p.card_id join public.recall_lessons l on l.id = c.lesson_id
    where p.student_name = btrim(p_student) and p.school_name = btrim(p_school) and p.due_at <= now()
      and l.is_published and (p_lesson_id is null or l.id = p_lesson_id)
    order by case when p.card_id <> p_previous_card_id and c.section_id = (select section_id from public.recall_cards where id = p_previous_card_id) then 0 else 1 end,
      case when p.card_id = p_previous_card_id then 1 else 0 end, date_trunc('day', p.due_at), random()
    limit 1 for update of p skip locked;
  if not found then
    select min(p.due_at) into v_due from public.recall_progress p
      join public.recall_cards c on c.id = p.card_id join public.recall_lessons l on l.id = c.lesson_id
      where p.student_name = btrim(p_student) and p.school_name = btrim(p_school)
        and l.is_published and (p_lesson_id is null or l.id = p_lesson_id);
    return jsonb_build_object('card', null, 'next_due_at', v_due, 'server_now', now());
  end if;
  if v_progress.review_id is null or v_progress.review_done or cardinality(v_progress.attempt_ids) > 0
    or v_progress.review_started_at < now() - interval '30 minutes' then
    update public.recall_progress set review_id = gen_random_uuid(), review_started_at = now(),
      review_delayed = last_seen_at <= now() - interval '24 hours', review_done = false,
      attempt_ids = '{}', attempt_results = '{}'
      where student_name = btrim(p_student) and school_name = btrim(p_school) and card_id = v_progress.card_id
      returning * into v_progress;
  end if;
  select c.id, c.lesson_id, c.heading, c.kind, c.prompt, l.title as lesson_title, s.name as subject_name
    into v_card from public.recall_cards c join public.recall_lessons l on l.id = c.lesson_id
    join public.subjects s on s.id = l.subject_id where c.id = v_progress.card_id;
  return jsonb_build_object('card', to_jsonb(v_card) || jsonb_build_object(
    'review_id', v_progress.review_id, 'delayed', v_progress.review_delayed), 'next_due_at', null, 'server_now', now());
end;
$$;

create or replace function public.submit_recall_review(p_student text, p_school text,
  p_review_id uuid, p_request_id uuid, p_answer text, p_reveal boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_progress public.recall_progress; v_answer text; v_correct boolean; v_first boolean;
  v_delayed boolean; v_index integer;
  v_intervals interval[] := array[interval '10 minutes', interval '1 day', interval '3 days', interval '7 days', interval '14 days', interval '30 days'];
begin
  if p_request_id is null or p_review_id is null then raise exception 'Missing review.'; end if;
  if p_answer is null or p_reveal is null or char_length(p_answer) > 2000 or
    (not p_reveal and public.recall_normalize(p_answer) = '') then raise exception 'Type an answer or choose to see it.'; end if;
  select p.* into v_progress from public.recall_progress p
    join public.recall_cards c on c.id = p.card_id join public.recall_lessons l on l.id = c.lesson_id
    where p.student_name = btrim(p_student) and p.school_name = btrim(p_school) and p.review_id = p_review_id and l.is_published
    for update of p;
  if not found then raise exception 'This review changed. Load the next question.'; end if;
  select answer into v_answer from public.recall_cards where id = v_progress.card_id;
  v_index := array_position(v_progress.attempt_ids, p_request_id);
  if v_index is not null then
    v_correct := v_progress.attempt_results[v_index]; v_first := v_index = 1;
    v_delayed := v_first and v_progress.review_delayed;
  else
    if v_progress.review_done then raise exception 'This review is complete. Load the next question.'; end if;
    v_correct := not p_reveal and public.recall_normalize(p_answer) = public.recall_normalize(v_answer);
    v_first := cardinality(v_progress.attempt_ids) = 0; v_delayed := v_first and v_progress.review_delayed;
    update public.recall_progress set
      first_attempts = first_attempts + v_first::integer,
      first_correct = first_correct + (v_first and v_correct)::integer,
      delayed_attempts = delayed_attempts + v_delayed::integer,
      delayed_correct = delayed_correct + (v_delayed and v_correct)::integer,
      delayed_streak = case when not v_correct then 0 when v_delayed then delayed_streak + 1 else delayed_streak end,
      needs_delayed_check = case when not v_correct then true when v_delayed then false else needs_delayed_check end,
      step = case when v_correct and v_first then least(step + 1, 6) else 0 end,
      due_at = now() + case when v_correct and v_first then v_intervals[least(step + 1, 6)] else interval '2 minutes' end,
      last_seen_at = now(), last_reviewed_at = now(), review_done = v_correct or cardinality(attempt_ids) >= 4,
      attempt_ids = array_append(attempt_ids, p_request_id), attempt_results = array_append(attempt_results, v_correct)
      where student_name = btrim(p_student) and school_name = btrim(p_school) and card_id = v_progress.card_id
      returning * into v_progress;
  end if;
  return jsonb_build_object('correct', v_correct, 'expected_answer', v_answer, 'first_attempt', v_first,
    'delayed', v_delayed, 'next_due_at', v_progress.due_at, 'review_finished', v_progress.review_done);
end;
$$;

create or replace function public.recall_lesson_report(p_lesson_id uuid, p_offset integer default 0)
returns table(student_name text, school_name text, total_cards bigint, studied_cards bigint,
  due_cards bigint, retained_cards bigint, first_attempts bigint, first_correct bigint,
  delayed_attempts bigint, delayed_correct bigint, last_reviewed_at timestamptz)
language sql stable security definer set search_path = public as $$
  with pupils as (select distinct p.student_name, p.school_name from public.recall_progress p
    join public.recall_cards c on c.id = p.card_id where c.lesson_id = p_lesson_id)
  select s.student_name, s.school_name, count(c.id), count(p.card_id), count(p.card_id) filter(where p.due_at <= now()),
    count(p.card_id) filter(where p.delayed_streak >= 3 and not p.needs_delayed_check and p.due_at > now()),
    coalesce(sum(p.first_attempts), 0)::bigint, coalesce(sum(p.first_correct), 0)::bigint,
    coalesce(sum(p.delayed_attempts), 0)::bigint, coalesce(sum(p.delayed_correct), 0)::bigint, max(p.last_reviewed_at)
    from pupils s join public.recall_cards c on c.lesson_id = p_lesson_id
    left join public.recall_progress p on p.card_id = c.id and p.student_name = s.student_name and p.school_name = s.school_name
    group by s.student_name, s.school_name order by s.student_name, s.school_name limit 51 offset greatest(p_offset, 0);
$$;

revoke all on function public.recall_normalize(text), public.recall_card_changed(),
  public.save_recall_lesson(uuid, bigint, text, text, boolean, integer, jsonb),
  public.recall_lesson_stats(text, text), public.recall_library(text, text, bigint, uuid, integer),
  public.read_recall_lesson(text, text, uuid), public.begin_recall_review(text, text, uuid, uuid),
  public.submit_recall_review(text, text, uuid, uuid, text, boolean), public.recall_lesson_report(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.recall_library(text, text, bigint, uuid, integer),
  public.read_recall_lesson(text, text, uuid), public.begin_recall_review(text, text, uuid, uuid),
  public.submit_recall_review(text, text, uuid, uuid, text, boolean) to anon, authenticated;
grant execute on function public.save_recall_lesson(uuid, bigint, text, text, boolean, integer, jsonb),
  public.recall_lesson_report(uuid, integer) to service_role;
notify pgrst, 'reload schema';
commit;
