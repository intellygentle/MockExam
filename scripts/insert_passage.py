#!/usr/bin/env python3
"""Insert the passage drill set + questions into Supabase."""
import json, os, sys

SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
REF = os.environ.get("SUPABASE_REF", "")
ACCESS = os.environ.get("SUPABASE_ACCESS_TOKEN", "")

if not SERVICE_KEY:
    print("Set SUPABASE_SERVICE_KEY env var", file=sys.stderr)
    sys.exit(1)

import urllib.request

def supabase_post(table, data):
    """POST to Supabase REST API."""
    url = f"https://{REF}.supabase.co/rest/v1/{table}"
    body = json.dumps(data).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation")
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read())
            return result
    except urllib.error.HTTPError as e:
        print(f"Error: {e.code} - {e.read().decode()}", file=sys.stderr)
        return None

def management_query(sql):
    """Run SQL via management API."""
    url = f"https://api.supabase.com/v1/projects/{REF}/database/query"
    body = json.dumps({"query": sql}).encode()
    req = urllib.request.Request(url, data=body, method="POST")
    req.add_header("Authorization", f"Bearer {ACCESS}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        print(f"Mgmt error: {e.code} - {e.read().decode()}", file=sys.stderr)
        return None

# 1. Insert drill set
drill_set = {
    "title": "The Disappearance",
    "description": "Sandra lingers at the airport watching her daughter Lucy depart abroad. When Lucy fails to send the promised message upon landing, Sandra's unease grows into dread. She travels to the unfamiliar city, discovers the address doesn't exist, and pieces together a trail of clues. A suspenseful short story exploring trust, deception, and a mother's unwavering determination.",
    "subject_id": 54,
    "level": "ss3",
    "time_limit_minutes": 20,
    "question_count": 10,
    "card_type": "passage",
}

result = supabase_post("drill_sets", drill_set)
if not result:
    print("Failed to create drill set")
    sys.exit(1)

drill_id = result[0]["id"]
print(f"Created drill set: {drill_id}")

# 2. Insert 10 discussion questions
questions = [
    "What is the central theme of this passage, and how does the author develop it through Sandra's journey?",
    "How does the author use silence and absence (unanswered calls, empty buildings) to build tension throughout the story?",
    "Describe Sandra's character. What motivates her to travel to an unfamiliar city despite the danger?",
    "At what point in the story did you realize Lucy had planned her disappearance? What clues led you to this conclusion?",
    "Who do you think Daniel is, and what role does he play in Lucy's disappearance? Support your answer with evidence from the text.",
    "The story ends with a second envelope. What do you think it contains, and why did the author leave the ending ambiguous?",
    "How does the author create suspense through the use of short sentences and paragraphs in the latter half of the passage?",
    "If you were Sandra, would you continue searching or stop after receiving Lucy's messages? Explain your reasoning.",
    "What does the suitcase reveal about Lucy's state of mind and her intentions?",
    "Discuss the significance of the title 'The Disappearance.' Does it refer only to Lucy, or is there a deeper meaning?",
]

question_ids = []
for i, q_text in enumerate(questions):
    q_data = {
        "subject_id": 54,
        "category": "English",
        "level": "ss3",
        "year": 2026,
        "question": q_text,
        "option_a": "",
        "option_b": "",
        "option_c": "",
        "option_d": "",
        "option_e": "",
        "passage": "",
        "instruction": f"Question {i+1}",
        "correct_option": "a",
        "explanation": "",
    }
    result = supabase_post("questions", q_data)
    if result:
        qid = result[0]["id"]
        question_ids.append(qid)
        print(f"  Q{i+1}: id={qid}")
    else:
        print(f"  Q{i+1}: FAILED")

# 3. Link questions to drill set
for i, qid in enumerate(question_ids):
    link = {
        "drill_set_id": drill_id,
        "question_id": qid,
        "question_number": i + 1,
    }
    supabase_post("drill_set_questions", link)

print(f"Linked {len(question_ids)} questions to drill set {drill_id}")

# 4. Add to Vocabulary & Comprehension stack (id=4)
stack_link = {
    "stack_id": 4,
    "drill_set_id": drill_id,
    "sort_order": 1,
}
result = supabase_post("lesson_stack_items", stack_link)
if result:
    print(f"Added drill set {drill_id} to Vocabulary & Comprehension stack")
else:
    print("Failed to add to stack")