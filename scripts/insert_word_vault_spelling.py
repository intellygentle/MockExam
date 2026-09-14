#!/usr/bin/env python3
"""Insert the Spelling Bee stack + Word Vault spelling card into Supabase.

Creates:
  1. A new 'Spelling Bee' lesson stack.
  2. The first card — 'Word Vault Spelling Bee' — a vocabulary-card variant
     (card_type='vocabulary', capitalization_slug='spelling') rendered by
     SpellingCard as 6 staged categories. Words are stored as question rows
     (question=word, explanation=RP phonetic transcription) linked in order
     so category = floor((question_number-1)/20). Category names/descriptions
     live in the drill set's lesson_content JSON.

Source: "New sets of materials/Word_Vault_Word_List.docx"

Usage:
    py scripts/insert_word_vault_spelling.py

Reads SUPABASE_URL + SUPABASE_ANON_KEY from the environment or .env.local.
Safe to re-run: existing stack/set are left alone and missing words are synced.
"""
import json, os, re, sys, urllib.request, urllib.parse, urllib.error

STACK_TITLE = "Spelling Bee"
STACK_DESCRIPTION = "Spelling practice with British English phonetic transcriptions — study the words, then spell them from sound alone."
STACK_ICON = "🐝"

SET_TITLE = "Word Vault Spelling Bee"
SET_DESCRIPTION = "120 words across six categories, each with its British English (Oxford / RP) phonetic transcription. Study each category's words, then spell them from the transcription alone using the on-screen keyboard. Complete all six stages to master the vault."
LEVEL = "ss3"
TIME_LIMIT_MINUTES = 60
SLUG = "spelling"

CATEGORIES = [
    {
        "name": "Words where a vowel is silently dropped or added",
        "description": "Usually said quickly in normal speech, so a syllable gets swallowed or an extra sound creeps in when spelling by ear.",
    },
    {
        "name": "Silent letters",
        "description": "A letter is written but not pronounced, so a word spelled purely by sound will often leave it out.",
    },
    {
        "name": "Unexpected letter combinations",
        "description": "Especially the many ways \u201cough\u201d and similar clusters are pronounced \u2014 the spelling gives no reliable clue to the sound.",
    },
    {
        "name": "\u201cie / ei\u201d and doubled-letter confusions",
        "description": "Words where the ie/ei order or a doubled consonant is easy to guess wrong because it isn't audible in speech.",
    },
    {
        "name": "Everyday words often misspelled by sound",
        "description": "High-frequency words where the casual pronunciation doesn't match the spelling.",
    },
    {
        "name": "British spelling patterns",
        "description": "British/Nigerian-curriculum spellings often swapped for the American form seen online (colour vs. color, centre vs. center).",
    },
]

# (word, RP transcription) — 20 per category, order preserved for staging
WORDS = [
    # 1. Vowel silently dropped or added
    ("every", "/\u02c8evri/"),
    ("heavy", "/\u02c8hevi/"),
    ("hurt", "/h\u025c\u02d0t/"),
    ("listen", "/\u02c8l\u026asn/"),
    ("business", "/\u02c8b\u026azn\u0259s/"),
    ("different", "/\u02c8d\u026afr\u0259nt/"),
    ("chocolate", "/\u02c8t\u0283\u0252kl\u0259t/"),
    ("vegetable", "/\u02c8ved\u0292t\u0259bl/"),
    ("interesting", "/\u02c8\u026antr\u0259st\u026a\u014b/"),
    ("restaurant", "/\u02c8restr\u0252nt/"),
    ("comfortable", "/\u02c8k\u028cmft\u0259bl/"),
    ("family", "/\u02c8f\u00e6m\u0259li/"),
    ("separate (adj.)", "/\u02c8sepr\u0259t/"),
    ("temperature", "/\u02c8tempr\u0259t\u0283\u0259(r)/"),
    ("history", "/\u02c8h\u026astri/"),
    ("camera", "/\u02c8k\u00e6mr\u0259/"),
    ("general", "/\u02c8d\u0292enr\u0259l/"),
    ("several", "/\u02c8sevr\u0259l/"),
    ("average", "/\u02c8\u00e6v\u0259r\u026ad\u0292/"),
    ("memory", "/\u02c8mem\u0259ri/"),
    # 2. Silent letters
    ("honest", "/\u02c8\u0252n\u026ast/"),
    ("guard", "/\u0261\u0251\u02d0d/"),
    ("answer", "/\u02c8\u0251\u02d0ns\u0259(r)/"),
    ("calendar", "/\u02c8k\u00e6l\u026and\u0259(r)/"),
    ("half", "/h\u0251\u02d0f/"),
    ("could", "/k\u028ad/"),
    ("would", "/w\u028ad/"),
    ("should", "/\u0283\u028ad/"),
    ("knife", "/na\u026af/"),
    ("island", "/\u02c8a\u026al\u0259nd/"),
    ("autumn", "/\u02c8\u0254\u02d0t\u0259m/"),
    ("condemn", "/k\u0259n\u02c8dem/"),
    ("foreign", "/\u02c8f\u0252r\u0259n/"),
    ("ghost", "/\u0261\u0259\u028ast/"),
    ("climb", "/kla\u026am/"),
    ("thumb", "/\u03b8\u028cm/"),
    ("comb", "/k\u0259\u028am/"),
    ("wrist", "/r\u026ast/"),
    ("sword", "/s\u0254\u02d0d/"),
    ("muscle", "/\u02c8m\u028csl/"),
    # 3. Unexpected letter combinations
    ("though", "/\u00f0\u0259\u028a/"),
    ("enough", "/\u026a\u02c8n\u028cf/"),
    ("laugh", "/l\u0251\u02d0f/"),
    ("through", "/\u03b8ru\u02d0/"),
    ("thought", "/\u03b8\u0254\u02d0t/"),
    ("daughter", "/\u02c8d\u0254\u02d0t\u0259(r)/"),
    ("neighbour", "/\u02c8ne\u026ab\u0259(r)/"),
    ("height", "/ha\u026at/"),
    ("weight", "/we\u026at/"),
    ("straight", "/stre\u026at/"),
    ("caught", "/k\u0254\u02d0t/"),
    ("bought", "/b\u0254\u02d0t/"),
    ("cough", "/k\u0252f/"),
    ("rough", "/r\u028cf/"),
    ("tough", "/t\u028cf/"),
    ("thorough", "/\u02c8\u03b8\u028cr\u0259/"),
    ("brought", "/br\u0254\u02d0t/"),
    ("fought", "/f\u0254\u02d0t/"),
    ("eight", "/e\u026at/"),
    ("freight", "/fre\u026at/"),
    # 4. "ie / ei" and doubled-letter confusions
    ("believe", "/b\u026a\u02c8li\u02d0v/"),
    ("friend", "/frend/"),
    ("receive", "/r\u026a\u02c8si\u02d0v/"),
    ("people", "/\u02c8pi\u02d0pl/"),
    ("beautiful", "/\u02c8bju\u02d0t\u026afl/"),
    ("necessary", "/\u02c8nes\u0259s\u0259ri/"),
    ("accommodate", "/\u0259\u02c8k\u0252m\u0259de\u026at/"),
    ("embarrass", "/\u026am\u02c8b\u00e6r\u0259s/"),
    ("occasion", "/\u0259\u02c8ke\u026a\u0292n/"),
    ("disappear", "/\u02ccd\u026as\u0259\u02c8p\u026a\u0259(r)/"),
    ("occurred", "/\u0259\u02c8k\u025c\u02d0d/"),
    ("beginning", "/b\u026a\u02c8\u0261\u026an\u026a\u014b/"),
    ("achieve", "/\u0259\u02c8t\u0283i\u02d0v/"),
    ("relief", "/r\u026a\u02c8li\u02d0f/"),
    ("ceiling", "/\u02c8si\u02d0l\u026a\u014b/"),
    ("deceive", "/d\u026a\u02c8si\u02d0v/"),
    ("niece", "/ni\u02d0s/"),
    ("thief", "/\u03b8i\u02d0f/"),
    ("chief", "/t\u0283i\u02d0f/"),
    ("grief", "/\u0261ri\u02d0f/"),
    # 5. Everyday words often misspelled by sound
    ("said", "/sed/"),
    ("does", "/d\u028cz/"),
    ("because", "/b\u026a\u02c8k\u0252z/"),
    ("definitely", "/\u02c8def\u026an\u0259tli/"),
    ("probably", "/\u02c8pr\u0252b\u0259bli/"),
    ("actually", "/\u02c8\u00e6kt\u0283u\u0259li/"),
    ("really", "/\u02c8ri\u02d0\u0259li/"),
    ("February", "/\u02c8febru\u0259ri/"),
    ("Wednesday", "/\u02c8wenzde\u026a/"),
    ("government", "/\u02c8\u0261\u028cv\u0259nm\u0259nt/"),
    ("important", "/\u026am\u02c8p\u0254\u02d0tnt/"),
    ("especially", "/\u026a\u02c8spe\u0283\u0259li/"),
    ("particularly", "/p\u0259\u02c8t\u026akj\u0259l\u0259li/"),
    ("quiet", "/\u02c8kwa\u026a\u0259t/"),
    ("quite", "/kwa\u026at/"),
    ("whether", "/\u02c8we\u00f0\u0259(r)/"),
    ("weather", "/\u02c8we\u00f0\u0259(r)/"),
    ("breakfast", "/\u02c8brekf\u0259st/"),
    ("minute (noun)", "/\u02c8m\u026an\u026at/"),
    ("threw", "/\u03b8ru\u02d0/"),
    # 6. British spelling patterns
    ("colour", "/\u02c8k\u028cl\u0259(r)/"),
    ("favourite", "/\u02c8fe\u026av\u0259r\u026at/"),
    ("humour", "/\u02c8hju\u02d0m\u0259(r)/"),
    ("centre", "/\u02c8sent\u0259(r)/"),
    ("travelling", "/\u02c8tr\u00e6v\u0259l\u026a\u014b/"),
    ("organise", "/\u02c8\u0254\u02d0\u0261\u0259na\u026az/"),
    ("realise", "/\u02c8r\u026a\u0259la\u026az/"),
    ("honour", "/\u02c8\u0252n\u0259(r)/"),
    ("labour", "/\u02c8le\u026ab\u0259(r)/"),
    ("theatre", "/\u02c8\u03b8\u026a\u0259t\u0259(r)/"),
    ("metre", "/\u02c8mi\u02d0t\u0259(r)/"),
    ("programme", "/\u02c8pr\u0259\u028a\u0261r\u00e6m/"),
    ("cheque", "/t\u0283ek/"),
    ("jewellery", "/\u02c8d\u0292u\u02d0\u0259lri/"),
    ("practise (verb)", "/\u02c8pr\u00e6kt\u026as/"),
    ("defence", "/d\u026a\u02c8fens/"),
    ("licence (noun)", "/\u02c8la\u026asns/"),
    ("offence", "/\u0259\u02c8fens/"),
    ("analyse", "/\u02c8\u00e6n\u0259la\u026az/"),
    ("apologise", "/\u0259\u02c8p\u0252l\u0259d\u0292a\u026az/"),
]

assert len(WORDS) == 120, f"expected 120 words, got {len(WORDS)}"
for i in range(6):
    assert len(WORDS[i * 20:(i + 1) * 20]) == 20, f"category {i + 1} does not have 20 words"

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

# 1. Create the Spelling Bee stack if missing
stacks = rest("GET", "lesson_stacks", {"select": "id,title"})
if stacks is None:
    sys.exit(1)
stack = next((s for s in stacks if s["title"].strip().lower() == STACK_TITLE.strip().lower()), None)
if stack:
    stack_id = stack["id"]
    print(f"Stack '{STACK_TITLE}' exists (id={stack_id})")
else:
    result = rest("POST", "lesson_stacks", body={
        "title": STACK_TITLE,
        "description": STACK_DESCRIPTION,
        "icon": STACK_ICON,
    })
    if not result:
        print("Failed to create stack", file=sys.stderr)
        sys.exit(1)
    stack_id = result[0]["id"]
    print(f"Created stack '{STACK_TITLE}' (id={stack_id})")

# 2. Create the drill set if missing
existing = rest("GET", "drill_sets", {"select": "id", "title": f"eq.{SET_TITLE}"})
if existing is None:
    sys.exit(1)

if existing:
    drill_id = existing[0]["id"]
    print(f"Drill set exists (id={drill_id})")
else:
    drill_set = {
        "title": SET_TITLE,
        "description": SET_DESCRIPTION,
        "subject_id": None,
        "level": LEVEL,
        "time_limit_minutes": TIME_LIMIT_MINUTES,
        "question_count": len(WORDS),
        "card_type": "vocabulary",
        "capitalization_slug": SLUG,
        "lesson_content": json.dumps({"categories": CATEGORIES}),
    }
    result = rest("POST", "drill_sets", body=drill_set)
    if not result:
        print("Failed to create drill set", file=sys.stderr)
        sys.exit(1)
    drill_id = result[0]["id"]
    print(f"Created drill set: {drill_id} - {SET_TITLE}")

    # 3. Add to the Spelling Bee stack (first card)
    stack_link = {"stack_id": stack_id, "drill_set_id": drill_id, "sort_order": 1}
    if rest("POST", "lesson_stack_items", body=stack_link):
        print(f"Added to '{STACK_TITLE}' stack (sort_order=1)")
    else:
        print("Failed to add to stack", file=sys.stderr)

# 4. Sync words: insert any word not yet linked, preserving order
links = rest("GET", "drill_set_questions", {"select": "question_id,question_number", "drill_set_id": f"eq.{drill_id}", "order": "question_number"})
if links is None:
    sys.exit(1)

existing_texts = {}
if links:
    id_list = ",".join(str(l["question_id"]) for l in links)
    linked_questions = rest("GET", "questions", {"select": "id,question", "id": f"in.({id_list})"})
    if linked_questions is None:
        sys.exit(1)
    existing_texts = {q["question"]: q["id"] for q in linked_questions}

next_number = (links[-1]["question_number"] + 1) if links else 1
added = 0

for word, transcription in WORDS:
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
        "explanation": transcription,
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
    print(f"  {next_number:3d}. {word} {transcription}")
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
