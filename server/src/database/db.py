# backend/db.py
import os, requests

SUPABASE_URL = (os.getenv("SUPABASE_URL") or "").rstrip("/")
SERVICE_KEY  = os.getenv("SUPABASE_SERVICE_KEY") or ""  # dev-only
REST = f"{SUPABASE_URL}/rest/v1"

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json",
    # Ask PostgREST to return the inserted/updated rows so callers can use IDs immediately
    "Prefer": "return=representation",
}

def _check_config():
    problems = []
    if not SUPABASE_URL.startswith("https://") or not SUPABASE_URL.endswith(".supabase.co"):
        problems.append(f"Bad SUPABASE_URL: {SUPABASE_URL!r}")
    if not SERVICE_KEY:
        problems.append("Missing SUPABASE_SERVICE_ROLE_KEY.")
    if problems:
        raise RuntimeError(" | ".join(problems))

def _handle(resp: requests.Response):
    try:
        resp.raise_for_status()
    except requests.HTTPError as e:
        # show upstream body so you see *why*
        raise RuntimeError(f"Supabase REST {resp.status_code}: {resp.text}") from e
    return resp.json() if resp.text else []

def sb_select(table: str, params: dict):
    _check_config()
    r = requests.get(f"{REST}/{table}", headers=HEADERS, params=params, timeout=20)
    return _handle(r)

def sb_insert(table, json_body):
    _check_config()
    r = requests.post(f"{REST}/{table}", headers=HEADERS, json=json_body, timeout=20)
    return _handle(r)

def sb_update(table, where_qs, json_body):
    _check_config()
    # where_qs example: {"id": "eq.<uuid>"}
    r = requests.patch(f"{REST}/{table}", headers=HEADERS, params=where_qs, json=json_body, timeout=20)
    return _handle(r)
