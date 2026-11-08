-- Apply after v6 and v7. Rerunnable; preserves published content and student progress.
begin;

-- Reading a single note records exposure only for its content, leaving other schedules intact.
create or replace function public.read_recall_note(p_student text, p_school text, p_lesson_id uuid, p_section_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cards jsonb;
begin
  if p_student is null or char_length(btrim(p_student)) not between 1 and 80
    or p_school is null or char_length(p_school) > 120 then
    raise exception 'Enter your nickname and school before practising.';
  end if;
  if not exists(select 1 from public.recall_cards c join public.recall_lessons l on l.id = c.lesson_id
    where c.lesson_id = p_lesson_id and c.section_id = p_section_id and l.is_published) then
    raise exception 'This note is not available.';
  end if;
  insert into public.recall_progress(student_name, school_name, card_id)
    select btrim(p_student), btrim(p_school), id from public.recall_cards
      where lesson_id = p_lesson_id and section_id = p_section_id order by id
    on conflict(student_name, school_name, card_id) do update set
      step = 0, last_seen_at = now(), due_at = now(), needs_delayed_check = true,
      review_id = null, review_done = true, attempt_ids = '{}', attempt_results = '{}';
  select coalesce(jsonb_agg(to_jsonb(c) order by position, id), '[]'::jsonb) into v_cards
    from public.recall_cards c where lesson_id = p_lesson_id and section_id = p_section_id;
  return jsonb_build_object('cards', v_cards, 'due_at', now());
end;
$$;

-- One report row per topic, using the same first-answer counters as the student dashboard.
create or replace function public.recall_topic_report(p_lesson_id uuid)
returns table(section_id uuid, heading text, total_cards bigint, students bigint,
  due_cards bigint, incorrect_cards bigint, first_attempts bigint, first_correct bigint,
  delayed_attempts bigint, delayed_correct bigint)
language sql stable security definer set search_path = public as $$
  select c.section_id, min(c.heading), count(distinct c.id),
    count(distinct (p.student_name, p.school_name)) filter(where p.card_id is not null),
    count(p.card_id) filter(where p.due_at <= now()),
    count(p.card_id) filter(where p.last_first_correct = false),
    coalesce(sum(p.first_attempts), 0)::bigint, coalesce(sum(p.first_correct), 0)::bigint,
    coalesce(sum(p.delayed_attempts), 0)::bigint, coalesce(sum(p.delayed_correct), 0)::bigint
  from public.recall_cards c left join public.recall_progress p on p.card_id = c.id
  where c.lesson_id = p_lesson_id group by c.section_id order by min(c.position), c.section_id;
$$;

-- Detailed list feedback is returned only after checking. Full-answer matching still
-- ignores whitespace; item hints must not contradict a correct single-line answer.
create or replace function public.recall_list_feedback(p_expected text, p_actual text, p_correct boolean, p_reveal boolean)
returns jsonb language sql immutable set search_path = public as $$
  with expected as (
    select item, ordinal from unnest(regexp_split_to_array(p_expected, E'\n')) with ordinality as items(item, ordinal)
  ), actual as (select regexp_split_to_array(replace(p_actual, E'\r\n', E'\n'), E'\n') as items)
  select case when not p_reveal and not p_correct and cardinality(actual.items) = (select count(*) from expected)
    then (select jsonb_agg(jsonb_build_object('position', e.ordinal, 'correct',
      public.recall_normalize(e.item) = public.recall_normalize(actual.items[e.ordinal])) order by e.ordinal) from expected e)
    else null end from actual;
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
  -- Replayed submissions return the latest feedback, rather than replacing a later retry.
  if exists(select 1 from public.recall_progress where student_name = btrim(p_student)
    and school_name = btrim(p_school) and review_id = p_review_id and p_request_id = any(attempt_ids)) then
    return v_state;
  end if;
  v_card := v_state->'card';
  v_result := public.submit_recall_review(p_student, p_school, p_review_id, p_request_id, p_answer, p_reveal);
  if v_card->>'answer_format' = 'list' then
    v_result := v_result || jsonb_build_object('items', public.recall_list_feedback(
      v_result->>'expected_answer', p_answer, (v_result->>'correct')::boolean, p_reveal));
  end if;
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

revoke all on function public.read_recall_note(text, text, uuid, uuid),
  public.recall_topic_report(uuid), public.recall_list_feedback(text, text, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.read_recall_note(text, text, uuid, uuid) to anon, authenticated;
grant execute on function public.recall_topic_report(uuid) to service_role;
notify pgrst, 'reload schema';
commit;
