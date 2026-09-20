#!/usr/bin/env python3
"""Create the per-word progress table for the 5-minute Spelling Quiz card.

A student can never clear all 120 words in one 5-minute run, so a single run
must NOT mark the card as studied. Instead every word keeps its own streak:

    * a correct tap  → streak + 1 (capped at 3)
    * a wrong tap    → streak reset to 0
    * the word is "learned" once its streak reaches 3 (i.e. three separate
      runs answered correctly, since each run shows a word at most once)
    * the card is mastered only when ALL 120 words are learned

Creates public.spelling_quiz_word_progress plus the same permissive RLS
policies the other attempt tables use (the app talks to PostgREST with the
anon key).

Usage:
    py scripts/create_spelling_quiz_progress.py

Reads SUPABASE_URL + SUPABASE_ACCESS_TOKEN from .env / .env.local.
Idempotent: re-running changes nothing.
"""
import json, os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLE = "spelling_quiz_word_progress"


def parse_env_file(path):
    values = {}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                m = re.match(r"^([A-Z0-9_]+)\s*=\s*\"?([^\"\r\n]*)\"?\s*$", line)
                if m:
                    values[m.group(1)] = m.group(2)
    return values


ENV = dict(os.environ)
for preload in (os.path.join(ROOT, ".env"), os.path.join(ROOT, ".env.local")):
    for k, v in parse_env_file(preload).items():
        ENV.setdefault(k, v)

URL = ENV.get("SUPABASE_URL", "").rstrip("/")
TOKEN = ENV.get("SUPABASE_ACCESS_TOKEN", "")

if not URL or not TOKEN:
    print("Set SUPABASE_URL and SUPABASE_ACCESS_TOKEN (env / .env.local / .env)", file=sys.stderr)
    sys.exit(1)

REF = re.sub(r"^https?://", "", URL).split(".")[0]
ENDPOINT = f"https://api.supabase.com/v1/projects/{REF}/database/query"

STATEMENTS = [
    f"""
    create table if not exists public.{TABLE} (
      id bigserial primary key,
      student_name text not null,
      drill_set_id bigint not null,
      word_key text not null,
      streak integer not null default 0,
      correct_total integer not null default 0,
      seen_count integer not null default 0,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint {TABLE}_student_word_key unique (student_name, drill_set_id, word_key)
    )
    """,
    f"create index if not exists {TABLE}_lookup on public.{TABLE} (student_name, drill_set_id)",
    f"alter table public.{TABLE} enable row level security",
    f'drop policy if exists "Allow public read {TABLE}" on public.{TABLE}',
    f'create policy "Allow public read {TABLE}" on public.{TABLE} for select to public using (true)',
    f'drop policy if exists "Allow public insert {TABLE}" on public.{TABLE}',
    f'create policy "Allow public insert {TABLE}" on public.{TABLE} for insert to public with check (true)',
    f'drop policy if exists "Allow public update {TABLE}" on public.{TABLE}',
    f'create policy "Allow public update {TABLE}" on public.{TABLE} for update to public using (true) with check (true)',
    f'grant select, insert, update on public.{TABLE} to anon, authenticated',
    f'grant usage, select on sequence public.{TABLE}_id_seq to anon, authenticated',
]


def run(sql_text, tries=4):
    for attempt in range(tries):
        req = urllib.request.Request(ENDPOINT, method="POST", data=json.dumps({"query": sql_text}).encode())
        req.add_header("Authorization", f"Bearer {TOKEN}")
        req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            print(f"HTTP {e.code}: {e.read().decode()[:400]}", file=sys.stderr)
            return None
        except Exception as e:
            if attempt < tries - 1:
                print(f"  retry {attempt + 1}/{tries} after {type(e).__name__}")
                time.sleep(3)
                continue
            print(f"Failed: {e}", file=sys.stderr)
            return None


for i, statement in enumerate(STATEMENTS, 1):
    if run(statement) is None:
        print(f"Statement {i} failed — aborting", file=sys.stderr)
        sys.exit(1)

print(f"public.{TABLE} is ready (streaks per student / word, RLS policies + grants).")

check = run(
    "SELECT column_name, data_type FROM information_schema.columns "
    f"WHERE table_name = '{TABLE}' ORDER BY ordinal_position"
)
if check:
    for row in check:
        print(f"  {row['column_name']:<15} {row['data_type']}")
