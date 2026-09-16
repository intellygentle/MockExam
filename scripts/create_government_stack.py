#!/usr/bin/env python3
"""
Create the empty "Government Lessons" lesson stack (idempotent).

Inserts a single row into lesson_stacks via the Supabase Management API
(which can run SQL, unlike the anon/service keys that only use PostgREST).

Safe to re-run: uses WHERE NOT EXISTS and never deletes anything, so reruns
produce no duplicate rows. Drill sets are linked later with
lesson_stack_items (sort_order).

Required in .env / .env.local (add tokens yourself, never paste in chat):
  SUPABASE_URL            e.g. https://<ref>.supabase.co (project ref derived)
  SUPABASE_ACCESS_TOKEN   personal access token with SQL access on the project

Prints only non-sensitive results (id, title, created_at) — never the token.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPT_DIR)

TITLE = "Government Lessons"
DESCRIPTION = "Government studies and practice lessons"
ICON = "🏛️"


def load_env():
    env = {}
    # .env as base, .env.local overrides (creds may live in either)
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
            sys.exit(f"ERROR: {required} missing in .env.local")
    return env


def project_ref(url):
    m = re.match(r"https://([a-z0-9]+)\.supabase\.co", url)
    if not m:
        sys.exit(f"ERROR: could not derive project ref from {url!r}")
    return m.group(1)


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

    rows = run_query(ref, token, f"""
        INSERT INTO lesson_stacks (title, description, icon)
        SELECT {sql_literal(TITLE)}, {sql_literal(DESCRIPTION)}, {sql_literal(ICON)}
        WHERE NOT EXISTS (SELECT 1 FROM lesson_stacks WHERE title = {sql_literal(TITLE)})
        RETURNING id, title, created_at
    """)

    if rows:
        print(f"Created stack '{rows[0]['title']}' (id={rows[0]['id']}) — no drill sets linked yet")
    else:
        rows = run_query(ref, token, f"SELECT id, title, created_at FROM lesson_stacks WHERE title = {sql_literal(TITLE)}")
        print(f"Stack '{TITLE}' already exists (id={rows[0]['id']}) — skipping creation")

    print("Done.")


if __name__ == "__main__":
    main()
