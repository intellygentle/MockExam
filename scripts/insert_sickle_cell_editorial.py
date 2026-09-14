#!/usr/bin/env python3
"""Insert the Sickle Cell editorial drill set + questions into Supabase.

Adds a passage card under the Editorials stack, mirroring how
"Nigeria's Textile Import Dependence" was seeded.

Usage:
    py scripts/insert_sickle_cell_editorial.py

Reads SUPABASE_URL + SUPABASE_ANON_KEY from the environment or .env.local.
Safe to re-run: exits early if the drill set already exists.
"""
import json, os, re, sys, urllib.request, urllib.parse, urllib.error

TITLE = "Sickle Cell Epidemic: Tackling Fake Lab Results"
STACK_TITLE = "Editorials"
LEVEL = "ss3"
TIME_LIMIT_MINUTES = 30

PASSAGE = "\n".join([
    "Nigeria's record of holding a global lead as the epicentre of the world's sickle cell burden is deeply tragic for a country richly endowed with human and material resources. Also, against scientific and medical breakthroughs on the sickle cell scourge, it is unacceptable that the country accounts for over 150,000 newborns trapped in this agonising condition every year.",
    "Sickle cell disease (SCD) is a genetic blood disorder that affects haemoglobin, the protein responsible for carrying oxygen in red blood cells. Before the advent of modern medicine, high infant mortality from SCD in the country was misunderstood, as children with the disease were then perceived as Abiku among the Yoruba and Ogbanje among the Igbo and viewed as reincarnating spirits \u201cborn to die\u201d in a cycle of grief.",
    "Unfortunately, this narrative was not properly corrected for a long time before it became a menace, tearing families apart; no thanks to the failure to disseminate accurate diagnostics and information.",
    "Painfully, for decades, the national defence mechanism has rested on a single, clear-cut mandate passed down to citizens: \u201cknow your genotype before you marry.\u201d Millions of young Nigerians have dutifully walked into clinics, handed over their blood samples, and built their life plans around the slip of paper handed back to them.",
    "But a devastating systemic failure has hollowed out this defence. Medical laboratory experts have exposed a terrifying diagnostic reality, where up to 40 per cent of medical laboratory results for genotype testing in Nigeria are inaccurate or entirely falsified; 40 per cent of errors are damning, should not and never be encouraged to grow.",
    "This is no longer just a medical oversight; it is a national public health crisis, fast wreaking havoc on homes. Behind this clinical metric lies an immense trail of human suffering, marriages built on false promises, families financially ruined by unexpected medical expenses, and children condemned to lifetimes of unbearable, bone-crushing pain crises.",
    "For young couples attempting to make responsible reproductive choices, the laboratory has become a roulette wheel. The phenomenon of discordant or conflicting laboratory reports, where an individual is labelled \u201cAA\u201d (normal) by one clinic, only to discover years later they are actually \u201cAS\u201d or \u201cSC\u201d (carriers), has become terrifyingly common.",
    "Consider the tragic reality of mothers who, after receiving clear \u201cAA\u201d certifications in their youth, marry \u201cAS\u201d partners only to later watch their children suffer from severe sickle cell crises. A subsequent, frantic re-test reveals the horrific truth: the original lab report was completely wrong.",
    "Many parents have continued to fall victim to this error and have threatened legal action. For instance, Kawthar Abdulazeez, a mother of two, threatened to sue a laboratory after discovering that her genotype is SC, contrary to the AA result she received from the centre 13 years ago. Married to an AS partner based on that report, both their daughters have now been diagnosed with sickle cell SS.",
    "Abdulazeez blamed the diagnostic centre for what she described as a life-altering mistake.",
    "Another respondent, Adewole, would have suffered a similar fate. A private lab tested his genotype and found it to be AS. \u201cIt wasn't until a year before I graduated from the University that I was diagnosed with SC. This helped me in choosing a wife who is AA, and we have two healthy children now,\u201d he said.",
    "Painfully, these laboratory errors continue to emerge in a rather catastrophic manner. Various scenarios emerge, including the destruction of trust and preventable tragedies. For instance, blameless wives are frequently accused of infidelity when a child is born with the \u201cSS\u201d genotype, shattering otherwise stable families.",
    "There have also been situations where career couples enter marriages under the false impression that their children face zero risk, only to find themselves completely unprepared for the emotional and physical toll of managing a chronic genetic disorder.",
    "Clearly, the medical laboratory ecosystem has devolved into guesswork in far too many quarters. When science itself gives conflicting testimonies, the public is left entirely exposed to the very epidemic they are actively trying to avoid.",
    "So, how did the gatekeepers of Nigeria's diagnostic health become so unreliable? Findings revealed several distinct systemic failures.",
    "First, many private, standalone laboratories across the country still rely heavily on manual solubility tests. These primitive methods are notoriously unreliable and routinely misidentify individuals carrying the sickle cell trait or variant strains (like Hb C) as having a perfectly normal \u201cAA\u201d genotype. While the global standard has long shifted to fully automated digital analysis, such as High-Performance Liquid Chromatography (HPLC) or Haemoglobin Electrophoresis, the high acquisition costs of these modern diagnostic platforms keep them out of reach for the average local clinic.",
    "Second, Nigeria has increasingly become a dumping ground for uncalibrated equipment, expired chemical reagents, and substandard medical devices. When laboratory professionals are forced to work with compromised materials, even well-meaning technicians end up generating highly flawed data.",
    "Third, a severe regulatory deficit compounds these issues. Thousands of unregistered diagnostic operations operate in urban alleys and rural communities, frequently staffed by unqualified personnel and lacking Quality Management Systems (QMS). The Medical Laboratory Science Council of Nigeria (MLSCN) routinely struggles to police this sprawling, informal network of medical quackery. Shockingly, the problem even extends to outright fraud: some unethical technicians are known to accept bribes from individuals desperate to alter an \u201cAS\u201d status to \u201cAA\u201d just to force a marriage approval from sceptical family members or religious institutions.",
    "In addition, the Director of the Centre for Sickle Cell Research and Training in Africa (CESRTA), University of Abuja, Prof. Obiageli Nnodu, said that the low adoption of quality assurance management systems in the running of laboratories in Nigeria has led to many Nigerians having children with SCD, with even the little progress made in the area of premarital screening being undermined by the menace of inaccurate laboratory results.",
    "She observed that the already high prevalence of SCD is further exacerbated by poor genotype testing and stressed the need to enhance advocacy for stringent quality control measures in genotype testing.",
    "Nnodu noted that in a pediatric clinic in one of Nigeria's states, 40 per cent of those with sickle cell disease who attended had incorrect laboratory results.",
    "Truthfully, Nigeria must actively prevent the unintentional transmission of the sickle cell gene through flawless diagnostic science. Reclaiming the integrity of our healthcare system requires immediate, aggressive intervention on two distinct fronts.",
    "Public health agencies must urgently reframe how they educate the public. The long-standing messaging of \u201cknow your genotype\u201d must be updated to include a vital warning: \u201cDo not trust a single test from an unverified source.\u201d",
    "Citizens must be explicitly taught to seek cross-verification from accredited, secondary reference laboratories before making major marital or reproductive decisions. Further, community education must work to dismantle the deep social stigmas surrounding the sickle cell trait. When carrier status is not treated as a social death sentence, the desperation that drives individuals to bribe lab technicians to falsify paperwork will be removed.",
    "The Federal Government and health policymakers must treat diagnostic accuracy as a critical matter of national security. The state needs to legally phase out primitive manual solubility testing in favour of automated, digital chromatography. Simultaneously, the MLSCN must be empowered with the resources necessary to aggressively close down unaccredited facilities and penalise rogue practitioners.",
    "Nigeria cannot expect to successfully lower its crippling sickle cell burden while its baseline laboratory infrastructure remains fractured. The ongoing cycle of physical heartbreak and psychological trauma will continue to claim young lives until the country's medical authorities ensure that the science guiding citizens is absolutely beyond reproach.",
])

QUESTIONS = [
    "What is the central argument of this editorial, and how does the writer build the case that fake genotype results are a national crisis rather than a simple medical oversight?",
    "The writer describes the laboratory as \u201ca roulette wheel\u201d for young couples. Explain this metaphor and why it is an effective way to describe discordant genotype reports.",
    "Before modern medicine, how did Yoruba and Igbo communities explain high infant mortality from sickle cell disease? Why does the writer include this cultural background?",
    "Summarise the three systemic failures the editorial identifies within Nigeria's medical laboratory ecosystem, giving one detail or example for each.",
    "Why are manual solubility tests unreliable for genotype testing, and which modern diagnostic technologies does the editorial recommend as the global standard?",
    "Using the examples of Kawthar Abdulazeez and Adewole, explain the real-life consequences of receiving an incorrect genotype result.",
    "The editorial notes that blameless wives are sometimes accused of infidelity when a child is born with the \u201cSS\u201d genotype. How do laboratory errors destroy families in ways that go beyond the medical impact?",
    "According to Prof. Obiageli Nnodu, how does the low adoption of quality assurance management systems undermine premarital screening? What statistic does she cite from a pediatric clinic?",
    "What immediate interventions does the editorial demand on the \u201ctwo distinct fronts\u201d? Summarise each front in your own words.",
    "The editorial argues that diagnostic accuracy should be treated as \u201ca critical matter of national security.\u201d Do you agree with this framing? Support your position with evidence from the text.",
    {
        "text": "Fake and inaccurate medical laboratory test results have become a serious problem in your community, leading to wrong diagnoses and preventable suffering among residents. As the Secretary of your school's Health Club, write a letter to the Editor of a national newspaper, highlighting the problem, its causes, its effects on the community, and suggesting solutions the government and health authorities should adopt to address it.\n\nGuidance notes:\n- Format: Formal letter (sender's address, date, editor's address/\u201cThe Editor\u201d, salutation, subject heading, body, complimentary close, signature, and full name \u2014 no title before the name).\n- Content should mirror the write-up's structure:\n  1. Introduction \u2014 State the problem clearly (fake/inaccurate lab results in the community).\n  2. Background/Scale \u2014 Briefly explain how widespread or serious the issue is.\n  3. Causes \u2014 Identify at least 2\u20133 causes (e.g., outdated equipment, lack of regulation, unqualified staff, bribery/corruption).\n  4. Effects/Consequences \u2014 Describe the impact on families/individuals (use hypothetical or general examples, not necessarily real case studies).\n  5. Solutions/Recommendations \u2014 Suggest specific actions for government, regulatory bodies, and the public.\n  6. Conclusion \u2014 A closing appeal or call to action.\n- Register: Formal, persuasive, and objective \u2014 avoid slang or overly emotional language.\n- Length: Should not be less than 450 words (standard WAEC letter length).",
        "instruction": "Letter Writing",
    },
    {
        "text": "Read the passage titled \u201cSickle Cell Epidemic: Tackling Fake Lab Results Headlong\u201d and answer the question that follows.\n\nIn not more than 200 words, summarise the causes, effects, and suggested solutions to the problem of inaccurate sickle cell genotype test results in Nigeria, as presented in the passage.\n\nYour summary should be written in continuous prose (not in note form or as a list), using your own words as much as possible.",
        "instruction": "Summary Writing",
        # Mark scheme — stored in `explanation`, which the student UI never renders.
        "explanation": "Guidance notes for marking:\n\nAward marks for identifying and correctly summarising the following points, which the student should extract from the passage:\n\nCauses (identify at least 3):\n- Reliance on outdated/manual solubility testing methods instead of modern digital chromatography (HPLC)\n- Use of uncalibrated equipment, expired reagents, and substandard devices\n- Weak regulation \u2014 thousands of unregistered/unaccredited laboratories operate unchecked\n- Bribery/corruption \u2014 some technicians falsify results for a fee\n- Low adoption of Quality Management Systems (QMS) in laboratories\n\nEffects (identify at least 2):\n- Wrong marriage and reproductive decisions based on false results\n- Children born with sickle cell disease despite \u201csafe\u201d test results\n- Broken trust in marriages (false accusations of infidelity)\n- Emotional, physical, and financial toll on affected families\n- Erosion of public confidence in the healthcare system\n\nSolutions (identify at least 2):\n- Updated public health messaging urging cross-verification from accredited laboratories\n- Reducing stigma around carrier status to discourage falsification\n- Government phasing out manual testing in favour of automated digital methods\n- Strengthening and empowering the MLSCN to close illegal labs and penalise offenders\n\nDeduct marks for:\n- Exceeding the word count\n- Lifting whole sentences directly from the passage\n- Writing in note form instead of continuous prose\n- Omitting a full category (causes, effects, or solutions)",
    },
]

def question_entry(i):
    """Normalise QUESTIONS entries to dicts with text/instruction/explanation."""
    entry = QUESTIONS[i]
    if isinstance(entry, str):
        return {"text": entry, "instruction": None, "explanation": ""}
    return {
        "text": entry["text"],
        "instruction": entry.get("instruction"),
        "explanation": entry.get("explanation", ""),
    }

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

# 0. Find the drill set, or create it
existing = rest("GET", "drill_sets", {"select": "id", "title": f"eq.{TITLE}"})
if existing is None:
    sys.exit(1)

if existing:
    drill_id = existing[0]["id"]
    print(f"Drill set exists (id={drill_id})")
else:
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

    # 3. Insert drill set (passage card: description holds the full article text)
    drill_set = {
        "title": TITLE,
        "description": PASSAGE,
        "subject_id": None,
        "level": LEVEL,
        "time_limit_minutes": TIME_LIMIT_MINUTES,
        "question_count": len(QUESTIONS),
        "card_type": "passage",
    }
    result = rest("POST", "drill_sets", body=drill_set)
    if not result:
        print("Failed to create drill set", file=sys.stderr)
        sys.exit(1)
    drill_id = result[0]["id"]
    print(f"Created drill set: {drill_id} - {TITLE}")

    # 4. Add to the Editorials stack
    stack_link = {"stack_id": stack_id, "drill_set_id": drill_id, "sort_order": sort_order}
    if rest("POST", "lesson_stack_items", body=stack_link):
        print(f"Added drill set {drill_id} to '{STACK_TITLE}' stack (id={stack_id}, sort_order={sort_order})")
    else:
        print("Failed to add to stack", file=sys.stderr)

# 5. Sync questions: insert any QUESTIONS entry not yet linked (matched by text)
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

for i in range(len(QUESTIONS)):
    entry = question_entry(i)
    if entry["text"] in existing_texts:
        continue
    instruction = entry["instruction"] or f"Question {next_number}"
    q_data = {
        "subject_id": None,
        "category": "English",
        "level": LEVEL,
        "year": 2026,
        "question": entry["text"],
        "option_a": "",
        "option_b": "",
        "option_c": "",
        "option_d": "",
        "option_e": "",
        "passage": "",
        "instruction": instruction,
        "correct_option": "a",
        "explanation": entry["explanation"],
    }
    result = rest("POST", "questions", body=q_data)
    if not result:
        print(f"  Q{next_number}: FAILED", file=sys.stderr)
        sys.exit(1)
    qid = result[0]["id"]
    link = {"drill_set_id": drill_id, "question_id": qid, "question_number": next_number}
    if not rest("POST", "drill_set_questions", body=link):
        print(f"  Q{next_number}: link FAILED", file=sys.stderr)
        sys.exit(1)
    print(f"  Q{next_number} [{instruction}]: id={qid}")
    next_number += 1
    added += 1

# 6. Keep question_count in sync with the actual number of linked questions
total = len(existing_texts) + added
patch = rest("PATCH", "drill_sets", {"id": f"eq.{drill_id}"}, body={"question_count": total})
if patch is None:
    print("Failed to update question_count", file=sys.stderr)

if added == 0:
    print(f"All {total} questions already linked — nothing to do.")
else:
    print(f"Added {added} question(s); drill set {drill_id} now has {total}.")
