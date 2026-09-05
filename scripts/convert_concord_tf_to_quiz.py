import json
import urllib.parse
import urllib.request

SUPABASE_URL = "https://ifrxmoftzfyhfyconvxa.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmcnhtb2Z0emZ5aGZ5Y29udnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMyMjkwMSwiZXhwIjoyMDg4ODk4OTAxfQ.ZXf3F-a_wNXqArtThJ1AaK7-nnU1uYR9kA_J0zzWO0o"

# 30 sentence-judgment statements (Section 2): (statement, is_correct, law note)
TF_SENTENCES = [
    ("Everybody know the answer.", False, "Law 2 — indefinite pronouns like 'everybody' take a singular verb, so it should be 'Everybody knows the answer.'"),
    ("The teachers, not the principal, are on strike.", True, "Law 3 — 'not the principal' is extra information; the real subject 'the teachers' is plural, so 'are' is correct."),
    ("Each student has a locker.", True, "Law 4 — 'each' + singular noun takes a singular verb, so 'has' is correct."),
    ("Every book on the shelf are dusty.", False, "Law 5 — 'every' takes a singular verb: it should be 'Every book on the shelf is dusty.'"),
    ("Ten minus three is seven.", True, "Law 7 — BODMAS sentences accept a singular OR plural verb, so 'is' is acceptable."),
    ("Sixty kilogrammes are too heavy for the boy to lift.", False, "Law 8 — quantity/weight is treated as a single unit: it should be 'Sixty kilogrammes is too heavy for the boy to lift.'"),
    ("One of my sisters live in Lagos.", False, "Law 9 — 'one' is the number selected, so the verb should be singular: 'One of my sisters lives in Lagos.'"),
    ("Two of the players is injured.", False, "Law 9 — 'two' is the number selected, so the verb should be plural: 'Two of the players are injured.'"),
    ("Either the boys or their father is at fault.", True, "Law 10 — the verb agrees with the closer noun 'their father' (singular), so 'is' is correct."),
    ("Either the manager or the workers is on strike.", False, "Law 10 — the verb agrees with the closer noun 'the workers' (plural), so it should be '...or the workers are on strike.'"),
    ("Every ten pupils that comes here get a prize.", False, "Law 6 — the figure 'ten' between 'every' and the noun makes the verb plural, so it should be '...pupils that come here get a prize.'"),
    ("Nobody know where the keys are.", False, "Law 2 — 'nobody' is an indefinite pronoun and takes a singular verb: 'Nobody knows where the keys are.'"),
    ("The men in the field is playing football.", False, "Law 1b — 'The men' is a plural subject, so it should be 'The men in the field are playing football.'"),
    ("The captain (not the players) is to blame.", True, "Law 3 — the bracketed 'not the players' is extra info; the real subject 'the captain' is singular, so 'is' is correct."),
    ("Anybody who tries hard succeeds.", True, "Law 2 — 'anybody' is an indefinite pronoun and correctly takes the singular verb 'succeeds'."),
    ("Ninety percent of the workers has resigned.", False, "A percentage of a plural countable noun ('workers') takes a plural verb, so it should be 'Ninety percent of the workers have resigned.'"),
    ("Each boy and each girl was given a gift.", True, "Law 4 (extended) — 'each... and each...' still takes a singular verb, so 'was' is correct."),
    ("Every ten boys that come here register.", True, "Law 6 — the figure 'ten' between 'every' and the noun makes the verb plural, so 'come' and 'register' are correct."),
    ("Nine multiplied by nine is/are eighty-one.", True, "Law 7 — BODMAS sentences accept a singular or plural verb, so 'is/are' is acceptable."),
    ("Five hundred naira are enough to buy the book.", False, "Law 8 — a sum of money is treated as a single unit, so it should be 'Five hundred naira is enough to buy the book.'"),
    ("Somebody have taken my pen.", False, "Law 2 — 'somebody' is an indefinite pronoun and takes a singular verb: 'Somebody has taken my pen.'"),
    ("The students (not the teacher) are noisy.", True, "Law 3 — the bracketed 'not the teacher' is extra info; the real subject 'the students' is plural, so 'are' is correct."),
    ("Neither of the answers were correct.", False, "Law 9 logic — 'neither' behaves like a singular selection, so it should be 'Neither of the answers was correct.'"),
    ("Everywhere in the town look quiet at night.", False, "Law 2 — 'everywhere' is an indefinite pronoun and takes a singular verb: 'Everywhere in the town looks quiet at night.'"),
    ("One of the cars is parked outside.", True, "Law 9 — 'one' is selected from the group, so the singular verb 'is' is correct."),
    ("Twenty percent of the mangoes were rotten.", True, "A percentage of a plural countable noun ('mangoes') takes the plural verb, so 'were' is correct."),
    ("Either my parents or my brother are picking me up.", False, "Law 10 — the verb agrees with the closer noun 'my brother' (singular), so it should be '...or my brother is picking me up.'"),
    ("Nothing about the plans have changed.", False, "Law 2 — 'nothing' is an indefinite pronoun and takes a singular verb: 'Nothing about the plans has changed.'"),
    ("Each of the players know the rules.", False, "Law 4 — 'each' takes a singular verb, so it should be 'Each of the players knows the rules.'"),
    ("The chairman, along with the board members, is arriving today.", True, "Law 3 — 'along with the board members' is extra info; the real subject 'the chairman' is singular, so 'is' is correct."),
]

# 30 rule statements (Section 3): (statement, is_true, law note)
TF_RULES = [
    ("A singular subject agrees with a singular verb.", True, "Law 1a — Number Agreement: singular subject takes a singular verb."),
    ("A plural subject agrees with a singular verb.", False, "Law 1b — a plural subject agrees with a PLURAL verb, not a singular one."),
    ("'The men' is a plural subject and should therefore take a plural verb.", True, "Law 1b — Number Agreement: plural subject takes a plural verb."),
    ("Indefinite pronouns such as 'everybody' and 'everyone' always take a plural verb.", False, "Law 2 — indefinite pronouns take a SINGULAR verb, not a plural one."),
    ("Words like 'somebody', 'nobody', 'anything', and 'everywhere' take a singular verb when used as subject.", True, "Law 2 — Indefinite Pronouns in Agreements: these are always singular."),
    ("'Everywhere' is treated as a plural subject.", False, "Law 2 — 'everywhere' is treated as SINGULAR, not plural."),
    ("Information that appears in brackets or between dashes should be regarded as the main subject of the sentence.", False, "Law 3 — bracketed/dashed information is additional information, NOT the main subject."),
    ("When additional information appears in brackets, the verb should agree with the real (main) subject, not with the bracketed information.", True, "Law 3 — Additional-Information Agreement: agree with the real subject only."),
    ("In 'The man (not his children) is here', 'his children' is the subject that determines the verb.", False, "Law 3 — 'the man' is the real subject; 'his children' is only additional information."),
    ("'Each' is always followed by a singular noun and a singular verb.", True, "Law 4 — Agreement with Each: each + singular noun + singular verb."),
    ("'Each boy' should correctly be followed by a plural verb.", False, "Law 4 — 'each' takes a SINGULAR verb, not a plural one."),
    ("'Every' takes a singular noun and a singular verb.", True, "Law 5 — Agreement with Every: every + singular noun + singular verb."),
    ("'Every day' should correctly be followed by a plural verb.", False, "Law 5 — 'every' takes a SINGULAR verb, not a plural one."),
    ("When a figure (number) comes between 'every' and a noun, the verb must still remain singular.", False, "Law 6 — when a figure comes between 'every' and the noun, the FIGURE decides the verb; it need not stay singular."),
    ("In 'every ten boys that come here', the verb is plural because 'ten' is a plural figure.", True, "Law 6 — Agreement of Every and a Figure: the figure decides the verb."),
    ("In sentences involving BODMAS operations (bracket, of, division, multiplication, addition, subtraction), only a plural verb is acceptable.", False, "Law 7 — BODMAS sentences accept EITHER a singular or plural verb, not only plural."),
    ("In BODMAS sentences such as 'Nine minus five is/are four', either a singular or plural verb is correct.", True, "Law 7 — BODMAS Agreement: both singular and plural verbs are acceptable."),
    ("Expressions of money, weight, distance, frequency, or percentage are treated as a single unit and take a singular verb.", True, "Law 8 — Agreement of Quantity: quantity expressions take a singular verb."),
    ("'60 kilo' should be followed by a plural verb because 'kilo' refers to a large amount.", False, "Law 8 — quantity expressions take a SINGULAR verb regardless of size: '60 kilo is...'"),
    ("When a number (such as 'one' or 'two') is selected from a larger group, the verb agrees with the number selected, not with the larger group.", True, "Law 9 — Selection Agreement: the selected number decides the verb."),
    ("In 'One of my teachers is wicked', the verb agrees with 'teachers' because 'teachers' is the noun closest to 'of'.", False, "Law 9 — the verb agrees with 'one' (the number selected), NOT with 'teachers'."),
    ("In 'Two of my teachers know me', the verb is plural because 'two' was the number selected.", True, "Law 9 — Selection Agreement: 'two' (plural) takes the plural verb 'know'."),
    ("In an 'either...or' construction, the verb always agrees with the first noun mentioned, no matter its position in the sentence.", False, "Law 10 — the verb agrees with the noun CLOSER to it, not necessarily the first one mentioned."),
    ("In an 'either...or' construction, the verb agrees with the noun that comes immediately before it (the one closer to the verb, usually right after 'or').", True, "Law 10 — Agreement with Either...Or: the closer noun decides the verb."),
    ("In 'Either the principal or the teachers pray every day', the verb agrees with 'the teachers' because it is closer to the verb.", True, "Law 10 — 'the teachers' comes right after 'or', so the plural verb 'pray' is correct."),
    ("A singular principal verb (such as 'goes' or 'writes') usually carries an 's' at the end.", True, "Introductory note — singular principal verbs carry an -s: goes, writes, speaks."),
    ("A plural principal verb (such as 'go' or 'write') also carries an 's' at the end.", False, "Introductory note — a plural principal verb does NOT carry an -s: go, write, speak."),
    ("'Is', 'was', 'has', and 'had' are examples of singular helping verbs.", True, "Introductory note — is/was/has/had are singular helping verbs."),
    ("'Are', 'were', 'am', and 'have' are examples of plural helping verbs.", True, "Introductory note — are/were/am/have are plural helping verbs."),
    ("The subject of a sentence must always agree with the Adjunct (adverb) rather than the verb.", False, "Introductory note — the subject agrees with the Predicator (verb), not the Adjunct."),
]


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


def convert(title, instruction, items, quote_statement):
    rows = pg("GET", "/rest/v1/drill_sets?title=eq." + urllib.parse.quote(title) + "&select=id,subject_id,level")
    if not rows:
        print(f"!! Drill set '{title}' not found — skipping")
        return
    ds = rows[0]
    ds_id = ds["id"]
    print(f"Converting '{title}' (id={ds_id})")

    # Switch the set to a timed True/False quiz drill
    pg("PATCH", f"/rest/v1/drill_sets?id=eq.{ds_id}", {
        "card_type": "quiz",
        "capitalization_slug": "",
        "time_limit_minutes": 20,
    })

    # Only insert questions when the set has none yet (idempotent re-runs)
    existing = pg("GET", f"/rest/v1/drill_set_questions?drill_set_id=eq.{ds_id}&select=id")
    if len(existing) >= len(items):
        print(f"  Set {ds_id} already has {len(existing)} questions — skipping question insert")
        return

    question_rows = []
    for stmt, is_true, reason in items:
        verdict = "True" if is_true else "False"
        question_rows.append({
            "subject_id": ds["subject_id"],
            "category": "English",
            "level": ds["level"] or "ss3",
            "year": 2026,
            "question": f'“{stmt}”' if quote_statement else stmt,
            "option_a": "True",
            "option_b": "False",
            "option_c": "",
            "option_d": "",
            "option_e": "",
            "passage": "",
            "instruction": instruction,
            "correct_option": "a" if is_true else "b",
            "explanation": f"Correct answer: {verdict}. {reason}",
        })

    inserted = pg("POST", "/rest/v1/questions", question_rows)
    q_ids = [r["id"] for r in inserted]
    pg("POST", "/rest/v1/drill_set_questions", [
        {"drill_set_id": ds_id, "question_id": qid, "question_number": i + 1}
        for i, qid in enumerate(q_ids)
    ])
    print(f"  Inserted {len(q_ids)} True/False questions into set {ds_id}")


def main():
    convert(
        "Concord: True or False Sentences",
        "State whether the sentence below is grammatically correct. Choose True if it is correct, or False if it breaks a law of concord.",
        TF_SENTENCES,
        quote_statement=True,
    )
    convert(
        "Concord: True or False Rules",
        "State whether the statement below about the Laws of Concord is correct. Choose True if it is right, or False if it is wrong.",
        TF_RULES,
        quote_statement=False,
    )


if __name__ == "__main__":
    main()
