#!/usr/bin/env python3
"""Insert the Sickle Cell vocabulary exercise drill sets into Supabase.

Creates two exercise cards from
"New sets of materials/Vocabulary_Worksheet_Sickle_Cell.md":
  1. Matching Exercise (Section A) — each word shown with 4 candidate
     meanings; the student picks the correct one.
  2. Fill in the Blanks (Section B) — 30 sentences with one gap each and
     a word bank of all 30 glossary words.

Both cards use card_type='vocabulary' and are distinguished by
capitalization_slug ('matching' / 'blanks'), which the app renders with
the matching / blanks modes of VocabularyCard. The exercise data lives in
the drill set's lesson_content JSON. The 30 glossary words are shared:
existing question rows from the flash vocabulary cards are re-linked
instead of duplicated.

Usage:
    py scripts/insert_sickle_cell_exercises.py

Reads SUPABASE_URL + SUPABASE_ANON_KEY from the environment or .env.local.
Safe to re-run: existing sets are left alone and missing links are synced.
"""
import json, os, re, sys, urllib.request, urllib.parse, urllib.error

STACK_TITLE = "Editorials"
LEVEL = "ss3"
TIME_LIMIT_MINUTES = 30

# ── The 30-word glossary (order matches the worksheet) ──
WORDS = [
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
]

# ── Section B sentences (gap = "___", answers use each word exactly once) ──
BLANKS = [
    ("Malaria remains a major public health ___ in many developing countries.", "scourge"),
    ("Before getting married, couples are advised to know their ___ to avoid having children with sickle cell disease.", "genotype"),
    ("The two laboratory reports were ___, one showing \u201cAA\u201d and the other showing \u201cAS\u201d for the same patient.", "discordant"),
    ("Without proper government oversight, the country has become a ___ for fake and expired drugs.", "dumping ground"),
    ("Patients are advised to seek ___ from a second, more reliable laboratory before trusting any single result.", "cross-verification"),
    ("Many quack laboratories operate without properly ___ equipment, leading to wrong results.", "calibrated"),
    ("Only results from ___ laboratories should be trusted for something as serious as premarital screening.", "accredited"),
    ("High-Performance Liquid ___ is one of the modern methods used to accurately determine a person's genotype.", "chromatography"),
    ("For many couples, choosing a laboratory has become like spinning a ___, since no one is sure the result will be accurate.", "roulette wheel"),
    ("A severe ___ has allowed thousands of unqualified laboratories to operate freely across the country.", "regulatory deficit"),
    ("When trusted institutions begin to fail the public, the entire system of protection has been ___ from within.", "hollowed out"),
    ("Children living with sickle cell disease often suffer from ___ pain that can last for days.", "bone-crushing"),
    ("Many Nigerians still attach a ___ to carrying the sickle cell trait, which discourages open discussion.", "stigma"),
    ("The rise of medical ___ in unregulated clinics has put many innocent lives at risk.", "quackery"),
    ("Health authorities must ensure that all diagnostic processes are ___ so that the public can fully trust them again.", "beyond reproach"),
    ("Test tubes and other ___ used in the laboratory must not be expired or contaminated.", "reagents"),
    ("The ___ of unregistered laboratories across the country makes regulation extremely difficult.", "sprawling"),
    ("Doctors describe the diagnostic laboratory system in the country as a broken ___ badly in need of reform.", "ecosystem"),
    ("The ___ of sickle cell disease is especially high in certain regions of the country.", "prevalence"),
    ("Health organisations have stepped up ___ for stricter regulation of medical laboratories.", "advocacy"),
    ("It is now standard practice for couples to undergo ___ genotype screening before their wedding.", "premarital"),
    ("Health authorities plan to ___ the use of outdated manual testing methods within the next few years.", "phase out"),
    ("Government agencies have promised to ___ any laboratory found guilty of issuing fraudulent results.", "penalise"),
    ("The problem is not limited to a few bad laboratories; it is a ___ failure affecting the entire testing process.", "systemic"),
    ("Medical laboratories are meant to serve as ___ that protect the public from making uninformed health decisions.", "gatekeepers"),
    ("Out of sheer ___, some couples turn to unqualified laboratories that promise the results they want to hear.", "desperation"),
    ("The consequences of relying on fake results can be truly ___ for affected families.", "catastrophic"),
    ("Some experts describe the entire diagnostic system as having ___ into outright guesswork, no longer reliable at any level.", "devolved"),
    ("Nigeria has been referred to as the ___ of the world's sickle cell burden.", "epicentre"),
    ("When laboratory equipment and reagents are ___, the accuracy of test results can no longer be guaranteed.", "compromised"),
]


def build_match_questions():
    """One MCQ per word: the correct meaning plus 3 distractor meanings,
    taken from other glossary entries (i+10, i+15, i+20 mod 30) so they are
    always distinct. The correct option is rotated through the 4 slots."""
    total = len(WORDS)
    questions = []
    for i, (word, meaning) in enumerate(WORDS):
        distractors = [
            WORDS[(i + 10) % total][1],
            WORDS[(i + 15) % total][1],
            WORDS[(i + 20) % total][1],
        ]
        answer_index = i % 4
        options = distractors[:]
        options.insert(answer_index, meaning)
        questions.append({"word": word, "options": options, "answerIndex": answer_index})
    return questions


CARDS = [
    {
        "title": "Sickle Cell Vocabulary: Matching Exercise",
        "description": "Match each of the 30 words from the Sickle Cell editorial vocabulary glossary to its correct meaning. Each word comes with four candidate meanings — pick the right one. Wrong picks are counted, so aim for a perfect run.",
        "capitalization_slug": "matching",
        "lesson_content": json.dumps({"matchQuestions": build_match_questions()}),
    },
    {
        "title": "Sickle Cell Vocabulary: Fill in the Blanks",
        "description": "Complete 30 sentences using the words from the Sickle Cell editorial vocabulary glossary. Pick the correct word from the word bank for each blank — every word is used exactly once.",
        "capitalization_slug": "blanks",
        "lesson_content": json.dumps([{"text": t, "gapWord": w} for t, w in BLANKS]),
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
            "question_count": len(WORDS),
            "card_type": "vocabulary",
            "capitalization_slug": card["capitalization_slug"],
            "lesson_content": card["lesson_content"],
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

    # 4. Link the 30 glossary words (reuse existing question rows where possible)
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

    for word, meaning in WORDS:
        if word in existing_texts:
            continue

        # Reuse an existing question row for this word (from the flash cards)
        found = rest("GET", "questions", {"select": "id", "question": f"eq.{word}", "level": f"eq.{LEVEL}", "category": "eq.English", "limit": "1"})
        if found:
            qid = found[0]["id"]
        else:
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
        print(f"  Word {next_number}: {word} (question id={qid})")
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
        print(f"Linked {added} word(s); drill set {drill_id} now has {total}.")
