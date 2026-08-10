# Free deploy — Render + Neon

**Stack:** Render Free Docker web service + Neon Free Postgres (same pattern as AI Tutor Studio).

## One-click

1. Push this repo to GitHub.
2. Open: https://render.com/deploy?repo=https://github.com/SatishKallepalli-KSO/murali-transport
3. After the web service exists, set `DATABASE_URL` in Render to the Neon **pooled** URL (see [DATABASE.md](./DATABASE.md)).
4. Redeploy. Health: `https://murali-transport.onrender.com/healthz` (or `https://muralitransport.com/healthz` after custom domain).

## Custom domain

Production domain: **https://muralitransport.com** (Cloudflare Registrar + DNS).

1. Add `muralitransport.com` and `www.muralitransport.com` under Render → Custom Domains.
2. In Cloudflare DNS, CNAME `@` and `www` → `murali-transport.onrender.com` (use DNS-only / grey cloud until verified).
3. Set Render env `APP_URL=https://muralitransport.com`.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full request path.

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
