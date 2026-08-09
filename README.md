# Murali Office Miny Lorry Transport

End-to-end **lorry booking platform** for Dommeru:

1. **Lorry owners** register vehicles (plate, capacity, current location)
2. **Load requestors** post freight details
3. **Office admin** receives requests and assigns lorries ranked by location match

**Live:** https://murali-transport.onrender.com  
**Stack:** Render Free + Neon Free (same as AI Tutor Studio)

## Quick start

```bash
npm install && npm run dev   # http://localhost:5175

cd apps/api && python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Admin desk PIN default: `dommeru123` (override with `ADMIN_PIN`).

## API highlights

| Method | Path | Who |
|--------|------|-----|
| POST | `/v1/vehicles` | Owner registers lorry |
| POST | `/v1/loads` | Requestor posts load |
| POST | `/v1/admin/login` | Admin PIN → token |
| GET | `/v1/loads/{id}/suggestions` | Location-ranked lorries |
| POST | `/v1/assignments` | Admin assigns vehicle |
| POST | `/v1/assignments/{id}/complete` | Mark delivered |

See [docs/DEPLOY-FREE.md](docs/DEPLOY-FREE.md) and [docs/DATABASE.md](docs/DATABASE.md).
