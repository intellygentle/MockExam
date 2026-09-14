import json
import urllib.parse
import urllib.request

SUPABASE_URL = "https://ifrxmoftzfyhfyconvxa.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmcnhtb2Z0emZ5aGZ5Y29udnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMyMjkwMSwiZXhwIjoyMDg4ODk4OTAxfQ.ZXf3F-a_wNXqArtThJ1AaK7-nnU1uYR9kA_J0zzWO0o"

STACK_TITLE = "Grammar Stack"
SUBJECT_ID = 54  # "English" / ss3 (same subject used by the concord sets)
TITLE = "Concord: Laws of Agreement 12–21"
DESCRIPTION = (
    "Study the ten laws of subject–verb agreement (Laws 12–21) on this card, then answer "
    "30 WAEC-standard questions. The rules note stays open beside the questions while you drill."
)
INSTRUCTION = "From the alternatives lettered A-D, choose the word or phrase that best completes each sentence."


def pg(method, path, payload=None):
    req = urllib.request.Request(
        SUPABASE_URL + path,
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method,
        headers={
            "apikey": SERVICE_KEY,
            "Authorization": "Bearer " + SERVICE_KEY,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def find_stack_id():
    rows = pg("GET", "/rest/v1/lesson_stacks?title=eq." + urllib.parse.quote(STACK_TITLE) + "&select=id")
    if not rows:
        raise SystemExit(f"Stack '{STACK_TITLE}' not found — create it first.")
    return rows[0]["id"]


def link_to_stack(stack_id, drill_set_id):
    existing = pg("GET", f"/rest/v1/lesson_stack_items?stack_id=eq.{stack_id}&drill_set_id=eq.{drill_set_id}&select=id")
    if existing:
        return
    top = pg("GET", f"/rest/v1/lesson_stack_items?stack_id=eq.{stack_id}&select=sort_order&order=sort_order.desc&limit=1")
    next_sort = max((e["sort_order"] for e in top if e.get("sort_order") is not None), default=0) + 1
    pg("POST", "/rest/v1/lesson_stack_items", {"stack_id": stack_id, "drill_set_id": drill_set_id, "sort_order": next_sort})
    print(f"  Linked drill set {drill_set_id} to stack {stack_id} at sort_order {next_sort}")


# ── The rules note rendered on the card (study screen + in-drill reference) ──
# Block kinds mirror the LessonBlocks renderer: heading / text / examples / table.
RULES_NOTE = {
    "title": "The Laws of Subject–Verb Agreement (12–21)",
    "description": "Study the ten laws below, then answer the 30 practice questions on this card. You can reopen this note anytime during the drill — but the clock keeps running!",
    "blocks": [
        {
            "kind": "text",
            "text": "These ten laws continue the laws of concord (subject–verb agreement). Read each law with its examples carefully — every practice question on this card tests one of them.",
        },
        {"kind": "heading", "text": "Law 12: Prayer in Agreement"},
        {
            "kind": "text",
            "text": "Whenever a sentence expresses a prayer, a wish, a resolution, a suggestion or a recommendation, the base form of the verb (the subjunctive) is used, no matter whether the subject is singular or plural. The normal rule of matching a singular subject with a singular verb is deliberately set aside, because the sentence is not stating a fact but expressing a desire, hope or formal proposal.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "(May) God forbid! (not: God forbids)",
                "We hereby recommend that Joyce stop the programme. (not: stops)",
                "It is suggested that my principal trace out the house of the sick student. (not: traces)",
            ],
        },
        {"kind": "heading", "text": "Law 13: Agreement with Mass (Uncountable) Nouns"},
        {
            "kind": "text",
            "text": "Mass or uncountable nouns cannot ordinarily be counted one by one, so they do not take a plural 's'. They include water and other liquids, information, equipment, news, traffic, advice, fruit, furniture, cloth, damage, baggage, luggage, work, and abstract nouns such as training, progress, happiness, sadness and joy. They are treated as singular and must always take a singular verb.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "Information makes the world go round. (not: make)",
                "The furniture in the hall is expensive. (not: are)",
                "Some pieces of information were released. (never: some informations)",
            ],
        },
        {"kind": "heading", "text": "Law 14: Agreement with AND"},
        {
            "kind": "text",
            "text": "When two or more nouns, noun phrases or pronouns are joined together by the conjunction 'and', a plural verb must be used, because the joined items together form a plural subject.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "The boy, Mary, the young twins and I have a mission.",
                "All the teachers, our parents and the principal want success for us.",
            ],
        },
        {"kind": "heading", "text": "Law 15: Agreement with ALL"},
        {
            "kind": "text",
            "text": "'All' can carry two different meanings, and the meaning intended determines the verb. When 'all' means 'everything' (a collection of ideas or points), it is treated as singular — in the same way that 'everything' and 'everyone' are always singular. When 'all' means 'all the people', it is treated as plural.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "All that glitters is not gold. (all = the general idea of glittering things — singular)",
                "All that I have been saying does not make sense to him. (all = everything I have said)",
                "All have gone. (all = all the people — plural)",
            ],
        },
        {"kind": "heading", "text": "Law 16: WHO in Agreement"},
        {
            "kind": "text",
            "text": "When who, that, whose or which introduces a relative clause, the verb inside the clause agrees with the noun or pronoun that comes immediately before it. Identify exactly what 'who' is referring to before selecting the verb.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "One of the girls who were impregnated has died. ('who' refers to 'the girls' — plural — so 'were'; but 'one' takes the singular 'has')",
                "He is one of the boys who are playing football now.",
                "It is I who am responsible. ('who' refers to 'I', so the verb agrees with 'I')",
            ],
        },
        {"kind": "heading", "text": "Law 17: 'ALL BUT' in Agreement"},
        {
            "kind": "text",
            "text": "Where the expression 'all but' appears in a sentence, agreement is settled by looking at whatever comes immediately after 'but' — that word or phrase becomes the true subject of the verb.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "All but Jimmy knows him. (the subject is 'Jimmy' — singular — so 'knows')",
            ],
        },
        {"kind": "heading", "text": "Law 18: Agreement with 'Many a'"},
        {
            "kind": "text",
            "text": "Where 'many a' is used before a noun, ignore 'many' and treat 'a' as the determiner, which is singular in effect — so a singular verb is used, even though the meaning refers to a large number. The noun that follows 'many a' must also remain singular and must not be pluralised.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "Many a woman loves the man. (not: love; and not: many a women)",
            ],
        },
        {"kind": "heading", "text": "Law 19: Unmarked Plurals in Agreement"},
        {
            "kind": "text",
            "text": "Certain words are plural in meaning even though they do not carry an 's' at the end: police, vermin, gentry, folk, youth, cattle, clergy, and people (when it refers to a nation). Treat them exactly like ordinary plural words — they take a plural verb.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "The vermin on his body make the lunatic look hideous. (not: makes)",
                "The police are investigating the matter.",
            ],
        },
        {"kind": "heading", "text": "Law 20: Plural Figures in Agreement"},
        {
            "kind": "text",
            "text": "When figures denoting quantity, a sum of money, a distance, a weight or a period of time are used as the subject, they are regarded as one single unit rather than as separate countable items — so a singular verb such as 'is' or 'was' must be used.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "Ten children is enough for me. (not: are)",
                "Three months is enough for the job. (not: are)",
            ],
        },
        {"kind": "heading", "text": "Law 21: Block Plural Groups"},
        {
            "kind": "text",
            "text": "Some categories of people are identified by placing 'the' before an adjective that describes the group, without adding a plural 's': the poor (poor people), the handicapped, the aged, the blind and the young-at-heart. Even though these expressions look singular, they refer to a whole group of people and must take a plural verb.",
        },
        {
            "kind": "examples",
            "title": "Examples",
            "items": [
                "The handicapped are suffering. (not: is)",
                "The poor need our help. (not: needs)",
            ],
        },
        {"kind": "heading", "text": "Quick Review — All Ten Laws at a Glance"},
        {
            "kind": "table",
            "headers": ["Law", "Rule in one line", "Verb"],
            "rows": [
                ["12 · Prayer", "Prayers, wishes, suggestions, recommendations", "Base form (subjunctive)"],
                ["13 · Mass nouns", "information, advice, luggage, equipment, news…", "Singular"],
                ["14 · AND", "Two or more subjects joined by 'and'", "Plural"],
                ["15 · ALL", "'all' = everything → singular; 'all' = all the people → plural", "Depends on meaning"],
                ["16 · WHO", "The verb in the relative clause agrees with the noun just before 'who'", "Agrees with the antecedent"],
                ["17 · ALL BUT", "The verb agrees with whatever follows 'but'", "Word after 'but' decides"],
                ["18 · Many a", "Ignore 'many' — 'a' is the determiner; the noun stays singular", "Singular"],
                ["19 · Unmarked plurals", "police, cattle, youth, gentry, vermin, clergy, people", "Plural"],
                ["20 · Plural figures", "Money, distance, time, weight treated as one unit", "Singular"],
                ["21 · Block groups", "the poor, the blind, the aged, the handicapped", "Plural"],
            ],
        },
    ],
}


# ── The 30 WAEC-standard MCQs (Laws 12–21, shuffled together) ──
# Each entry: stem, options a-d, correct letter, explanation citing the law.
MCQS = [
    ("All but the twins ______ present at the party.", "was", "is", "were", "has been", "c",
     "C — were. Law 17 ('all but'): the true subject is 'the twins' (plural) — the word right after 'but' — so the plural verb 'were' is used."),
    ("The board recommended that the erring student ______ the examination.", "retakes", "retake", "retaking", "has retaken", "b",
     "B — retake. Law 12 (prayer in agreement): a recommendation takes the base (subjunctive) form of the verb, no matter the subject."),
    ("The police ______ currently investigating the robbery.", "is", "are", "was", "has been", "b",
     "B — are. Law 19 (unmarked plurals): 'police' is plural in meaning even without an 's', so it takes a plural verb."),
    ("My father and my uncle ______ both farmers.", "is", "are", "was", "has been", "b",
     "B — are. Law 14 ('and'): 'my father and my uncle' are two subjects joined by 'and', so a plural verb is used."),
    ("God ______ you and keep you all the days of your life.", "blesses", "bless", "is blessing", "has blessed", "b",
     "B — bless. Law 12 (prayer in agreement): a prayer or wish takes the base form of the verb — 'God bless you', not 'God blesses you'."),
    ("Six months ______ too long a period to wait for the result.", "are", "is", "were", "have been", "b",
     "B — is. Law 20 (plural figures): a period of time ('six months') is treated as one single unit, so it takes a singular verb."),
    ("He is one of the boys who ______ playing football now.", "is", "are", "was", "has", "b",
     "B — are. Law 16 ('who'): 'who' refers to 'the boys' (plural), so the verb inside the relative clause is plural."),
    ("The advice you gave me ______ extremely useful.", "were", "was", "are", "have been", "b",
     "B — was. Law 13 (mass nouns): 'advice' is an uncountable noun and is always singular."),
    ("Many a student ______ failed the examination this year.", "have", "has", "having", "had", "b",
     "B — has. Law 18 ('many a'): ignore 'many' — the 'a' makes the subject singular, so a singular verb is used."),
    ("The blind ______ guided across the busy road by kind passers-by.", "is", "are", "was", "has been", "b",
     "B — are. Law 21 (block plural groups): 'the blind' means blind people as a group, so it takes a plural verb."),
    ("The teacher and the students ______ preparing for the ceremony.", "is", "are", "was", "has been", "b",
     "B — are. Law 14 ('and'): 'the teacher and the students' are joined by 'and', forming a plural subject."),
    ("All he needs ______ love and care.", "are", "is", "were", "have", "b",
     "B — is. Law 15 ('all'): here 'all' means 'everything' (all he needs), so it is treated as singular."),
    ("Fifty naira ______ not enough to buy the item.", "are", "is", "were", "have been", "b",
     "B — is. Law 20 (plural figures): a sum of money ('fifty naira') is regarded as one unit and takes a singular verb."),
    ("It is essential that every candidate ______ present before the examination begins.", "is", "be", "was", "will be", "b",
     "B — be. Law 12 (prayer in agreement): after 'it is essential that', the base (subjunctive) form 'be' is used."),
    ("All but one student ______ passed the examination.", "have", "has", "having", "had", "b",
     "B — has. Law 17 ('all but'): the verb agrees with 'one student' (singular) — the phrase right after 'but'."),
    ("His luggage ______ still at the airport.", "are", "is", "were", "have", "b",
     "B — is. Law 13 (mass nouns): 'luggage' is uncountable and takes a singular verb."),
    ("The poor ______ always with us.", "is", "are", "was", "has been", "b",
     "B — are. Law 21 (block plural groups): 'the poor' means poor people as a group, so it takes a plural verb."),
    ("All ______ invited to the ceremony.", "is", "has", "are", "was", "c",
     "C — are. Law 15 ('all'): here 'all' means 'all the people', so it is treated as plural."),
    ("Cattle ______ reared extensively in the northern part of the country.", "is", "are", "was", "has been", "b",
     "B — are. Law 19 (unmarked plurals): 'cattle' is plural in meaning and takes a plural verb."),
    ("It is I who ______ responsible for the mistake.", "is", "am", "are", "was", "b",
     "B — am. Law 16 ('who'): 'who' refers back to 'I', so the verb agrees with 'I' — 'It is I who am'."),
    ("Ade and Bola ______ absent from school yesterday.", "was", "were", "is", "has been", "b",
     "B — were. Law 14 ('and'): 'Ade and Bola' are two subjects joined by 'and', so a plural verb is used."),
    ("Many a farmer ______ the harvest with joy.", "welcome", "welcomes", "welcoming", "have welcomed", "b",
     "B — welcomes. Law 18 ('many a'): the 'a' makes the subject singular — 'many a farmer welcomes'."),
    ("The equipment in the laboratory ______ obsolete.", "are", "is", "were", "have been", "b",
     "B — is. Law 13 (mass nouns): 'equipment' is uncountable and takes a singular verb."),
    ("The aged in this community ______ well taken care of by the government.", "is", "are", "was", "has been", "b",
     "B — are. Law 21 (block plural groups): 'the aged' means aged people as a group, so it takes a plural verb."),
    ("All that glitters ______ not gold.", "is", "are", "were", "have been", "a",
     "A — is. Law 15 ('all'): 'all that glitters' means the general idea of glittering things — one singular concept."),
    ("The youth of this nation ______ our future leaders.", "is", "are", "was", "has been", "b",
     "B — are. Law 19 (unmarked plurals): 'the youth' here means the young people of the nation (plural in meaning), so a plural verb is used."),
    ("All but Ngozi ______ ready for the trip.", "is", "are", "was", "has", "a",
     "A — is. Law 17 ('all but'): the verb agrees with 'Ngozi' (singular) — the word right after 'but'."),
    ("Two kilometres ______ a fairly long distance to trek every morning.", "are", "is", "were", "have been", "b",
     "B — is. Law 20 (plural figures): a distance ('two kilometres') is treated as one unit and takes a singular verb."),
    ("One of the players who ______ injured during the match has been rushed to the hospital.", "is", "are", "was", "were", "d",
     "D — were. Law 16 ('who'): 'who' refers to 'the players' (plural), and the match is in the past, so 'were' is used."),
    ("Many a book ______ on the shelf, gathering dust.", "are", "is", "were", "have been", "b",
     "B — is. Law 18 ('many a'): the 'a' makes the subject singular — 'many a book is'."),
]


def main():
    stack_id = find_stack_id()
    print(f"Grammar Stack id={stack_id}")

    # Idempotent: reuse the drill set if it already exists
    rows = pg("GET", "/rest/v1/drill_sets?title=eq." + urllib.parse.quote(TITLE) + "&select=id")
    if rows:
        ds_id = rows[0]["id"]
        print(f"Drill set '{TITLE}' already exists (id={ds_id})")
    else:
        created = pg(
            "POST",
            "/rest/v1/drill_sets",
            {
                "title": TITLE,
                "description": DESCRIPTION,
                "subject_id": SUBJECT_ID,
                "level": "ss3",
                "time_limit_minutes": 20,
                "question_count": len(MCQS),
                "card_type": "quiz",
                "capitalization_slug": "",
                # Rules note rendered by the study-first screen + the in-drill
                # "Laws" reference toggle (see src/app/drill/page.tsx).
                "lesson_content": json.dumps({"rulesNote": RULES_NOTE}),
            },
        )
        ds_id = created[0]["id"]
        print(f"Created drill set '{TITLE}' (id={ds_id})")
    link_to_stack(stack_id, ds_id)

    # Insert questions only when this set has none yet (idempotent re-runs)
    links = pg("GET", f"/rest/v1/drill_set_questions?drill_set_id=eq.{ds_id}&select=id")
    if len(links) >= len(MCQS):
        print(f"  Drill set {ds_id} already has {len(links)} questions — skipping question insert")
        return

    question_rows = []
    for stem, a, b, c, d, correct, explanation in MCQS:
        question_rows.append(
            {
                "subject_id": SUBJECT_ID,
                "category": "English",
                "level": "ss3",
                "year": 2026,
                "question": stem,
                "option_a": a,
                "option_b": b,
                "option_c": c,
                "option_d": d,
                "option_e": "",
                "passage": "",
                "instruction": INSTRUCTION,
                "correct_option": correct,
                "explanation": explanation,
            }
        )
    inserted = pg("POST", "/rest/v1/questions", question_rows)
    q_ids = [r["id"] for r in inserted]
    pg(
        "POST",
        "/rest/v1/drill_set_questions",
        [
            {"drill_set_id": ds_id, "question_id": qid, "question_number": i + 1}
            for i, qid in enumerate(q_ids)
        ],
    )
    print(f"  Inserted {len(q_ids)} questions into drill set {ds_id}")
    print(f"Done. '{TITLE}' is live in the Grammar Stack with its rules note.")


if __name__ == "__main__":
    main()
