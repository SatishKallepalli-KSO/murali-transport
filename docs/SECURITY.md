# Security notes

## Admin PIN

- Set a strong `ADMIN_PIN` (8+ characters) on Render and locally.
- Production (Render) **rejects** missing PINs and known weak defaults (`dommeru123`, `admin`, `1234`, …).
- Local-only escape hatch: `ALLOW_INSECURE_DEFAULT_PIN=1` (never on Render).

## Public vs admin data

| Surface | Phones / names / plates / notes |
|---------|----------------------------------|
| Public `GET /v1/vehicles`, `/v1/loads` | Redacted / masked |
| Public open loads board | Places masked (`Ra******`), cargo shown as `Freight`, no date/notes/phones |
| Admin Bearer on same routes | Full records |
| `PATCH /v1/vehicles/{id}/location` | Admin only |
| `GET /v1/bookings` | Admin only |

## Rate limits

- Admin login: 5 failures / IP / 15 minutes
- Public writes (`POST` loads, vehicles, bookings), per IP and action:
  - **1 / minute** (stops rapid bots)
  - **3 / 5 minutes**
  - **8 / hour**
- Analytics hit beacon: **60 / minute / IP**
- Exceeded limits return HTTP `429` with a `Retry-After` header

## Visit analytics (privacy-safe)

- Public pages send a tiny `POST /v1/analytics/hit` (admin desk is not counted)
- **No IP addresses are stored** — only a daily one-way hash for unique counting, then dropped within ~2 days
- Country/city come from CDN headers when present (`CF-IPCountry` / city); otherwise shown as Unknown
- Admin **Visits** tab shows daily hits/uniques and top locations for the last 14 days

## Sessions

- Admin Bearer tokens are in-memory (single Render instance).
- Browser stores token in `sessionStorage` (cleared when the tab session ends).
- Logout calls `POST /v1/admin/logout` to revoke the server token.
