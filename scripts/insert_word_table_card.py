#!/usr/bin/env python3
"""
Insert the "Words Table: Editorial Word Families" lesson card (Editorials stack).

- Creates the drill_sets routing row (card_type "word_table",
  capitalization_slug "editorial-word-families") if it doesn't exist yet.
- Links it to the Editorials lesson stack via lesson_stack_items.
- Idempotent: safe to re-run; skips anything that already exists.

Credentials are loaded from .env.local at runtime (never hardcoded):
  SUPABASE_URL, SUPABASE_ANON_KEY, optional SUPABASE_SERVICE_KEY.
If the anon key lacks insert permissions on drill_sets, add
SUPABASE_SERVICE_KEY=<key> to .env.local and re-run — this script will
prefer it automatically.

The practice questions themselves live in src/lib/server/word-table-cards.ts
(server-only); this script only extracts the description and question count
from that file for display metadata.
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


def load_env():
    env = {}
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    for required in ("SUPABASE_URL", "SUPABASE_ANON_KEY"):
        if not env.get(required):
            sys.exit(f"ERROR: {required} missing in .env.local")
    return env


def card_metadata():
    """Pull description + question count straight from the TS card module."""
    with open(TS_CARD_PATH, "r", encoding="utf-8") as f:
        ts = f.read()
    m = re.search(r'description:\s*"([^"]+)"', ts, re.S)
    description = (m.group(1).strip() if m else FALLBACK_DESCRIPTION).replace("\n", " ")
    # one `pos: "` per practice item in WORD_FAMILIES
    count = len(re.findall(r'pos:\s*"', ts))
    if count < 10:
        sys.exit("ERROR: could not count word-form items in word-table-cards.ts")
    return description, count


class Supabase:
    def __init__(self, url, key):
        self.base = url.rstrip("/")
        self.key = key

    def request(self, method, path, body=None, prefer=None):
        req = urllib.request.Request(
            f"{self.base}{path}",
            data=json.dumps(body).encode() if body is not None else None,
            method=method,
            headers={
                "apikey": self.key,
                "Authorization": f"Bearer {self.key}",
                "Content-Type": "application/json",
                **({"Prefer": prefer} if prefer else {}),
            },
        )
        try:
            with urllib.request.urlopen(req) as res:
                raw = res.read().decode()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")[:400]
            raise RuntimeError(f"HTTP {e.code} on {method} {path}: {detail}") from e


def main():
    env = load_env()
    description, question_count = card_metadata()

    key = env.get("SUPABASE_SERVICE_KEY") or env["SUPABASE_ANON_KEY"]
    using_service = bool(env.get("SUPABASE_SERVICE_KEY"))
    print(f"Loaded .env.local (using {'service' if using_service else 'anon'} key)")
    print(f"Card: {TITLE!r} — {question_count} word-form items")

    db = Supabase(env["SUPABASE_URL"], key)

    # Verify the Editorials stack exists (id only + title, nothing sensitive)
    stack = db.request(
        "GET", f"/rest/v1/lesson_stacks?id=eq.{STACK_ID}&select=id,title"
    )
    if not stack:
        sys.exit(f"ERROR: lesson_stacks id={STACK_ID} not found")
    print(f"Stack {STACK_ID}: {stack[0]['title']!r}")

    # Idempotency: does the drill set already exist?
    existing = db.request(
        "GET",
        f"/rest/v1/drill_sets?title=eq.{urllib.request.quote(TITLE)}&select=id,title,card_type,question_count",
    )
    if existing:
        set_id = existing[0]["id"]
        print(f"Drill set already exists: id={set_id} card_type={existing[0]['card_type']!r} — skipping creation")
    else:
        row = {
            "title": TITLE,
            "description": description,
            "subject_id": None,
            "level": LEVEL,
            "time_limit_minutes": 0,
            "question_count": question_count,
            "card_type": CARD_TYPE,
            "capitalization_slug": SLUG,
        }
        try:
            created = db.request(
                "POST", "/rest/v1/drill_sets", body=row, prefer="return=representation"
            )
        except RuntimeError as e:
            if "42501" in str(e) or "permission" in str(e).lower() or "row-level" in str(e).lower():
                sys.exit(
                    "ERROR: insert blocked by RLS — the anon key cannot write to drill_sets.\n"
                    "Add SUPABASE_SERVICE_KEY=<service-role key> to .env.local and re-run."
                )
            raise
        if not created:
            sys.exit("ERROR: drill_sets insert returned no row (RLS may have silently dropped it — try the service key)")
        set_id = created[0]["id"]
        print(f"Created drill set id={set_id} card_type={CARD_TYPE!r} slug={SLUG!r}")

    # Link to the Editorials stack (also idempotent)
    link = db.request(
        "GET",
        f"/rest/v1/lesson_stack_items?stack_id=eq.{STACK_ID}&drill_set_id=eq.{set_id}&select=id,sort_order",
    )
    if link:
        print(f"Stack link already exists (sort_order={link[0]['sort_order']}) — skipping")
    else:
        orders = db.request(
            "GET",
            f"/rest/v1/lesson_stack_items?stack_id=eq.{STACK_ID}&select=sort_order&order=sort_order.desc&limit=1",
        )
        next_order = (orders[0]["sort_order"] + 1) if orders else 0
        db.request(
            "POST",
            "/rest/v1/lesson_stack_items",
            body={"stack_id": STACK_ID, "drill_set_id": set_id, "sort_order": next_order},
            prefer="return=minimal",
        )
        print(f"Linked to stack {STACK_ID} with sort_order={next_order}")

    # Final verification — print only non-sensitive fields
    verify = db.request(
        "GET",
        f"/rest/v1/drill_sets?id=eq.{set_id}&select=id,title,card_type,capitalization_slug,question_count,level",
    )
    v = verify[0]
    print("\nVERIFIED:")
    print(f"  id={v['id']} title={v['title']!r}")
    print(f"  card_type={v['card_type']!r} slug={v['capitalization_slug']!r}")
    print(f"  question_count={v['question_count']} level={v['level']!r}")
    print("\nDone.")


if __name__ == "__main__":
    main()
