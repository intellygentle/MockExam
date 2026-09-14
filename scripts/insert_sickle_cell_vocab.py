#!/usr/bin/env python3
"""Insert the two Sickle Cell flash vocabulary drill sets into Supabase.

Splits the 30-word glossary from
"New sets of materials/Vocabulary_Worksheet_Sickle_Cell.md" into two cards
of 15 words each. Cards use card_type='vocabulary' with
capitalization_slug='flash', which the app renders as the flash-mode
VocabularyCard (5-minute study list → 5-second flash → rewrite meaning;
wrong answer restarts from word 1).

Usage:
    py scripts/insert_sickle_cell_vocab.py

Reads SUPABASE_URL + SUPABASE_ANON_KEY from the environment or .env.local.
Safe to re-run: existing sets are left alone and missing words are synced.
"""
import json, os, re, sys, urllib.request, urllib.parse, urllib.error

STACK_TITLE = "Editorials"
LEVEL = "ss3"
TIME_LIMIT_MINUTES = 30

CARDS = [
    {
        "title": "Sickle Cell Vocabulary I (Words 1–15)",
        "description": "Study the first 15 words from the Sickle Cell editorial vocabulary glossary. Study the full list for five minutes, then each word and its meaning flashes for five seconds before you rewrite the meaning from memory — one mistake restarts the card from word 1.",
        "words": [
            ("Epicentre", "The central or most intense point of a crisis"),
            ("Scourge", "A cause of great suffering or trouble"),
            ("Genotype", "The genetic makeup of an individual"),
            ("Discordant", "Disagreeing or conflicting; not in harmony"),
            ("Devolved", "Degenerated or declined into a worse state"),
            ("Reagents", "Substances used in chemical reactions or tests"),
            ("Calibrated", "Adjusted or set to a standard of accuracy"),
            ("Quackery", "Fraudulent claims of medical knowledge or skill"),
            ("Regulatory deficit", "A lack of proper rules, oversight, or enforcement"),
            ("Compromised", "Weakened or made less reliable"),
            ("Stigma", "A mark of shame or disgrace associated with something"),
            ("Cross-verification", "Checking information against another source to confirm it"),
            ("Accredited", "Officially recognised as meeting a required standard"),
            ("Chromatography", "A laboratory technique for separating mixtures"),
            ("Roulette wheel", "Something unpredictable, based purely on chance"),
        ],
    },
    {
        "title": "Sickle Cell Vocabulary II (Words 16–30)",
        "description": "Study the second 15 words from the Sickle Cell editorial vocabulary glossary. Study the full list for five minutes, then each word and its meaning flashes for five seconds before you rewrite the meaning from memory — one mistake restarts the card from word 1.",
        "words": [
            ("Dumping ground", "A place where unwanted or substandard items are discarded"),
            ("Hollowed out", "Weakened from within; made ineffective"),
            ("Beyond reproach", "Completely trustworthy; free from blame"),
            ("Bone-crushing", "Extremely severe or intense (pain)"),
            ("Sprawling", "Spreading out over a large, often disorganised area"),
            ("Ecosystem", "A system or network of interconnected parts (used of an industry/sector)"),
            ("Prevalence", "How widespread or common something is within a population"),
            ("Advocacy", "Public support for or recommendation of a cause or policy"),
            ("Premarital", "Occurring before marriage"),
            ("Phase out", "To gradually stop using or remove something"),
            ("Penalise", "To punish someone for breaking a rule"),
            ("Systemic", "Relating to an entire system, not just isolated parts"),
            ("Gatekeepers", "People or institutions that control access to something"),
            ("Desperation", "A state of extreme need or hopelessness that drives risky action"),
            ("Catastrophic", "Extremely harmful or disastrous"),
        ],
    },
]

# ── config ──────────────────────────────────────────────────────────

def load_env():
    env = dict(os.environ)
    path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env.local")
    if os.path.exists(path):
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                m = re.match(r"^([A-Z0-9_]+)\s*=\s*\"?([^\"\r\n]*)\"?\s*$", line)
                if m:
                    env.setdefault(m.group(1), m.group(2))
    return env

ENV = load_env()
URL = ENV.get("SUPABASE_URL", "").rstrip("/")
KEY = ENV.get("SUPABASE_ANON_KEY", "")

if not URL or not KEY:
    print("Set SUPABASE_URL and SUPABASE_ANON_KEY (env or .env.local)", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    "apikey": KEY,
    "Authorization": f"Bearer {KEY}",
    "Content-Type": "application/json",
}

def rest(method, table, params=None, body=None, retries=3):
    qs = ("?" + urllib.parse.urlencode(params, quote_via=urllib.parse.quote)) if params else ""
    req = urllib.request.Request(f"{URL}/rest/v1/{table}{qs}", method=method)
    for k, v in HEADERS.items():
        req.add_header(k, v)
    if body is not None:
        req.data = json.dumps(body).encode()
    req.add_header("Prefer", "return=representation")
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            print(f"HTTP {e.code} on {method} {table}: {e.read().decode()}", file=sys.stderr)
            return None
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < retries - 1:
                print(f"  retry {attempt + 1}/{retries} after network error: {e}", file=sys.stderr)
                continue
            raise
    return None

# ── run ─────────────────────────────────────────────────────────────

# 1. Find the Editorials stack
stacks = rest("GET", "lesson_stacks", {"select": "id,title"})
if stacks is None:
    sys.exit(1)
stack = next((s for s in stacks if s["title"].strip().lower() == STACK_TITLE.strip().lower()), None)
if not stack:
    print(f"Stack '{STACK_TITLE}' not found. Create it first.", file=sys.stderr)
    sys.exit(1)
stack_id = stack["id"]

# 2. Next sort order for the stack
items = rest("GET", "lesson_stack_items", {"select": "sort_order", "stack_id": f"eq.{stack_id}", "order": "sort_order.desc", "limit": "1"})
if items is None:
    sys.exit(1)
sort_order = (items[0]["sort_order"] + 1) if items else 1

for card in CARDS:
    print(f"\n── {card['title']} ──")

    # 3. Find or create the drill set
    existing = rest("GET", "drill_sets", {"select": "id", "title": f"eq.{card['title']}"})
    if existing is None:
        sys.exit(1)

    if existing:
        drill_id = existing[0]["id"]
        print(f"Drill set exists (id={drill_id})")
    else:
        drill_set = {
            "title": card["title"],
            "description": card["description"],
            "subject_id": None,
            "level": LEVEL,
            "time_limit_minutes": TIME_LIMIT_MINUTES,
            "question_count": len(card["words"]),
            "card_type": "vocabulary",
            "capitalization_slug": "flash",
            "lesson_content": "",
        }
        result = rest("POST", "drill_sets", body=drill_set)
        if not result:
            print("Failed to create drill set", file=sys.stderr)
            sys.exit(1)
        drill_id = result[0]["id"]
        print(f"Created drill set: {drill_id}")

        stack_link = {"stack_id": stack_id, "drill_set_id": drill_id, "sort_order": sort_order}
        if rest("POST", "lesson_stack_items", body=stack_link):
            print(f"Added to '{STACK_TITLE}' stack (sort_order={sort_order})")
        else:
            print("Failed to add to stack", file=sys.stderr)
        sort_order += 1

    # 4. Sync words: insert any word not yet linked (matched by question text)
    links = rest("GET", "drill_set_questions", {"select": "question_id,question_number", "drill_set_id": f"eq.{drill_id}", "order": "question_number"})
    if links is None:
        sys.exit(1)

    existing_texts = set()
    if links:
        id_list = ",".join(str(l["question_id"]) for l in links)
        linked_questions = rest("GET", "questions", {"select": "id,question", "id": f"in.({id_list})"})
        if linked_questions is None:
            sys.exit(1)
        existing_texts = {q["question"] for q in linked_questions}

    next_number = (links[-1]["question_number"] + 1) if links else 1
    added = 0

    for word, meaning in card["words"]:
        if word in existing_texts:
            continue
        q_data = {
            "subject_id": None,
            "category": "English",
            "level": LEVEL,
            "year": 2026,
            "question": word,
            "option_a": "",
            "option_b": "",
            "option_c": "",
            "option_d": "",
            "option_e": "",
            "passage": "",
            "instruction": "",
            "correct_option": "a",
            "explanation": meaning,
        }
        result = rest("POST", "questions", body=q_data)
        if not result:
            print(f"  Word {next_number}: FAILED", file=sys.stderr)
            sys.exit(1)
        qid = result[0]["id"]
        link = {"drill_set_id": drill_id, "question_id": qid, "question_number": next_number}
        if not rest("POST", "drill_set_questions", body=link):
            print(f"  Word {next_number}: link FAILED", file=sys.stderr)
            sys.exit(1)
        print(f"  Word {next_number}: {word} (id={qid})")
        next_number += 1
        added += 1

    # 5. Keep question_count in sync
    total = len(existing_texts) + added
    patch = rest("PATCH", "drill_sets", {"id": f"eq.{drill_id}"}, body={"question_count": total})
    if patch is None:
        print("Failed to update question_count", file=sys.stderr)

    if added == 0:
        print(f"All {total} words already linked — nothing to do.")
    else:
        print(f"Added {added} word(s); drill set {drill_id} now has {total}.")
