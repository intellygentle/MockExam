import json
import re
import zipfile
import urllib.request

DOCX = "/sdcard/Download/Mastering Clause Combination and Punctuation.docx"
SUPABASE_URL = "https://ifrxmoftzfyhfyconvxa.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmcnhtb2Z0emZ5aGZ5Y29udnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMyMjkwMSwiZXhwIjoyMDg4ODk4OTAxfQ.ZXf3F-a_wNXqArtThJ1AaK7-nnU1uYR9kA_J0zzWO0o"
STACK_ID = 5

# Answer key: { question_number: letter }
ANSWER_KEY = {
    1: "A", 2: "B", 3: "C", 4: "A", 5: "A", 6: "A", 7: "A", 8: "A", 9: "A", 10: "A",
    11: "A", 12: "B", 13: "A", 14: "A", 15: "B", 16: "A", 17: "A", 18: "A", 19: "A", 20: "C",
    21: "B", 22: "B", 23: "B", 24: "B", 25: "B", 26: "B", 27: "B", 28: "B", 29: "B", 30: "B",
    31: "A", 32: "B", 33: "A", 34: "A", 35: "C", 36: "A", 37: "A", 38: "B", 39: "A", 40: "A",
    41: "A", 42: "A", 43: "A", 44: "A", 45: "A", 46: "A", 47: "A", 48: "A", 49: "A", 50: "A",
}

DIRECTION = "Choose the grammatically correct and properly punctuated sentence that best combines the independent clauses."


def extract_paragraphs(path):
    z = zipfile.ZipFile(path)
    xml = z.read("word/document.xml").decode("utf-8", "ignore")
    paras = re.split(r"</w:p>", xml)
    out = []
    for para in paras:
        texts = re.findall(r"<w:t[^>]*>(.*?)</w:t>", para, re.S)
        if texts:
            out.append("".join(texts).replace("&amp;", "&").replace("&quot;", '"'))
    return out


def parse_questions(paras):
    questions = []
    cur = None
    # A question starts with a line that is just the number "N."
    for line in paras:
        s = line.strip()
        if not s:
            continue
        m = re.match(r"^(\d{1,2})\.$", s)
        if m:
            cur = {"num": int(m.group(1)), "options": {}}
        elif cur is not None:
            om = re.match(r"^([A-E]\))\s*(.+)$", s, re.S)
            if om:
                opt = om.group(1)[0].lower()
                cur["options"][opt] = om.group(2).strip()
                if len(cur["options"]) == 4:
                    questions.append(cur)
                    cur = None
    return questions


def pgrest(method, path, payload=None):
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


def main():
    paras = extract_paragraphs(DOCX)
    questions = parse_questions(paras)
    print(f"Parsed {len(questions)} questions")

    # Validate all 50 present and answers match
    assert len(questions) == 50, f"Expected 50, got {len(questions)}"

    part1_qs = [q for q in questions if q["num"] <= 25]
    part2_qs = [q for q in questions if q["num"] >= 26]

    # Find subject_id for English / ss3, else create
    subj = pgrest("GET", '/rest/v1/subjects?name=eq.English&level=eq.ss3&select=id')
    if subj:
        subject_id = subj[0]["id"]
    else:
        subj = pgrest("POST", "/rest/v1/subjects", {"name": "English", "level": "ss3"})
        subject_id = subj[0]["id"]

    for label, qs, start in (("Part 1", part1_qs, 1), ("Part 2", part2_qs, 26)):
        title = f"Mastering Clause Combination and Punctuation - {label}"
        desc = f"{DIRECTION} ({label.lower()}: questions {start}-{qs[-1]['num']})."
        set_rows = pgrest(
            "POST",
            "/rest/v1/drill_sets",
            {
                "title": title,
                "description": desc,
                "subject_id": subject_id,
                "level": "ss3",
                "time_limit_minutes": 15,
                "question_count": len(qs),
                "card_type": "quiz",
            },
        )
        ds_id = set_rows[0]["id"]
        print(f"Created {title} (id={ds_id}) with {len(qs)} questions")

        question_rows = []
        for q in qs:
            opts = q["options"]
            correct = ANSWER_KEY[q["num"]].lower()
            question_rows.append({
                "subject_id": subject_id,
                "category": "English",
                "level": "ss3",
                "year": 2026,
                "question": f"{DIRECTION}",
                "option_a": opts.get("a", ""),
                "option_b": opts.get("b", ""),
                "option_c": opts.get("c", ""),
                "option_d": opts.get("d", ""),
                "option_e": "",
                "passage": "",
                "instruction": "Choose the correct sentence",
                "correct_option": correct,
                "explanation": f"The correct sentence is {ANSWER_KEY[q['num']]}.",
            })

        inserted = pgrest("POST", "/rest/v1/questions", question_rows)
        q_ids = [r["id"] for r in inserted]

        links = [
            {"drill_set_id": ds_id, "question_id": qid, "question_number": i + 1}
            for i, qid in enumerate(q_ids)
        ]
        pgrest("POST", "/rest/v1/drill_set_questions", links)

        # Link to stack
        existing = pgrest(
            "GET",
            f"/rest/v1/lesson_stack_items?stack_id=eq.{STACK_ID}&select=sort_order&order=sort_order.desc&limit=1",
        )
        existing = [e for e in existing if e.get("sort_order") is not None]
        next_sort = max((e["sort_order"] for e in existing), default=0) + 1
        pgrest(
            "POST",
            "/rest/v1/lesson_stack_items",
            {"stack_id": STACK_ID, "drill_set_id": ds_id, "sort_order": next_sort},
        )
        print(f"  Linked to stack {STACK_ID} at sort_order {next_sort}")


if __name__ == "__main__":
    main()