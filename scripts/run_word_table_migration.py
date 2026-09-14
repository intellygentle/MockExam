#!/usr/bin/env python3
"""
Run the Words Table card migration end-to-end from the sandbox.

Does three things via the Supabase Management API (which CAN run DDL,
unlike the anon/service keys that only go through PostgREST):

  1. Widens drill_sets_card_type_check to allow card_type 'word_table'
     (same statements as scripts/alter_constraint_word_table.sql).
  2. Inserts the drill_sets routing row (idempotent).
  3. Links it to the Editorials stack via lesson_stack_items (idempotent).

Required in .env.local (add the token yourself, never paste it in chat):
  SUPABASE_URL            (e.g. https://<ref>.supabase.co — ref is derived)
  SUPABASE_ANON_KEY
  SUPABASE_ACCESS_TOKEN   personal access token (Dashboard → Account →
                          Access Tokens). Needs SQL access on the project.

Prints only non-sensitive results (ids, titles, counts) — never the token.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)
ENV_PATH = os.path.join(REPO_ROOT, ".env.local")
TS_CARD_PATH = os.path.join(REPO_ROOT, "src", "lib", "server", "word-table-cards.ts")

TITLE = "Words Table: Editorial Word Families"
SLUG = "editorial-word-families"
CARD_TYPE = "word_table"
STACK_ID = 6  # Editorials
LEVEL = "ss3"

FALLBACK_DESCRIPTION = (
    "Study the word families table from the editorials, then write one original "
    "sentence for every form of each word — noun, verb, adjective and adverb. "
    "All forms must be accepted to perfect the lesson."
)

CARD_TYPES = [
    "quiz", "capitalization", "sentence_types", "sentence_combining",
    "true_false", "passage", "vocabulary", "combine_seq", "error_correction",
    "para_gapfill", "sentence_expansion", "sentence_expansion_mcq", "word_table",
]


def load_env():
    env = {}
    # .env as base, .env.local overrides (user may put creds in either)
    for path in (os.path.join(REPO_ROOT, ".env"), ENV_PATH):
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    for required in ("SUPABASE_URL", "SUPABASE_ACCESS_TOKEN"):
        if not env.get(required):
            sys.exit(f"ERROR: {required} missing in .env.local")
    return env


def project_ref(url):
    m = re.match(r"https://([a-z0-9]+)\.supabase\.co", url)
    if not m:
        sys.exit(f"ERROR: could not derive project ref from {url!r}")
    return m.group(1)


def card_metadata():
    """Pull description + question count straight from the TS card module."""
    with open(TS_CARD_PATH, "r", encoding="utf-8") as f:
        ts = f.read()
    m = re.search(r'description:\s*"([^"]+)"', ts, re.S)
    description = (m.group(1).strip() if m else FALLBACK_DESCRIPTION).replace("\n", " ")
    description = description.replace('\\"', '"')
    count = len(re.findall(r'pos:\s*"', ts))
    if count < 10:
        sys.exit("ERROR: could not count word-form items in word-table-cards.ts")
    return description, count


def run_query(ref, token, query):
    """POST one SQL statement to the Management API; return rows (may be [])."""
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": query}).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            raw = res.read().decode()
            if not raw:
                return []
            data = json.loads(raw)
            return data if isinstance(data, list) else data.get("rows", data.get("data", []))
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")[:400]
        raise RuntimeError(f"Management API HTTP {e.code}: {detail}") from e


def sql_literal(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    env = load_env()
    ref = project_ref(env["SUPABASE_URL"])
    token = env["SUPABASE_ACCESS_TOKEN"]
    print(f"Project ref: {ref}")

    description, question_count = card_metadata()
    print(f"Card: {TITLE!r} — {question_count} word-form items")

    # 1) Widen the check constraint (idempotent)
    type_list = ", ".join(sql_literal(t) for t in CARD_TYPES)
    run_query(ref, token, "ALTER TABLE drill_sets DROP CONSTRAINT IF EXISTS drill_sets_card_type_check")
    run_query(ref, token, f"ALTER TABLE drill_sets ADD CONSTRAINT drill_sets_card_type_check CHECK (card_type = ANY (ARRAY[{type_list}]))")
    print("Constraint drill_sets_card_type_check widened (includes 'word_table')")

    # 2) Insert the drill set row (idempotent)
    rows = run_query(ref, token, f"""
        INSERT INTO drill_sets
            (title, description, subject_id, level, time_limit_minutes,
             question_count, card_type, capitalization_slug)
        SELECT {sql_literal(TITLE)}, {sql_literal(description)}, NULL, {sql_literal(LEVEL)}, 0,
               {question_count}, {sql_literal(CARD_TYPE)}, {sql_literal(SLUG)}
        WHERE NOT EXISTS (SELECT 1 FROM drill_sets WHERE title = {sql_literal(TITLE)})
        RETURNING id
    """)
    if rows:
        set_id = rows[0]["id"]
        print(f"Created drill set id={set_id}")
    else:
        rows = run_query(ref, token, f"SELECT id FROM drill_sets WHERE title = {sql_literal(TITLE)}")
        if not rows:
            sys.exit("ERROR: drill set not found after insert")
        set_id = rows[0]["id"]
        print(f"Drill set already exists: id={set_id} — skipping creation")

    # 3) Link to the Editorials stack (idempotent)
    rows = run_query(ref, token, f"""
        INSERT INTO lesson_stack_items (stack_id, drill_set_id, sort_order)
        SELECT {STACK_ID}, {set_id},
               COALESCE((SELECT MAX(sort_order) + 1 FROM lesson_stack_items WHERE stack_id = {STACK_ID}), 0)
        WHERE NOT EXISTS (
            SELECT 1 FROM lesson_stack_items
            WHERE stack_id = {STACK_ID} AND drill_set_id = {set_id}
        )
        RETURNING id, sort_order
    """)
    if rows:
        print(f"Linked to stack {STACK_ID} with sort_order={rows[0]['sort_order']}")
    else:
        rows = run_query(ref, token, f"SELECT sort_order FROM lesson_stack_items WHERE stack_id = {STACK_ID} AND drill_set_id = {set_id}")
        print(f"Stack link already exists (sort_order={rows[0]['sort_order'] if rows else '?'}) — skipping")

    # 4) Verify — non-sensitive fields only
    rows = run_query(ref, token, f"""
        SELECT id, title, card_type, capitalization_slug, question_count, level
        FROM drill_sets WHERE id = {set_id}
    """)
    v = rows[0]
    print("\nVERIFIED:")
    print(f"  id={v['id']} title={v['title']!r}")
    print(f"  card_type={v['card_type']!r} slug={v['capitalization_slug']!r}")
    print(f"  question_count={v['question_count']} level={v['level']!r}")
    print("\nDone.")


if __name__ == "__main__":
    main()
