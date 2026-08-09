# Free deploy — Render + Neon

**Stack:** Render Free Docker web service + Neon Free Postgres (same pattern as AI Tutor Studio).

## One-click

1. Push this repo to GitHub.
2. Open: https://render.com/deploy?repo=https://github.com/SatishKallepalli-KSO/murali-transport
3. After the web service exists, set `DATABASE_URL` in Render to the Neon **pooled** URL (see [DATABASE.md](./DATABASE.md)).
4. Redeploy. Health: `https://murali-transport.onrender.com/healthz`

## Local

```bash
# Web
npm install && npm run dev

# API (SQLite by default)
cd apps/api && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Or point API at Neon:

```bash
export DATABASE_URL="$(neonctl connection-string --project-id polished-river-47162645 --org-id org-falling-bird-44330402 --database-name murali --role-name murali --pooled)"
```
