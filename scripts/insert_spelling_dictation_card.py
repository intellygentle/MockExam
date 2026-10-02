#!/usr/bin/env python3
"""Add the Spelling Dictation card to the 'Spelling Bee' stack in Supabase.

Creates one drill set — "Spelling Dictation: Type What You Hear" — with
card_type 'spelling_dictation' (content lives in
src/lib/server/spelling-dictation-card.ts, which reuses the 120 words and RP
transcriptions from spelling-quiz-card.ts) and links it to the existing
Spelling Bee stack.

It also widens drill_sets_card_type_check to allow 'spelling_dictation', by
reading the CURRENT constraint definition and appending the new value (so no
existing card type is ever dropped).

Usage:
    py scripts/insert_spelling_dictation_card.py

Reads SUPABASE_URL + SUPABASE_ANON_KEY from the environment or .env.local, and
SUPABASE_ACCESS_TOKEN (management API, for the constraint) from .env.
Idempotent: re-running changes nothing.
"""
import json, os, re, sys, urllib.request, urllib.parse, urllib.error

STACK_TITLE = "Spelling Bee"
SET_TITLE = "Spelling Dictation: Type What You Hear"
SET_DESCRIPTION = (
    "Listen to each word pronounced in British English (RP), read its phonetic "
    "transcription, then type the correct spelling. The 120 words come in 6 "
    "stages of 20 — clear a stage to unlock the next, and spell all 120 "
    "perfectly to master the card. Every retry is tracked."
)
SLUG = "spelling-dictation"
LEVEL = "ss3"
TIME_LIMIT_MINUTES = 45
QUESTION_COUNT = 120
CARD_TYPE = "spelling_dictation"

# ── config ──────────────────────────────────────────────────────────

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


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
KEY = ENV.get("SUPABASE_ANON_KEY", "")
TOKEN = ENV.get("SUPABASE_ACCESS_TOKEN", "")

if not URL or not KEY:
    print("Set SUPABASE_URL and SUPABASE_ANON_KEY (env or .env.local)", file=sys.stderr)
    sys.exit(1)

PROJECT_REF = re.sub(r"^https?://", "", URL).split(".")[0]

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}


def rest(method, table, params=None, body=None):
    qs = ("?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)) if params else ""
    req = urllib.request.Request(f"{URL}/rest/v1/{table}{qs}", method=method)
    for k, v in HEADERS.items():
        req.add_header(k, v)
    if body is not None:
        req.data = json.dumps(body).encode()
    req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} on {method} {table}: {e.read().decode()}", file=sys.stderr)
        return None


def sql(sql_text):
    """Run DDL through the Supabase Management API (needs a personal token)."""
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query",
        method="POST",
        data=json.dumps({"query": sql_text}).encode(),
    )
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"Management API HTTP {e.code}: {e.read().decode()}", file=sys.stderr)
        return None


# ── 1. Allow the new card_type, preserving every value already allowed ──

if TOKEN:
    rows = sql(
        "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint "
        "WHERE conname = 'drill_sets_card_type_check'"
    )
    if rows is None:
        print("Could not read drill_sets_card_type_check — continuing without it", file=sys.stderr)
    else:
        current = rows[0]["def"] if rows else ""
        if not current:
            print("No drill_sets_card_type_check constraint found — nothing to widen")
        elif f"'{CARD_TYPE}'" in current:
            print(f"Constraint already allows '{CARD_TYPE}'")
        else:
            m = re.search(r"ARRAY\[(.*?)\]", current, re.S)
            if not m:
                print(f"Unrecognised constraint definition, please widen it by hand:\n{current}", file=sys.stderr)
                sys.exit(1)
            widened = f"ARRAY[{m.group(1).rstrip()}, '{CARD_TYPE}'::text]"
            if sql("ALTER TABLE drill_sets DROP CONSTRAINT IF EXISTS drill_sets_card_type_check") is None:
                sys.exit(1)
            if sql(
                "ALTER TABLE drill_sets ADD CONSTRAINT drill_sets_card_type_check "
                f"CHECK (card_type = ANY ({widened}))"
            ) is None:
                sys.exit(1)
            print(f"Constraint drill_sets_card_type_check widened to include '{CARD_TYPE}'")
else:
    print("SUPABASE_ACCESS_TOKEN missing — skipping the constraint check", file=sys.stderr)

# ── 2. Find the Spelling Bee stack ──

stacks = rest("GET", "lesson_stacks", {"select": "id,title"})
if stacks is None:
    sys.exit(1)
stack = next((s for s in stacks if s["title"].strip().lower() == STACK_TITLE.lower()), None)
if not stack:
    print(f"Stack '{STACK_TITLE}' not found — run insert_word_vault_spelling.py first", file=sys.stderr)
    sys.exit(1)
stack_id = stack["id"]
print(f"Stack '{STACK_TITLE}' (id={stack_id})")

# ── 3. Create (or find) the drill set ──

existing = rest("GET", "drill_sets", {"select": "id,card_type", "title": f"eq.{SET_TITLE}"})
if existing is None:
    sys.exit(1)

if existing:
    drill_id = existing[0]["id"]
    print(f"Drill set already exists (id={drill_id}) — leaving it alone")
else:
    created = rest("POST", "drill_sets", body={
        "title": SET_TITLE,
        "description": SET_DESCRIPTION,
        "subject_id": None,
        "level": LEVEL,
        "time_limit_minutes": TIME_LIMIT_MINUTES,
        "question_count": QUESTION_COUNT,
        "card_type": CARD_TYPE,
        "capitalization_slug": SLUG,
    })
    if not created:
        print("Failed to create the drill set", file=sys.stderr)
        sys.exit(1)
    drill_id = created[0]["id"]
    print(f"Created drill set: {drill_id} — {SET_TITLE}")

# ── 4. Link it to the Spelling Bee stack (after the existing cards) ──

items = rest("GET", "lesson_stack_items", {"select": "drill_set_id,sort_order", "stack_id": f"eq.{stack_id}"})
if items is None:
    sys.exit(1)

if any(i["drill_set_id"] == drill_id for i in items):
    print("Already linked to the stack")
else:
    next_order = max([i["sort_order"] or 0 for i in items], default=0) + 1
    link = {"stack_id": stack_id, "drill_set_id": drill_id, "sort_order": next_order}
    if rest("POST", "lesson_stack_items", body=link):
        print(f"Linked to '{STACK_TITLE}' (sort_order={next_order})")
    else:
        print("Failed to link the card to the stack", file=sys.stderr)
        sys.exit(1)

print(f"\nDone. Drill set {drill_id} ({CARD_TYPE} / {SLUG}) is live in '{STACK_TITLE}'.")
