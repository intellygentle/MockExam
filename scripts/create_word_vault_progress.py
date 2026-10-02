#!/usr/bin/env python3
"""Create the per-word progress table for the Word Vault Listening & Story cards.

Both new Spelling Bee cards (listening dictation + story gap-fill) test the
same 120 Word Vault words, and a student can never master all 120 in a single
sitting. Each word therefore keeps its own record per card:

    * first_try_correct → sticky true once the word was right on the FIRST
      attempt of a run (it stays learned even if a later run slips)
    * attempts          → how many times the word has been graded in this card
    * last_typed        → the student's most recent spelling (never the key)

A card is mastered when all 120 of its words are first-try correct.

Creates public.word_vault_progress plus the same permissive RLS policies the
other attempt tables use (the app talks to PostgREST with the anon key).

Usage:
    py scripts/create_word_vault_progress.py

Reads SUPABASE_URL + SUPABASE_ACCESS_TOKEN from .env / .env.local.
Idempotent: re-running changes nothing.
"""
import json, os, re, sys, time, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLE = "word_vault_progress"


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
      word_id integer not null,
      word_key text not null,
      attempts integer not null default 0,
      first_try_correct boolean not null default false,
      last_typed text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint {TABLE}_student_word unique (student_name, drill_set_id, word_id)
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

print(f"public.{TABLE} is ready (per-word first-try tracking, RLS policies + grants).")

check = run(
    "SELECT column_name, data_type FROM information_schema.columns "
    f"WHERE table_name = '{TABLE}' ORDER BY ordinal_position"
)
if check:
    for row in check:
        print(f"  {row['column_name']:<18} {row['data_type']}")
