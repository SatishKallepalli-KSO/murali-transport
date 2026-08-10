# Murali Office Miny Lorry Transport

End-to-end **lorry booking platform** for Dommeru:

1. **Lorry owners** register vehicles (plate, capacity, current location)
2. **Load requestors** post freight details
3. **Office admin** receives requests and assigns lorries ranked by location match

**Live:** https://muralitransport.com  
**Fallback:** https://murali-transport.onrender.com  
**Stack:** Render Free + Neon Free · Cloudflare DNS for the custom domain

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture, API, data model, security |
| [docs/USER-FLOWS.md](docs/USER-FLOWS.md) | User journeys and state diagrams |
| [docs/CI.md](docs/CI.md) | CI workflow setup |
| [docs/SECURITY.md](docs/SECURITY.md) | PIN, PII redaction, rate limits |
| [docs/DEPLOY-FREE.md](docs/DEPLOY-FREE.md) | Deploy on Render + Neon |
| [docs/DATABASE.md](docs/DATABASE.md) | Neon connection and backups |
| [docs/README.md](docs/README.md) | Docs index |

## Quick start

```bash
npm install && npm run dev   # http://localhost:5175

cd apps/api && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Admin desk PIN: set `ADMIN_PIN` (8+ characters). Do **not** use old documented defaults. Local-only: `ALLOW_INSECURE_DEFAULT_PIN=1`.

## API highlights

| Method | Path | Who |
|--------|------|-----|
| POST | `/v1/vehicles` | Owner registers lorry |
| POST | `/v1/loads` | Requestor posts load |
| POST | `/v1/admin/login` | Admin PIN → token |
| GET | `/v1/loads/{id}/suggestions` | Location-ranked lorries (admin) |
| POST | `/v1/assignments` | Admin assigns vehicle |
| POST | `/v1/assignments/{id}/complete` | Mark delivered |

Public list endpoints return **redacted** PII (no phones). Pass admin Bearer for full records.

## Tests & CI

```bash
npm run lint && npm run build
cd apps/api && pip install -r requirements.txt && pytest -q
```

GitHub Actions runs lint, build, and API tests on every push/PR.

## Suspend the site

Render Dashboard → service **murali-transport** → **Suspend**. Resume anytime. The Cloudflare domain is billed separately.
