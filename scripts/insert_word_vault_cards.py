#!/usr/bin/env python3
"""Add the two Word Vault Listening & Story Challenge cards to the Spelling Bee stack.

Creates one drill set per activity:

    * "Listening Dictation: Type What You Hear"  (card_type spelling_listening)
      — content in src/lib/server/spelling-listening-card.ts
    * "Story Challenge: Listen & Fill the Gaps"   (card_type spelling_story)
      — content in src/lib/server/spelling-story-card.ts

Both share the 120 Word Vault words and grades from
src/lib/server/word-vault-challenge-content.ts (generated from the docx).

It also widens drill_sets_card_type_check to include both new card types by
reading the CURRENT constraint definition and appending the new values (so no
existing card type is ever dropped).

Usage:
    py scripts/insert_word_vault_cards.py

Reads SUPABASE_URL + SUPABASE_ANON_KEY from the environment or .env.local, and
SUPABASE_ACCESS_TOKEN (management API, for the constraint) from .env.
Idempotent: re-running changes nothing.
"""
import json, os, re, sys, urllib.request, urllib.parse, urllib.error

STACK_TITLE = "Spelling Bee"

CARDS = [
    {
        "title": "Listening Dictation: Type What You Hear",
        "description": (
            "A British voice reads a sentence containing one Word Vault word. Type the whole "
            "sentence from memory — the sentence and the word are never shown until you are "
            "marked. Section practice or the full 120-word test, with every retry tracked."
        ),
        "slug": "word-vault-listening",
        "card_type": "spelling_listening",
        "question_count": 120,
        "time_limit_minutes": 45,
    },
    {
        "title": "Story Challenge: Listen & Fill the Gaps",
        "description": (
            "A British voice narrates six chapters of “The Map in the Camera”. Whenever a Word "
            "Vault word is spoken, the screen hides it behind a blank box — type the word you "
            "heard. 6 chapters, 120 gaps; the narration waits for you at every gap."
        ),
        "slug": "word-vault-story",
        "card_type": "spelling_story",
        "question_count": 120,
        "time_limit_minutes": 60,
    },
]

LEVEL = "ss3"

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


# ── 1. Allow the new card types, preserving every value already allowed ──

if TOKEN:
    rows = sql(
        "SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint "
        "WHERE conname = 'drill_sets_card_type_check'"
    )
    if rows is None:
        print("Could not read drill_sets_card_type_check — continuing without it", file=sys.stderr)
    else:
        current = rows[0]["def"] if rows else ""
        added = [c["card_type"] for c in CARDS if f"'{c['card_type']}'" not in current]
        if not current:
            print("No drill_sets_card_type_check constraint found — nothing to widen")
        elif not added:
            print("Constraint already allows both new card types")
        else:
            m = re.search(r"ARRAY\[(.*?)\]", current, re.S)
            if not m:
                print(f"Unrecognised constraint definition, please widen it by hand:\n{current}", file=sys.stderr)
                sys.exit(1)
            extra = "".join(f", '{t}'::text" for t in added)
            widened = f"ARRAY[{m.group(1).rstrip()}{extra}]"
            if sql("ALTER TABLE drill_sets DROP CONSTRAINT IF EXISTS drill_sets_card_type_check") is None:
                sys.exit(1)
            if sql(
                "ALTER TABLE drill_sets ADD CONSTRAINT drill_sets_card_type_check "
                f"CHECK (card_type = ANY ({widened}))"
            ) is None:
                sys.exit(1)
            print(f"Constraint widened to include: {', '.join(added)}")
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

items = rest("GET", "lesson_stack_items", {"select": "drill_set_id,sort_order", "stack_id": f"eq.{stack_id}"})
if items is None:
    sys.exit(1)
next_order = max([i["sort_order"] or 0 for i in items], default=0) + 1

# ── 3. Create (or find) each drill set and link it ──

for card in CARDS:
    existing = rest("GET", "drill_sets", {"select": "id,card_type", "title": f"eq.{card['title']}"})
    if existing is None:
        sys.exit(1)

    if existing:
        drill_id = existing[0]["id"]
        print(f"Drill set already exists (id={drill_id}) — leaving it alone: {card['title']}")
    else:
        created = rest("POST", "drill_sets", body={
            "title": card["title"],
            "description": card["description"],
            "subject_id": None,
            "level": LEVEL,
            "time_limit_minutes": card["time_limit_minutes"],
            "question_count": card["question_count"],
            "card_type": card["card_type"],
            "capitalization_slug": card["slug"],
        })
        if not created:
            print(f"Failed to create the drill set: {card['title']}", file=sys.stderr)
            sys.exit(1)
        drill_id = created[0]["id"]
        print(f"Created drill set: {drill_id} — {card['title']}")

    if any(i["drill_set_id"] == drill_id for i in items):
        print("  already linked to the stack")
        continue

    link = {"stack_id": stack_id, "drill_set_id": drill_id, "sort_order": next_order}
    if rest("POST", "lesson_stack_items", body=link):
        print(f"  linked to '{STACK_TITLE}' (sort_order={next_order})")
        items.append({"drill_set_id": drill_id, "sort_order": next_order})
        next_order += 1
    else:
        print("  failed to link the card to the stack", file=sys.stderr)
        sys.exit(1)

print(f"\nDone. Both Word Vault cards are live in '{STACK_TITLE}'.")
