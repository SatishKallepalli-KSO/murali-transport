# Security notes

## Admin PIN

- Set a strong `ADMIN_PIN` (8+ characters) on Render and locally.
- Production (Render) **rejects** missing PINs and known weak defaults (`dommeru123`, `admin`, `1234`, …).
- Local-only escape hatch: `ALLOW_INSECURE_DEFAULT_PIN=1` (never on Render).

## Public vs admin data

| Surface | Phones / names / plates / notes |
|---------|----------------------------------|
| Public `GET /v1/vehicles`, `/v1/loads` | Redacted / masked |
| Admin Bearer on same routes | Full records |
| `PATCH /v1/vehicles/{id}/location` | Admin only |
| `GET /v1/bookings` | Admin only |

## Rate limits

- Admin login: 5 failures / IP / 15 minutes
- Public writes (`POST` loads, vehicles, bookings): 20 / IP / hour

## Sessions

- Admin Bearer tokens are in-memory (single Render instance).
- Browser stores token in `sessionStorage` (cleared when the tab session ends).
- Logout calls `POST /v1/admin/logout` to revoke the server token.
