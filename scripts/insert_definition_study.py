#!/usr/bin/env python3
"""
Insert the "Definition Recall" card into the Government Lessons stack (idempotent).

Source: Documents/Definition Study.doc — 35 term/meaning pairs, split into three
stages (10 / 10 / 15). Creates one drill set with card_type 'definition_recall'
and slug 'government-definitions', then links it into the stack (sort order 3).
The definitions themselves live in src/lib/server/definition-recall-card.ts.

Runs through the Supabase Management API. Safe to re-run: the set and the stack
link are only created when absent. Nothing is ever deleted.

Required in .env / .env.local (never paste tokens in chat):
  SUPABASE_URL            e.g. https://<ref>.supabase.co (ref derived)
  SUPABASE_ACCESS_TOKEN   personal access token with SQL access
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)

STACK_TITLE = "Government Lessons"
SUBJECT_NAME = "Government"
LEVEL = "ss3"

TITLE = "Government Definitions: Recall Drill"
DESCRIPTION = (
    "Memorise 35 Government terms and their exact meanings across three stages. "
    "Each term shows for 10 seconds, then you type the definition from memory. "
    "One miss restarts the current stage."
)
SLUG = "government-definitions"
QUESTION_COUNT = 35
SORT_ORDER = 3

CARD_TYPES = [
    "quiz", "capitalization", "sentence_types", "sentence_combining",
    "true_false", "passage", "vocabulary", "combine_seq", "error_correction",
    "para_gapfill", "sentence_expansion", "sentence_expansion_mcq", "word_table",
    "study", "definition_recall",
]


def load_env():
    env = {}
    for path in (os.path.join(REPO_ROOT, ".env"), os.path.join(REPO_ROOT, ".env.local")):
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
            sys.exit(f"ERROR: {required} missing in .env / .env.local")
    return env


def project_ref(url):
    m = re.match(r"https://([a-z0-9]+)\.supabase\.co", url)
    if not m:
        sys.exit(f"ERROR: could not derive project ref from {url!r}")
    return m.group(1)


def run_query(ref, token, query):
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{ref}/database/query",
        data=json.dumps({"query": query}).encode(),
        method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
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
    return "'" + str(s).replace("'", "''") + "'"


def main():
    env = load_env()
    ref = project_ref(env["SUPABASE_URL"])
    token = env["SUPABASE_ACCESS_TOKEN"]
    print(f"Project ref: {ref}")

    subs = run_query(ref, token, f"SELECT id FROM subjects WHERE name = {sql_literal(SUBJECT_NAME)} AND level = {sql_literal(LEVEL)} LIMIT 1")
    subject_id = subs[0]["id"] if subs else None
    print(f"Subject '{SUBJECT_NAME}' id={subject_id}")

    stacks = run_query(ref, token, f"SELECT id FROM lesson_stacks WHERE title = {sql_literal(STACK_TITLE)} LIMIT 1")
    if not stacks:
        sys.exit(f"ERROR: stack {STACK_TITLE!r} not found")
    stack_id = stacks[0]["id"]

    # Widen the card_type check to allow 'definition_recall' (idempotent)
    type_list = ", ".join(sql_literal(t) for t in CARD_TYPES)
    run_query(ref, token, "ALTER TABLE drill_sets DROP CONSTRAINT IF EXISTS drill_sets_card_type_check")
    run_query(ref, token, f"ALTER TABLE drill_sets ADD CONSTRAINT drill_sets_card_type_check CHECK (card_type = ANY (ARRAY[{type_list}]))")
    print("Constraint drill_sets_card_type_check includes 'definition_recall'")

    rows = run_query(ref, token, f"""
        INSERT INTO drill_sets
            (title, description, subject_id, level, time_limit_minutes,
             question_count, card_type, capitalization_slug, lesson_content)
        SELECT {sql_literal(TITLE)}, {sql_literal(DESCRIPTION)}, {subject_id if subject_id else 'NULL'},
               {sql_literal(LEVEL)}, 0, {QUESTION_COUNT},
               'definition_recall', {sql_literal(SLUG)}, ''
        WHERE NOT EXISTS (SELECT 1 FROM drill_sets WHERE title = {sql_literal(TITLE)})
        RETURNING id
    """)
    if rows:
        set_id = rows[0]["id"]
        print(f"Created drill set id={set_id}")
    else:
        set_id = run_query(ref, token, f"SELECT id FROM drill_sets WHERE title = {sql_literal(TITLE)}")[0]["id"]
        print(f"Drill set exists (id={set_id})")

    link = run_query(ref, token, f"""
        INSERT INTO lesson_stack_items (stack_id, drill_set_id, sort_order)
        SELECT {stack_id}, {set_id}, {SORT_ORDER}
        WHERE NOT EXISTS (
            SELECT 1 FROM lesson_stack_items WHERE stack_id = {stack_id} AND drill_set_id = {set_id}
        )
        RETURNING id
    """)
    print(f"Stack link: {'added' if link else 'exists'}")

    print("\nVERIFIED:")
    for row in run_query(ref, token, f"""
        SELECT id, title, card_type, capitalization_slug, question_count
        FROM drill_sets WHERE id = {set_id}
    """):
        print(f"  id={row['id']} {row['title']!r} type={row['card_type']} slug={row['capitalization_slug']} count={row['question_count']}")
    items = run_query(ref, token, f"SELECT drill_set_id, sort_order FROM lesson_stack_items WHERE stack_id = {stack_id} ORDER BY sort_order")
    print(f"  stack {stack_id} items: {[(i['drill_set_id'], i['sort_order']) for i in items]}")
    print("Done.")


if __name__ == "__main__":
    main()
