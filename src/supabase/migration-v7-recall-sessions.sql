-- Apply after migration-v6-subject-recall.sql. Safe to rerun; existing notes and scores are preserved.
begin;

alter table public.recall_cards drop constraint if exists recall_cards_kind_check;
alter table public.recall_cards add constraint recall_cards_kind_check
  check (kind in ('definition', 'terminology', 'importance', 'features', 'functions', 'other'));
alter table public.recall_cards add column if not exists answer_format text not null default 'paragraph';
alter table public.recall_cards drop constraint if exists recall_cards_answer_format_check;
alter table public.recall_cards add constraint recall_cards_answer_format_check check (answer_format in ('paragraph', 'list'));
alter table public.recall_progress add column if not exists review_scheduled boolean not null default true;
alter table public.recall_progress add column if not exists last_first_correct boolean;
update public.recall_progress set last_first_correct = attempt_results[1]
  where last_first_correct is null and cardinality(attempt_results) > 0;

-- A bounded, resumable session per learning identity. Answers remain in recall_cards;
-- only the current feedback is retained here, alongside one first-answer result per question.
create table if not exists public.recall_sessions (
  student_name text not null check (char_length(btrim(student_name)) between 1 and 80),
  school_name text not null default '' check (char_length(school_name) <= 120),
  id uuid not null default gen_random_uuid() unique,
  mode text not null default 'due' check (mode in ('due', 'note', 'lesson', 'master')),
  title text not null default '',
  lesson_id uuid,
  section_id uuid,
  cards jsonb not null default '[]' check (jsonb_typeof(cards) = 'array'),
  position integer not null default 0 check (position >= 0),
  results jsonb not null default '[]' check (jsonb_typeof(results) = 'array'),
  review_id uuid,
  feedback jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_name, school_name),
  check (position <= jsonb_array_length(cards)),
  check (jsonb_array_length(results) <= jsonb_array_length(cards))
);
alter table public.recall_sessions enable row level security;
revoke all on public.recall_sessions from public, anon, authenticated;
grant all on public.recall_sessions to service_role;

create or replace function public.recall_card_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.lesson_id is distinct from old.lesson_id then raise exception 'A section cannot move between lessons.'; end if;
  if public.recall_normalize(new.answer) is distinct from public.recall_normalize(old.answer)
    or public.recall_normalize(new.prompt) is distinct from public.recall_normalize(old.prompt)
    or new.answer_format is distinct from old.answer_format then
    delete from public.recall_progress where card_id = new.id;
  end if;
  return new;
end;
$$;

create or replace function public.save_recall_lesson(
  p_id uuid, p_subject_id bigint, p_title text, p_introduction text,
  p_published boolean, p_revision integer, p_cards jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_revision integer; v_card jsonb; v_ids uuid[] := '{}'; v_position integer := 0;
  v_section uuid; v_previous_section uuid; v_sections uuid[] := '{}'; v_format text; v_items text[];
begin
  if jsonb_typeof(p_cards) is distinct from 'array' or jsonb_array_length(p_cards) > 50 then
    raise exception 'Use up to 50 content pieces per lesson.';
  end if;
  if p_published and jsonb_array_length(p_cards) = 0 then raise exception 'Add a topic before publishing.'; end if;
  if exists(select 1 from jsonb_array_elements(p_cards) group by coalesce(value->>'section_id', value->>'id')
    having count(distinct btrim(value->>'heading')) > 1) then
    raise exception 'Content in the same topic must use the same heading.';
  end if;
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
    if (v_card->>'id')::uuid = any(v_ids) then raise exception 'Content IDs must be unique.'; end if;
    if exists(select 1 from public.recall_cards where id = (v_card->>'id')::uuid and lesson_id <> v_id) then
      raise exception 'This content belongs to another lesson.';
    end if;
    v_section := coalesce((v_card->>'section_id')::uuid, (v_card->>'id')::uuid);
    if v_section is distinct from v_previous_section then
      if v_section = any(v_sections) then raise exception 'Keep each topic''s content together.'; end if;
      v_sections := array_append(v_sections, v_section);
      v_previous_section := v_section;
    end if;
    v_format := coalesce(v_card->>'answer_format', 'paragraph');
    if v_format = 'list' then
      v_items := regexp_split_to_array(v_card->>'answer', E'\n');
      if cardinality(v_items) not between 1 and 20 or exists(select 1 from unnest(v_items) item where public.recall_normalize(item) = '') then
        raise exception 'A list needs 1 to 20 non-empty items, one per line.';
      end if;
    end if;
    insert into public.recall_cards(id, lesson_id, section_id, heading, kind, prompt, answer, explanation, answer_format, position)
      values((v_card->>'id')::uuid, v_id, v_section, v_card->>'heading', v_card->>'kind',
        v_card->>'prompt', v_card->>'answer', coalesce(v_card->>'explanation', ''), v_format, v_position)
      on conflict(id) do update set heading = excluded.heading, kind = excluded.kind,
        section_id = excluded.section_id, prompt = excluded.prompt, answer = excluded.answer,
        explanation = excluded.explanation, answer_format = excluded.answer_format, position = excluded.position;
    v_ids := array_append(v_ids, (v_card->>'id')::uuid);
    v_position := v_position + 1;
  end loop;
  delete from public.recall_cards where lesson_id = v_id and not(id = any(v_ids));
  return v_id;
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
      review_delayed = last_seen_at <= now() - interval '24 hours', review_scheduled = true, review_done = false,
      attempt_ids = '{}', attempt_results = '{}'
      where student_name = btrim(p_student) and school_name = btrim(p_school) and card_id = v_progress.card_id
      returning * into v_progress;
  end if;
  select c.id, c.lesson_id, c.section_id, c.heading, c.kind, c.prompt, c.answer_format, l.title as lesson_title, s.name as subject_name
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
      last_first_correct = case when v_first then v_correct else last_first_correct end,
      delayed_attempts = delayed_attempts + v_delayed::integer,
      delayed_correct = delayed_correct + (v_delayed and v_correct)::integer,
      delayed_streak = case when not v_correct then 0 when v_delayed then delayed_streak + 1 else delayed_streak end,
      needs_delayed_check = case when not v_correct or not review_scheduled then true when v_delayed then false else needs_delayed_check end,
      step = case when not v_correct or not v_first then 0 when review_scheduled then least(step + 1, 6) else step end,
      due_at = case when not v_correct or not v_first then now() + interval '2 minutes'
        when review_scheduled then now() + v_intervals[least(step + 1, 6)] else due_at end,
      last_seen_at = now(), last_reviewed_at = now(), review_done = v_correct or cardinality(attempt_ids) >= 4,
      attempt_ids = array_append(attempt_ids, p_request_id), attempt_results = array_append(attempt_results, v_correct)
      where student_name = btrim(p_student) and school_name = btrim(p_school) and card_id = v_progress.card_id
      returning * into v_progress;
  end if;
  return jsonb_build_object('correct', v_correct, 'expected_answer', v_answer, 'first_attempt', v_first,
    'delayed', v_delayed, 'scheduled', v_progress.review_scheduled,
    'next_due_at', v_progress.due_at, 'review_finished', v_progress.review_done);
end;
$$;

create or replace function public.recall_card_signature(p_card public.recall_cards)
returns text language sql immutable strict set search_path = public as $$
  select md5(jsonb_build_array(p_card.lesson_id, p_card.section_id, p_card.kind,
    public.recall_normalize(p_card.prompt), public.recall_normalize(p_card.answer), p_card.answer_format)::text);
$$;

-- Internal state reader also starts the current question. It never sends an unseen model answer.
create or replace function public.recall_session_state(p_student text, p_school text, p_session_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_session public.recall_sessions; v_card public.recall_cards; v_progress public.recall_progress;
  v_base jsonb; v_question jsonb;
begin
  if p_student is null or char_length(btrim(p_student)) not between 1 and 80 or p_school is null or char_length(p_school) > 120 then
    raise exception 'Enter your nickname and school before practising.';
  end if;
  select * into v_session from public.recall_sessions where student_name = btrim(p_student)
    and school_name = btrim(p_school) and id = p_session_id for update;
  if not found then raise exception 'This session is no longer active. Start a new practice session.'; end if;
  v_base := jsonb_build_object('id', v_session.id, 'mode', v_session.mode, 'title', v_session.title,
    'position', v_session.position, 'total', jsonb_array_length(v_session.cards),
    'completed', jsonb_array_length(v_session.results), 'results', v_session.results, 'feedback', v_session.feedback);
  if v_session.position >= jsonb_array_length(v_session.cards) then
    return v_base || jsonb_build_object('status', 'complete', 'card', null);
  end if;
  select c.* into v_card from public.recall_cards c join public.recall_lessons l on l.id = c.lesson_id
    where c.id = (v_session.cards->v_session.position->>'id')::uuid and l.is_published;
  if not found or public.recall_card_signature(v_card) is distinct from v_session.cards->v_session.position->>'signature' then
    return v_base || jsonb_build_object('status', 'changed', 'card', null, 'feedback', null);
  end if;
  select * into v_progress from public.recall_progress where student_name = btrim(p_student)
    and school_name = btrim(p_school) and card_id = v_card.id for update;
  if not found then return v_base || jsonb_build_object('status', 'changed', 'card', null, 'feedback', null); end if;
  if v_session.review_id is null then
    update public.recall_progress set review_id = gen_random_uuid(), review_started_at = now(),
      review_scheduled = due_at <= now(), review_delayed = due_at <= now() and last_seen_at <= now() - interval '24 hours',
      review_done = false, attempt_ids = '{}', attempt_results = '{}'
      where student_name = btrim(p_student) and school_name = btrim(p_school) and card_id = v_card.id returning * into v_progress;
    update public.recall_sessions set review_id = v_progress.review_id where id = v_session.id;
  elsif v_progress.review_id is distinct from v_session.review_id
    or (v_session.feedback is null and cardinality(v_progress.attempt_ids) > 0) then
    return v_base || jsonb_build_object('status', 'changed', 'card', null, 'feedback', null);
  end if;
  select jsonb_build_object('id', v_card.id, 'section_id', v_card.section_id, 'heading', v_card.heading,
    'kind', v_card.kind, 'prompt', v_card.prompt, 'answer_format', v_card.answer_format,
    'item_count', case when v_card.answer_format = 'list' then cardinality(regexp_split_to_array(v_card.answer, E'\n')) else 0 end,
    'lesson_id', l.id, 'lesson_title', l.title, 'subject_name', s.name, 'review_id', v_progress.review_id,
    'delayed', v_progress.review_delayed, 'scheduled', v_progress.review_scheduled) into v_question
    from public.recall_lessons l join public.subjects s on s.id = l.subject_id where l.id = v_card.lesson_id;
  return v_base || jsonb_build_object('status', 'active', 'card', v_question);
end;
$$;

create or replace function public.start_recall_session(p_student text, p_school text, p_session_id uuid,
  p_mode text, p_lesson_id uuid default null, p_section_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_session public.recall_sessions; v_cards jsonb; v_title text;
begin
  if p_student is null or char_length(btrim(p_student)) not between 1 and 80 or p_school is null or char_length(p_school) > 120 then
    raise exception 'Enter your nickname and school before practising.';
  end if;
  if p_session_id is null or p_mode is null or p_mode not in ('due', 'note', 'lesson', 'master')
    or (p_mode in ('lesson', 'note') and p_lesson_id is null)
    or (p_mode = 'note' and p_section_id is null)
    or (p_mode <> 'note' and p_section_id is not null)
    or (p_mode in ('due', 'master') and p_lesson_id is not null) then raise exception 'Choose a valid recall session.'; end if;
  insert into public.recall_sessions(student_name, school_name) values(btrim(p_student), btrim(p_school)) on conflict do nothing;
  select * into v_session from public.recall_sessions where student_name = btrim(p_student) and school_name = btrim(p_school) for update;
  if v_session.id = p_session_id then return public.recall_session_state(p_student, p_school, p_session_id); end if;
  if p_mode in ('lesson', 'note') then
    select title into v_title from public.recall_lessons where id = p_lesson_id and is_published;
    if not found then raise exception 'This lesson is not available.'; end if;
    if p_mode = 'note' then
      select heading into v_title from public.recall_cards where lesson_id = p_lesson_id and section_id = p_section_id order by position limit 1;
      if not found then raise exception 'This note is not available.'; end if;
    end if;
  else v_title := case when p_mode = 'master' then 'Randomized master test' else 'Daily review' end;
  end if;
  select coalesce(jsonb_agg(snapshot order by due_day, shuffle, position, id), '[]'::jsonb) into v_cards from (
    select jsonb_build_object('id', c.id, 'signature', public.recall_card_signature(c)) as snapshot,
      case when p_mode = 'due' then date_trunc('day', p.due_at) end as due_day,
      case when p_mode in ('master', 'due') then random() end as shuffle, c.position, c.id
    from public.recall_progress p join public.recall_cards c on c.id = p.card_id join public.recall_lessons l on l.id = c.lesson_id
    where p.student_name = btrim(p_student) and p.school_name = btrim(p_school) and l.is_published
      and (p_mode <> 'due' or p.due_at <= now()) and (p_lesson_id is null or c.lesson_id = p_lesson_id)
      and (p_section_id is null or c.section_id = p_section_id)
  ) pool;
  update public.recall_progress set review_id = null, review_done = true
    where student_name = btrim(p_student) and school_name = btrim(p_school) and review_id = v_session.review_id;
  update public.recall_sessions set id = p_session_id, mode = p_mode, title = v_title, lesson_id = p_lesson_id, section_id = p_section_id,
    cards = v_cards, position = 0, results = '[]', review_id = null, feedback = null, created_at = now(), updated_at = now()
    where student_name = btrim(p_student) and school_name = btrim(p_school);
  return public.recall_session_state(p_student, p_school, p_session_id);
end;
$$;

create or replace function public.get_recall_session(p_student text, p_school text, p_session_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select public.recall_session_state(p_student, p_school, p_session_id);
$$;

create or replace function public.submit_recall_session(p_student text, p_school text, p_session_id uuid,
  p_review_id uuid, p_request_id uuid, p_answer text, p_reveal boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_state jsonb; v_result jsonb; v_card jsonb;
begin
  v_state := public.recall_session_state(p_student, p_school, p_session_id);
  if v_state->>'status' <> 'active' or (v_state->'card'->>'review_id')::uuid is distinct from p_review_id then
    raise exception 'This question changed. Reload the session before answering.';
  end if;
  v_card := v_state->'card';
  v_result := public.submit_recall_review(p_student, p_school, p_review_id, p_request_id, p_answer, p_reveal);
  update public.recall_sessions set
    results = case when jsonb_array_length(results) = position then results || jsonb_build_array(jsonb_build_object(
      'card_id', v_card->'id', 'section_id', v_card->'section_id', 'lesson_id', v_card->'lesson_id',
      'heading', v_card->'heading', 'lesson_title', v_card->'lesson_title', 'subject_name', v_card->'subject_name',
      'kind', v_card->'kind', 'prompt', v_card->'prompt', 'correct', v_result->'correct')) else results end,
    feedback = jsonb_build_object('result', v_result, 'answer', p_answer, 'revealed', p_reveal), updated_at = now()
    where id = p_session_id;
  return public.recall_session_state(p_student, p_school, p_session_id);
end;
$$;

create or replace function public.advance_recall_session(p_student text, p_school text, p_session_id uuid, p_position integer)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_state jsonb;
begin
  v_state := public.recall_session_state(p_student, p_school, p_session_id);
  if p_position is null or p_position < 0 or p_position > (v_state->>'position')::integer then raise exception 'Invalid question position.'; end if;
  -- Replayed Next requests return the new current question rather than skipping it.
  if p_position < (v_state->>'position')::integer or v_state->>'status' <> 'active' then return v_state; end if;
  if v_state->'feedback' = 'null'::jsonb then raise exception 'Check your answer before moving on.'; end if;
  update public.recall_progress set review_done = true where review_id = (v_state->'card'->>'review_id')::uuid;
  update public.recall_sessions set position = position + 1, review_id = null, feedback = null, updated_at = now() where id = p_session_id;
  return public.recall_session_state(p_student, p_school, p_session_id);
end;
$$;

create or replace function public.recall_note_insights(p_student text, p_school text)
returns jsonb language sql stable security definer set search_path = public as $$
  with notes as materialized (
    select c.section_id, c.lesson_id, min(c.heading) as heading, l.title as lesson_title, s.name as subject_name,
      count(*) as studied_cards, count(*) filter(where p.due_at <= now()) as due_cards,
      count(*) filter(where p.last_first_correct = false) as incorrect_cards,
      sum(p.first_attempts) as first_attempts, sum(p.first_correct) as first_correct, min(p.due_at) as next_due_at
    from public.recall_progress p join public.recall_cards c on c.id = p.card_id
    join public.recall_lessons l on l.id = c.lesson_id join public.subjects s on s.id = l.subject_id
    where p.student_name = btrim(p_student) and p.school_name = btrim(p_school) and l.is_published
    group by c.lesson_id, c.section_id, l.title, s.name
    having bool_or(p.last_first_correct = false or p.due_at <= now())
  ), priority as (select * from notes order by incorrect_cards desc, due_cards desc, next_due_at, lesson_id, section_id limit 8)
  select jsonb_build_object('review_notes', coalesce((select jsonb_agg(to_jsonb(priority)) from priority), '[]'::jsonb),
    'review_note_count', (select count(*) from notes));
$$;

create or replace function public.recall_library(p_student text, p_school text,
  p_subject_id bigint default null, p_lesson_id uuid default null, p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = public as $$
  with all_lessons as materialized (select * from public.recall_lesson_stats(p_student, p_school)),
  filtered as (select * from all_lessons where (p_subject_id is null or subject_id = p_subject_id) and (p_lesson_id is null or id = p_lesson_id)),
  page as (select * from filtered order by subject_name, title, id limit 12 offset greatest(p_offset, 0))
  select jsonb_build_object(
    'lessons', coalesce((select jsonb_agg(to_jsonb(page)) from page), '[]'::jsonb), 'count', (select count(*) from filtered),
    'subjects', coalesce((select jsonb_agg(to_jsonb(s)) from (
      select distinct subject_id as id, subject_name as name, level from all_lessons order by name, level
    ) s), '[]'::jsonb),
    'stats', (select jsonb_build_object('total_cards', coalesce(sum(total_cards), 0),
      'studied_cards', coalesce(sum(studied_cards), 0), 'due_cards', coalesce(sum(due_cards), 0),
      'retained_cards', coalesce(sum(retained_cards), 0), 'first_attempts', coalesce(sum(first_attempts), 0),
      'first_correct', coalesce(sum(first_correct), 0), 'delayed_attempts', coalesce(sum(delayed_attempts), 0),
      'delayed_correct', coalesce(sum(delayed_correct), 0), 'practised_today', coalesce(sum(practised_today), 0),
      'next_due_at', min(next_due_at)) from all_lessons)) || public.recall_note_insights(p_student, p_school);
$$;

revoke all on function public.recall_card_signature(public.recall_cards), public.recall_session_state(text, text, uuid),
  public.recall_note_insights(text, text), public.start_recall_session(text, text, uuid, text, uuid, uuid),
  public.get_recall_session(text, text, uuid), public.submit_recall_session(text, text, uuid, uuid, uuid, text, boolean),
  public.advance_recall_session(text, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.start_recall_session(text, text, uuid, text, uuid, uuid),
  public.get_recall_session(text, text, uuid), public.submit_recall_session(text, text, uuid, uuid, uuid, text, boolean),
  public.advance_recall_session(text, text, uuid, integer) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
