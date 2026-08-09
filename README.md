# Murali Office Miny Lorry Transport

Website + booking API for **Murali Office Miny Lorry Transport** (Dommeru, Andhra Pradesh).

**Address:** 2MFM+F2V, Dommeru, Andhra Pradesh 534342, India  
**Stack:** same free pattern as AI Tutor Studio — **Render Free** + **Neon Free Postgres**

## Quick start

```bash
npm install
npm run dev          # web → http://localhost:5175

cd apps/api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Omit `DATABASE_URL` for local SQLite (`apps/api/data/murali.db`).

## Production (free)

```bash
./scripts/deploy-free.sh
```

Then set Render env `DATABASE_URL` to the Neon pooled URL — see [docs/DEPLOY-FREE.md](docs/DEPLOY-FREE.md) and [docs/DATABASE.md](docs/DATABASE.md).

Expected live URL: **https://murali-transport.onrender.com**

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/healthz` | Health |
| GET | `/v1/office` | Office info |
| POST | `/v1/bookings` | Create freight enquiry |
| GET | `/v1/bookings` | List enquiries |

## Docker

```bash
docker compose up --build
# http://localhost:8000
```
