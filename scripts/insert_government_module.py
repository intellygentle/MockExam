#!/usr/bin/env python3
"""
Insert the "Government Module 1" stack content (idempotent).

Source: Download/Government_Study_Module_1.docx (+ ..._with_Vocab.docx for the
complete answer key). Creates two drill sets under the "Government Lessons"
stack (id 10):

  1. Study card  — card_type 'study', the Unit 1.1–1.4 lesson notes stored as a
     rulesNote in lesson_content (rendered read-only by RulesStudyScreen).
  2. Question card — card_type 'quiz', 40 MCQs in the questions table, linked
     via drill_set_questions.

Runs through the Supabase Management API. Safe to re-run: existing sets are
left alone, questions are only inserted when the set has no linked questions,
and stack links use WHERE NOT EXISTS. Nothing is ever deleted.

Required in .env / .env.local (never paste tokens in chat):
  SUPABASE_URL            e.g. https://<ref>.supabase.co (ref derived)
  SUPABASE_ACCESS_TOKEN   personal access token with SQL access

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

STACK_TITLE = "Government Lessons"
SUBJECT_NAME = "Government"
LEVEL = "ss3"
QUIZ_TIME_LIMIT = 40

STUDY_TITLE = "Government Module 1: Study Notes"
STUDY_DESC = (
    "Meaning, scope and basic concepts of Government. Study the Unit 1.1–1.4 "
    "notes, then take the 40 practice questions."
)
STUDY_SLUG = "government-intro-study"

QUIZ_TITLE = "Government Module 1: Practice Questions (1–40)"
QUIZ_DESC = (
    "Forty multiple-choice questions on the meaning, scope and basic concepts "
    "of Government — timed practice for WAEC / NECO / JAMB."
)

# ── Study notes (Unit 1.1–1.4), stored as a rulesNote in lesson_content ──
STUDY_BLOCKS = [
    {"kind": "heading", "text": "📘 Unit 1.1: Government as an Institution of the State"},
    {
        "kind": "text",
        "text": (
            "Government as an institution is the legal machinery, political apparatus, or agency "
            "through which the will of the state is formulated, expressed, and enforced. It represents "
            "the concrete, physical architecture of sovereign authority."
        ),
    },
    {"kind": "subheading", "text": "The Three Organs of Government"},
    {
        "kind": "bullets",
        "items": [
            "The Legislature: The law-making body. Examples include the National Assembly in Nigeria, Congress in the United States, and Parliament in the United Kingdom.",
            "The Executive: The law-enforcing, implementing, and administrative branch. This encompasses the President, Prime Minister, Cabinet Ministers, Law Enforcement, and the Civil Service.",
            "The Judiciary: The law-interpreting and adjudicating body. It settles legal disputes, protects civil liberties, and penalizes constitutional infractions.",
        ],
    },
    {"kind": "subheading", "text": "Essential Terminologies"},
    {
        "kind": "bullets",
        "items": [
            "Separation of Powers: The constitutional principle dividing state authority among independent legislative, executive, and judicial arms to avoid autocracy.",
            "Checks and Balances: A system enabling each organ of government to limit the excesses and supervise the operations of the other branches.",
            "The State: A politically organized community occupying a defined territorial space with a permanent population and sovereign authority. The state is permanent, whereas government changes periodically.",
        ],
    },
    {"kind": "heading", "text": "🏛️ Unit 1.2: Government as a Process or Art of Governing"},
    {
        "kind": "text",
        "text": (
            "Government as a process refers to the dynamic actions, methods, administrative policies, "
            "and mechanisms through which public power is deployed and social affairs are managed. "
            "It is the active practice of ruling."
        ),
    },
    {"kind": "subheading", "text": "Core Administrative Functions"},
    {
        "kind": "bullets",
        "items": [
            "Policy Formulation and Implementation: Identifying socio-economic demands, designing fiscal budgets, and executing national developmental plans.",
            "Maintenance of Law and Order: Preserving domestic peace and safeguarding civilian lives and physical assets via internal security networks.",
            "Conflict Resolution: Arbitrating political, socio-cultural, or economic grievances to maintain systemic stability.",
            "Resource Allocation: Generating revenue via taxation, customs tariffs and national royalties, then distributing it strategically across sectors.",
        ],
    },
    {"kind": "heading", "text": "🎓 Unit 1.3: Government as an Academic Field of Study"},
    {
        "kind": "text",
        "text": (
            "Government as an academic discipline (synonymous with Political Science) is the systematic "
            "and empirical study of political values, institutions, public policies, structural theories, "
            "and the patterns of power distribution."
        ),
    },
    {"kind": "subheading", "text": "Primary Academic Branches"},
    {
        "kind": "bullets",
        "items": [
            "Political Theory: Examines foundational political concepts, ideologies, and classical philosophies championed by thinkers like Aristotle, Thomas Hobbes, John Locke, and Karl Marx.",
            "Comparative Politics: The empirical comparison of different governance mechanisms, operational frameworks, and national constitutions (e.g., presidential versus parliamentary structures).",
            "International Relations: Studies foreign policy, cross-border diplomacy, transnational treaties, and global intergovernmental organizations such as the UN, AU, and ECOWAS.",
            "Public Administration: Analyzes civil service structures, systemic bureaucracy, public policy deployment, and grassroots local government networks.",
        ],
    },
    {"kind": "heading", "text": "💡 Unit 1.4: Basic Political Concepts"},
    {
        "kind": "bullets",
        "items": [
            "Power: The capacity or behavioural potential to compel submission or modify individual choices, frequently backed by physical coercion or penalties.",
            "Authority: The legitimate, constitutionally institutionalized, or legal right to exercise power and command public compliance.",
            "Legitimacy: The collective recognition, acceptance, and moral approval by citizens regarding the right of a specific governing regime to rule.",
            "Sovereignty: The supreme, absolute, and ultimate legal authority of an independent state to make and enforce laws over its populace within a defined territory, free from external dictation.",
        ],
    },
    {
        "kind": "review",
        "title": "Quick revision",
        "items": [
            "Government as an Institution: the legal machinery (Legislature, Executive, Judiciary) through which state laws are made and executed.",
            "Government as a Process: the active art of governing — policy making, keeping order, budget execution and conflict resolution.",
            "Government as an Academic Field: also called Political Science; it studies theories, structures, local/international systems and political cultures.",
            "Basic Concepts: Power (coercion), Authority (legal right), Legitimacy (public acceptance) and Sovereignty (absolute power).",
        ],
    },
]

# ── The 40 practice questions: (question, [a, b, c, d], correct letter, explanation) ──
QUESTIONS = [
    (
        "Government as an institution of the state can best be defined as the",
        ["act of maintaining law and order by police forces.", "social study of political ideologies and philosophies.", "machinery or apparatus set up to manage public affairs.", "body of voters who participate in national elections."],
        "c",
        "Government as an institution is the legal machinery or apparatus of the state that manages public affairs.",
    ),
    (
        "Which organ of government is primarily tasked with the formulation of laws?",
        ["The Judiciary", "The Executive", "The Legislature", "The Civil Service"],
        "c",
        "The Legislature is the law-making organ of government.",
    ),
    (
        "The executive arm of government includes all the following except the",
        ["Prime Minister.", "Speaker of the House.", "Civil Servants.", "Police Commissioner."],
        "b",
        "The Speaker of the House is a legislator, not part of the executive arm.",
    ),
    (
        "The principle that divides state powers into three independent structures to safeguard liberty is known as",
        ["Checks and Balances.", "Representative Bureaucracy.", "Separation of Powers.", "Judicial Activism."],
        "c",
        "Separation of Powers divides state authority among the three arms to prevent tyranny.",
    ),
    (
        "When a court declares an executive action unconstitutional, it is exercising the principle of",
        ["Checks and Balances.", "Centralized Administration.", "Parliamentary Sovereignty.", "Delegated Legislation."],
        "a",
        "Judicial review of an executive action is an exercise of Checks and Balances.",
    ),
    (
        "The permanent, non-political administrative wing of the executive organ is called the",
        ["Judiciary.", "Electoral Commission.", "Civil Service.", "Local Government Council."],
        "c",
        "The Civil Service is the permanent, non-political administrative arm of the executive.",
    ),
    (
        "Unlike the State, a government",
        ["possesses absolute permanence.", "is a concrete agent that changes periodically.", "has a defined territory of its own.", "cannot be recognized internationally."],
        "b",
        "Government is a concrete agent that changes periodically, while the State is permanent.",
    ),
    (
        "The organ of government responsible for resolving constitutional disputes and punishing offenders is the",
        ["Legislature.", "Executive.", "Judiciary.", "Cabinet."],
        "c",
        "The Judiciary interprets the law and settles constitutional disputes.",
    ),
    (
        "In a bicameral legislature, the law-making institution consists of",
        ["three distinct chambers.", "two separate chambers.", "a single unified chamber.", "an executive committee."],
        "b",
        "A bicameral legislature has two chambers (e.g. Senate and House of Representatives).",
    ),
    (
        "The allocation of separate tasks to individual arms of government to maximize efficiency is an example of",
        ["Delegated Legislation.", "Division of Labour.", "Centralization of Power.", "Authoritarian Control."],
        "b",
        "Assigning separate tasks to different arms to improve efficiency is Division of Labour.",
    ),
    (
        "Government as a process or an art refers primarily to the",
        ["study of ancient constitutional developments.", "dynamic execution of policies and public management.", "collection of structures like courtrooms and parliaments.", "publishing of civil education handbooks."],
        "b",
        "Government as a process is the dynamic execution of policies and management of public affairs.",
    ),
    (
        "Which of the following is a primary functional activity of government as a process?",
        ["Establishing private business corporations", "Formulating national budgets and collecting taxes", "Standardizing vocabulary for academic examinations", "Constructing non-governmental organization networks"],
        "b",
        "Formulating budgets and collecting taxes are core functional activities of government as a process.",
    ),
    (
        "The process by which a government maintains social harmony by settling disputes among ethnic groups is called",
        ["Political Socialization.", "Conflict Resolution.", "Resource Maximization.", "Constitutional Review."],
        "b",
        "Settling disputes to maintain harmony is Conflict Resolution.",
    ),
    (
        "When a government implements a state-wide curfew during a crisis, it is exercising its function of",
        ["Public Administration.", "Maintaining Law and Order.", "Comparative Analysis.", "Judicial Adjudication."],
        "b",
        "A curfew protects lives and property — this is Maintaining Law and Order.",
    ),
    (
        "The pattern or style of a governing process that allows full citizen participation is termed",
        ["Autocracy.", "Oligarchy.", "Democracy.", "Plutocracy."],
        "c",
        "Democracy allows full citizen participation in governance.",
    ),
    (
        "Revenue generation by the process of government relies most heavily on",
        ["foreign aid loans.", "taxation and customs duties.", "private corporate investments.", "community donations."],
        "b",
        "Government relies most heavily on taxation and customs duties for revenue.",
    ),
    (
        "The administrative action of distributing national wealth across federal, state, and local tiers is known as",
        ["Revenue Allocation.", "Legislative Oversight.", "Judicial Review.", "Boundary Delimitation."],
        "a",
        "Distributing national wealth across the tiers of government is Revenue Allocation.",
    ),
    (
        "The process of governing is guided fundamentally by the rules contained in the nation's",
        ["Gazette.", "Manifesto.", "Constitution.", "Hansard."],
        "c",
        "The Constitution contains the fundamental rules that guide governance.",
    ),
    (
        "Policy implementation, as an active process of government, is the immediate duty of the",
        ["Judicial bench.", "Executive arm.", "Backbenchers in parliament.", "Electorate."],
        "b",
        "The Executive arm implements government policies.",
    ),
    (
        "A chaotic society without an active process of government or ruling authority is in a state of",
        ["Bureaucracy.", "Totalitarianism.", "Anarchy.", "Oligarchy."],
        "c",
        "A society without government or ruling authority is in a state of Anarchy.",
    ),
    (
        "Government as an academic field of study is formally called",
        ["Sociology.", "Jurisprudence.", "Political Science.", "Public Relations."],
        "c",
        "Government as an academic field is formally called Political Science.",
    ),
    (
        "The sub-field of political science that systematically compares the constitutions of different nations is",
        ["International Relations.", "Political Theory.", "Public Administration.", "Comparative Politics."],
        "d",
        "Comparative Politics compares constitutions and political systems of different nations.",
    ),
    (
        "A student analyzing the interactions, alliances, and treaties between Nigeria and the United Nations is studying",
        ["Local Government.", "International Relations.", "Political Philosophy.", "Constitutional Law."],
        "b",
        "Interactions, alliances and treaties between states are studied in International Relations.",
    ),
    (
        "The branch of the academic discipline that deals with the history of political ideas from thinkers like John Locke and Karl Marx is",
        ["Comparative Politics.", "Public Policy.", "Political Theory.", "Local Government Studies."],
        "c",
        "Political Theory deals with the history of political ideas and thinkers.",
    ),
    (
        "Public Administration as a course of study focuses primarily on the",
        ["operations of the civil service and public execution.", "behavioral traits of voters during elections.", "architectural styles of administrative buildings.", "histories of pre-colonial empires."],
        "a",
        "Public Administration focuses on the civil service and public execution.",
    ),
    (
        "One major reason for studying Government in secondary schools is to",
        ["enable students to control the armed forces.", "foster civic awareness and citizenship education.", "equip citizens to bypass the judicial court system.", "provide students with automatic political offices."],
        "b",
        "Studying Government fosters civic awareness and citizenship education.",
    ),
    (
        "The scientific method is applied to the academic study of government by",
        ["using physical force to test laws.", "analyzing political behavior, data, and trends.", "manufacturing new structures in laboratories.", "conducting military drills."],
        "b",
        "The scientific method is applied by analyzing political behaviour, data and trends.",
    ),
    (
        "The shared values, beliefs, and orientations of a society toward their political system is known as",
        ["Political Philosophy.", "Political Culture.", "Political Socialization.", "Political Ideology."],
        "b",
        "Shared political values and orientations make up Political Culture.",
    ),
    (
        "The process by which children and citizens learn about political values and the culture of their state is called",
        ["Political Socialization.", "Political Assimilation.", "Public Enlightenment.", "Civic Mobilization."],
        "a",
        "Learning political values and culture is Political Socialization.",
    ),
    (
        "Aristotle is often referred to as the father of political science because he",
        ["established the first executive branch of government.", "classified different states and governments scientifically.", "wrote the first modern written constitution.", "invented the separation of powers."],
        "b",
        "Aristotle scientifically classified different states and governments.",
    ),
    (
        "The capacity to compel or influence individuals to act against their original will is the definition of",
        ["Authority.", "Power.", "Legitimacy.", "Sovereignty."],
        "b",
        "Power is the capacity to compel others to obey, often backed by force.",
    ),
    (
        "Political authority differs fundamentally from political power because authority is",
        ["backed exclusively by raw physical force.", "legally and constitutionally recognized.", "unstable and changes daily.", "possessed only by military dictators."],
        "b",
        "Authority is power that is legally and constitutionally recognized.",
    ),
    (
        "When a government enjoys widespread acceptance and recognition by its citizens, it possesses",
        ["Coercion.", "Legitimacy.", "Influence.", "Autocracy."],
        "b",
        "Widespread acceptance and recognition by citizens is Legitimacy.",
    ),
    (
        "The concept of sovereignty was popularized in political science literature by",
        ["Baron de Montesquieu.", "Jean Bodin.", "A.V. Dicey.", "Thomas Hobbes."],
        "b",
        "Jean Bodin popularized the concept of sovereignty.",
    ),
    (
        "Sovereignty means the",
        ["dependency of a state on foreign economic assistance.", "absolute and supreme power of a state to govern itself.", "system of sharing powers between regions.", "rule of a society by religious leaders."],
        "b",
        "Sovereignty is the absolute and supreme power of a state to govern itself.",
    ),
    (
        "Charismatic authority is based on a leader's",
        ["hereditary line of succession.", "exceptional personal qualities and appeal.", "selection by a legal parliament.", "appointment by the civil service."],
        "b",
        "Charismatic authority rests on a leader's exceptional personal qualities.",
    ),
    (
        "A military coup d'état typically removes a democratic government's",
        ["Sovereignty.", "Legitimacy.", "Bureaucracy.", "Influence."],
        "b",
        "A coup removes a government's legitimacy — its accepted moral right to rule.",
    ),
    (
        "De jure sovereignty refers to sovereignty that is recognized",
        ["by force of arms only (in practice).", "according to law and constitutional right.", "by traditional local customs.", "through illegal declarations."],
        "b",
        "De jure sovereignty is recognized according to law and constitutional right.",
    ),
    (
        "The ultimate source of political sovereignty in a modern democratic state lies with the",
        ["Armed Forces.", "Judiciary.", "Electorate (The People).", "Civil Service."],
        "c",
        "In a democracy, political sovereignty ultimately belongs to the electorate (the people).",
    ),
    (
        "Power that is derived from long-standing customs, heritage, and culture is classified as",
        ["Legal-Rational Authority.", "Traditional Authority.", "Political Influence.", "Coercive Power."],
        "b",
        "Power derived from long-standing customs and heritage is Traditional Authority.",
    ),
]

CARD_TYPES = [
    "quiz", "capitalization", "sentence_types", "sentence_combining",
    "true_false", "passage", "vocabulary", "combine_seq", "error_correction",
    "para_gapfill", "sentence_expansion", "sentence_expansion_mcq", "word_table",
    "study",
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


def upsert_drill_set(ref, token, *, title, description, subject_id, time_limit, question_count, card_type, slug, lesson_content=None):
    content_col = ", lesson_content" if lesson_content is not None else ""
    content_val = f", {sql_literal(lesson_content)}" if lesson_content is not None else ""
    rows = run_query(ref, token, f"""
        INSERT INTO drill_sets
            (title, description, subject_id, level, time_limit_minutes,
             question_count, card_type, capitalization_slug{content_col})
        SELECT {sql_literal(title)}, {sql_literal(description)}, {subject_id if subject_id else 'NULL'},
               {sql_literal(LEVEL)}, {time_limit}, {question_count},
               {sql_literal(card_type)}, {sql_literal(slug)}{content_val}
        WHERE NOT EXISTS (SELECT 1 FROM drill_sets WHERE title = {sql_literal(title)})
        RETURNING id
    """)
    if rows:
        return rows[0]["id"], True
    rows = run_query(ref, token, f"SELECT id FROM drill_sets WHERE title = {sql_literal(title)}")
    if not rows:
        sys.exit(f"ERROR: drill set {title!r} not found after insert")
    return rows[0]["id"], False


def main():
    env = load_env()
    ref = project_ref(env["SUPABASE_URL"])
    token = env["SUPABASE_ACCESS_TOKEN"]
    print(f"Project ref: {ref}")

    subs = run_query(ref, token, f"SELECT id FROM subjects WHERE name = {sql_literal(SUBJECT_NAME)} AND level = {sql_literal(LEVEL)} LIMIT 1")
    if not subs:
        sys.exit(f"ERROR: subject {SUBJECT_NAME!r} ({LEVEL}) not found")
    subject_id = subs[0]["id"]
    print(f"Subject '{SUBJECT_NAME}' id={subject_id}")

    stacks = run_query(ref, token, f"SELECT id FROM lesson_stacks WHERE title = {sql_literal(STACK_TITLE)} LIMIT 1")
    if not stacks:
        sys.exit(f"ERROR: stack {STACK_TITLE!r} not found — run create_government_stack.py first")
    stack_id = stacks[0]["id"]
    print(f"Stack '{STACK_TITLE}' id={stack_id}")

    # 1) Widen the card_type check to allow 'study' (idempotent)
    type_list = ", ".join(sql_literal(t) for t in CARD_TYPES)
    run_query(ref, token, "ALTER TABLE drill_sets DROP CONSTRAINT IF EXISTS drill_sets_card_type_check")
    run_query(ref, token, f"ALTER TABLE drill_sets ADD CONSTRAINT drill_sets_card_type_check CHECK (card_type = ANY (ARRAY[{type_list}]))")
    print("Constraint drill_sets_card_type_check includes 'study'")

    # 2) Study card (read-only notes in lesson_content → rulesNote)
    study_content = json.dumps({
        "rulesNote": {
            "title": "Introduction to the Study of Government",
            "description": "Meaning, scope and basic concepts — Units 1.1 to 1.4.",
            "blocks": STUDY_BLOCKS,
        }
    }, ensure_ascii=False)
    study_id, study_created = upsert_drill_set(
        ref, token,
        title=STUDY_TITLE, description=STUDY_DESC, subject_id=subject_id,
        time_limit=0, question_count=0, card_type="study",
        slug=STUDY_SLUG, lesson_content=study_content,
    )
    print(f"Study card id={study_id} ({'created' if study_created else 'exists'})")

    # 3) Question card
    quiz_id, quiz_created = upsert_drill_set(
        ref, token,
        title=QUIZ_TITLE, description=QUIZ_DESC, subject_id=subject_id,
        time_limit=QUIZ_TIME_LIMIT, question_count=len(QUESTIONS), card_type="quiz",
        slug="",
    )
    print(f"Question card id={quiz_id} ({'created' if quiz_created else 'exists'})")

    # 4) Insert the 40 questions + links (only if the set has none yet)
    existing = run_query(ref, token, f"SELECT count(*) AS n FROM drill_set_questions WHERE drill_set_id = {quiz_id}")
    linked = existing[0]["n"] if existing else 0
    if linked == 0:
        for i, (question, opts, correct, explanation) in enumerate(QUESTIONS, start=1):
            rows = run_query(ref, token, f"""
                INSERT INTO questions
                    (category, question, option_a, option_b, option_c, option_d,
                     correct_option, explanation, level, subject_id, instruction, passage)
                VALUES ({sql_literal('Government')}, {sql_literal(question)},
                        {sql_literal(opts[0])}, {sql_literal(opts[1])},
                        {sql_literal(opts[2])}, {sql_literal(opts[3])},
                        {sql_literal(correct)}, {sql_literal(explanation)},
                        {sql_literal(LEVEL)}, {subject_id}, '', '')
                RETURNING id
            """)
            if not rows:
                sys.exit(f"ERROR: failed to insert question {i}")
            qid = rows[0]["id"]
            run_query(ref, token, f"""
                INSERT INTO drill_set_questions (drill_set_id, question_id, question_number)
                VALUES ({quiz_id}, {qid}, {i})
            """)
        print(f"Inserted {len(QUESTIONS)} questions and linked them to set {quiz_id}")
    else:
        print(f"Set {quiz_id} already has {linked} linked questions — skipping insertion")

    # 5) Link both cards into the Government Lessons stack (idempotent)
    for order, set_id in ((1, study_id), (2, quiz_id)):
        rows = run_query(ref, token, f"""
            INSERT INTO lesson_stack_items (stack_id, drill_set_id, sort_order)
            SELECT {stack_id}, {set_id}, {order}
            WHERE NOT EXISTS (
                SELECT 1 FROM lesson_stack_items WHERE stack_id = {stack_id} AND drill_set_id = {set_id}
            )
            RETURNING id
        """)
        print(f"Stack link set {set_id} (sort {order}): {'added' if rows else 'exists'}")

    # 6) Verify — non-sensitive fields only
    print("\nVERIFIED sets:")
    for row in run_query(ref, token, f"""
        SELECT id, title, card_type, capitalization_slug, question_count, time_limit_minutes
        FROM drill_sets WHERE id IN ({study_id}, {quiz_id}) ORDER BY id
    """):
        print(f"  id={row['id']} {row['title']!r} type={row['card_type']} count={row['question_count']} target={row['time_limit_minutes']}m")
    n = run_query(ref, token, f"SELECT count(*) AS n FROM drill_set_questions WHERE drill_set_id = {quiz_id}")
    print(f"  linked questions: {n[0]['n']}")
    print("\nDone.")


if __name__ == "__main__":
    main()
