import json
import urllib.parse
import urllib.request

SUPABASE_URL = "https://ifrxmoftzfyhfyconvxa.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmcnhtb2Z0emZ5aGZ5Y29udnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMyMjkwMSwiZXhwIjoyMDg4ODk4OTAxfQ.ZXf3F-a_wNXqArtThJ1AaK7-nnU1uYR9kA_J0zzWO0o"

STACK_TITLE = "Grammar Stack"
SUBJECT_ID = 54  # "English" / ss3 (same subject used by the clause-combination sets)
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


def get_or_create_drill_set(fields):
    title = fields["title"]
    rows = pg("GET", "/rest/v1/drill_sets?title=eq." + urllib.parse.quote(title) + "&select=id")
    if rows:
        print(f"Drill set '{title}' already exists (id={rows[0]['id']})")
        return rows[0]["id"]
    created = pg("POST", "/rest/v1/drill_sets", fields)
    print(f"Created drill set '{title}' (id={created[0]['id']})")
    return created[0]["id"]


# ── The 30 WAEC-style practice MCQs (Section 1 of the source file) ──
# Each entry: stem, options a-d, correct letter, explanation citing the law.
MCQS = [
    ("Everybody in the hall _____ excited about the result.", "were", "are", "is", "have", "c",
     "C — is. Law 2: 'everybody' is an indefinite pronoun and takes a singular verb."),
    ("The men in the compound _____ waiting for the chief.", "is", "was", "are", "has", "c",
     "C — are. Law 1b: 'The men' is a plural subject, so it takes a plural verb."),
    ("Each of the students _____ a textbook.", "have", "has", "having", "had have", "b",
     "B — has. Law 4: 'each' takes a singular verb."),
    ("Every child in the class _____ a uniform.", "wear", "wears", "wearing", "were wear", "b",
     "B — wears. Law 5: 'every' + singular noun takes a singular verb."),
    ("The girls, together with their teacher, _____ the winning team.", "is", "was", "are", "be", "a",
     "A — is. Law 3: the real subject is 'the girls' (acting as a single team); 'together with their teacher' is extra information."),
    ("Nobody _____ what happened last night.", "know", "knows", "knowing", "have known", "b",
     "B — knows. Law 2: 'nobody' is an indefinite pronoun and takes a singular verb."),
    ("The chairman, not the other board members, _____ attending the ceremony.", "are", "were", "is", "have", "c",
     "C — is. Law 3: 'not the other board members' is extra information; the real subject 'the chairman' is singular."),
    ("Ten multiplied by five _____ fifty.", "is", "are", "is/are", "be", "c",
     "C — is/are. Law 7 (BODMAS): either a singular or plural verb is acceptable."),
    ("Sixty kilometres _____ too far to trek.", "are", "is", "were", "have been", "b",
     "B — is. Law 8: distance/quantity is treated as a single unit and takes a singular verb."),
    ("Ninety percent of the students _____ passed the exam.", "has", "have", "is", "was", "b",
     "B — have. Percentage of a plural countable noun ('students') takes the plural verb."),
    ("One of the boys _____ always late to school.", "are", "is", "were", "have been", "b",
     "B — is. Law 9: 'one' is the number selected, so the verb is singular."),
    ("Two of the workers _____ absent today.", "is", "was", "are", "has", "c",
     "C — are. Law 9: 'two' is the number selected, so the verb is plural."),
    ("Either the manager or his assistants _____ responsible for the mistake.", "is", "was", "are", "has been", "c",
     "C — are. Law 10: the verb agrees with the closer noun 'his assistants', which is plural."),
    ("Either the players or the coach _____ to blame for the loss.", "are", "is", "were", "have", "b",
     "B — is. Law 10: the verb agrees with the closer noun 'the coach', which is singular."),
    ("Every ten students that _____ registered will get a certificate.", "has", "have", "was", "is", "b",
     "B — have. Law 6: the figure 'ten' between 'every' and the noun makes the verb plural."),
    ("Somebody _____ left the gate open.", "have", "has", "having", "were", "b",
     "B — has. Law 2: 'somebody' is an indefinite pronoun and takes a singular verb."),
    ("The teachers, not the principal, _____ on strike.", "is", "was", "are", "has", "c",
     "C — are. Law 3: 'not the principal' is extra information; the real subject 'the teachers' is plural."),
    ("The principal, not the teachers, _____ on leave.", "is", "are", "were", "have", "a",
     "A — is. Law 3: 'not the teachers' is extra information; the real subject 'the principal' is singular."),
    ("Nine minus four _____ five.", "is", "are", "is/are", "be", "c",
     "C — is/are. Law 7 (BODMAS): either a singular or plural verb is acceptable."),
    ("Anything strange _____ likely to attract attention.", "are", "is", "were", "have", "b",
     "B — is. Law 2: 'anything' is an indefinite pronoun and takes a singular verb."),
    ("Five hundred naira _____ not enough for the item.", "are", "is", "were", "have been", "b",
     "B — is. Law 8: a sum of money is treated as a single unit and takes a singular verb."),
    ("Each boy and each girl _____ expected to submit an assignment.", "are", "is", "were", "have", "b",
     "B — is. Law 4 (extended): 'each... and each...' still takes a singular verb."),
    ("Everyone in the room _____ their opinion.", "have expressed", "has expressed", "having expressed", "were expressing", "b",
     "B — has expressed. Law 2: 'everyone' is an indefinite pronoun and takes a singular verb (focus on the verb, not the pronoun)."),
    ("The committee members, along with the secretary, _____ arrived.", "has", "have", "is", "was", "b",
     "B — have. Law 3: the real subject 'the committee members' is plural; 'along with the secretary' is extra information."),
    ("One of the cars parked outside _____ mine.", "are", "is", "were", "have been", "b",
     "B — is. Law 9: 'one' is the number selected, so the verb is singular."),
    ("Neither of the answers _____ correct.", "are", "is", "were", "have been", "b",
     "B — is. Law 9 logic: 'neither' behaves like 'one' — a singular selection."),
    ("Every day of the holidays _____ enjoyable.", "were", "are", "was", "is", "d",
     "D — is. Law 5: 'every' takes a singular verb."),
    ("Twenty percent of the fruit _____ rotten.", "is", "are", "were", "have", "a",
     "A — is. Law 8: a percentage of a mass noun ('fruit') takes a singular verb."),
    ("Either my parents or my brother _____ picking me up today.", "are", "is", "were", "have", "b",
     "B — is. Law 10: the verb agrees with the closer noun 'my brother', which is singular."),
    ("Nothing about the arrangements _____ finalized yet.", "are", "is", "were", "have been", "b",
     "B — is. Law 2: 'nothing' is an indefinite pronoun and takes a singular verb."),
]


def insert_quiz_set(stack_id):
    title = "Concord: WAEC Practice Questions"
    description = "From the alternatives lettered A-D, choose the word or phrase that best completes each sentence. Master the 10 laws of concord with these WAEC-style questions."
    ds_id = get_or_create_drill_set(
        {
            "title": title,
            "description": description,
            "subject_id": SUBJECT_ID,
            "level": "ss3",
            "time_limit_minutes": 20,
            "question_count": len(MCQS),
            "card_type": "quiz",
            "capitalization_slug": "",
        }
    )
    link_to_stack(stack_id, ds_id)

    # Insert questions only when this set has none yet (idempotent re-runs)
    links = pg("GET", f"/rest/v1/drill_set_questions?drill_set_id=eq.{ds_id}&select=id")
    if len(links) >= len(MCQS):
        print(f"  Drill set {ds_id} already has {len(links)} questions — skipping question insert")
        return ds_id

    rows = []
    for stem, a, b, c, d, correct, explanation in MCQS:
        rows.append(
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
    inserted = pg("POST", "/rest/v1/questions", rows)
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
    return ds_id


def insert_true_false_set(stack_id, title, description, slug):
    ds_id = get_or_create_drill_set(
        {
            "title": title,
            "description": description,
            "subject_id": None,
            "level": "ss3",
            "time_limit_minutes": 0,
            "question_count": 30,
            "card_type": "true_false",
            "capitalization_slug": slug,
        }
    )
    link_to_stack(stack_id, ds_id)
    return ds_id


def main():
    stack_id = find_stack_id()
    print(f"Grammar Stack id={stack_id}")

    quiz_id = insert_quiz_set(stack_id)

    sentences_id = insert_true_false_set(
        stack_id,
        "Concord: True or False Sentences",
        "Decide whether each sentence obeys the laws of concord: True if it is grammatically correct, False if it breaks a rule. All 30 statements must be right to perfect the lesson.",
        "concord-true-false-sentences",
    )

    rules_id = insert_true_false_set(
        stack_id,
        "Concord: True or False Rules",
        "Each statement below is about the Laws of Concord themselves. Decide whether the rule is stated correctly - True if it is right, False if it is wrong. All 30 statements must be right to perfect the lesson.",
        "concord-true-false-rules",
    )

    print(f"Done. Grammar Stack now contains drill sets: {quiz_id}, {sentences_id}, {rules_id}")


if __name__ == "__main__":
    main()
