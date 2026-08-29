import json
import urllib.request

SUPABASE_URL = "https://ifrxmoftzfyhfyconvxa.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmcnhtb2Z0emZ5aGZ5Y29udnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMyMjkwMSwiZXhwIjoyMDg4ODk4OTAxfQ.ZXf3F-a_wNXqArtThJ1AaK7-nnU1uYR9kA_J0zzWO0o"
STACK_ID = 5


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


# Create the combine_seq drill set (questions live server-side in lesson-cards.ts).
ds = pg(
    "POST",
    "/rest/v1/drill_sets",
    {
        "title": "Sentence Combining with Subordinating Conjunctions",
        "description": "Combine each pair of sentences into one correctly punctuated sentence using the specified subordinating conjunction. Type your answer — you can only move on once it's correct.",
        "subject_id": None,
        "level": "ss3",
        "time_limit_minutes": 30,
        "question_count": 30,
        "card_type": "combine_seq",
        "capitalization_slug": "clause-combining-subordinating-conjunctions",
    },
)
ds_id = ds[0]["id"]
print("Drill set id", ds_id)

# Link to stack 5 at next sort order
existing = pg("GET", f"/rest/v1/lesson_stack_items?stack_id=eq.{STACK_ID}&select=sort_order&order=sort_order.desc&limit=1")
next_sort = max((e["sort_order"] for e in existing if e.get("sort_order") is not None), default=0) + 1
pg("POST", "/rest/v1/lesson_stack_items", {"stack_id": STACK_ID, "drill_set_id": ds_id, "sort_order": next_sort})
print("Linked to stack", STACK_ID, "at sort_order", next_sort)