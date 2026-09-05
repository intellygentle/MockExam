import json
import urllib.parse
import urllib.request

SUPABASE_URL = "https://ifrxmoftzfyhfyconvxa.supabase.co"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmcnhtb2Z0emZ5aGZ5Y29udnhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzMyMjkwMSwiZXhwIjoyMDg4ODk4OTAxfQ.ZXf3F-a_wNXqArtThJ1AaK7-nnU1uYR9kA_J0zzWO0o"


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


TITLE = "Grammar Stack"
DESCRIPTION = "Grammar drills and exercises"
ICON = ""

# Idempotent: skip creation if a stack with this title already exists
existing = pg("GET", "/rest/v1/lesson_stacks?title=eq." + urllib.parse.quote(TITLE) + "&select=id")
if existing:
    print(f"Stack '{TITLE}' already exists (id={existing[0]['id']}) — nothing to do")
else:
    rows = pg(
        "POST",
        "/rest/v1/lesson_stacks",
        {"title": TITLE, "description": DESCRIPTION, "icon": ICON},
    )
    print(f"Created '{TITLE}' (id={rows[0]['id']}) — no drill sets linked yet")
