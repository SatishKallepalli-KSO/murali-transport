# User flows

End-to-end journeys for people using **Murali Transport Office** (Dommeru). The SPA switches portals in memory (`home` · `about` · `request` · `owner` · `admin`); deep links are not required for core flows.

## Actors

| Actor | Goal |
|-------|------|
| **Visitor** | Learn about the office, see routes, call/WhatsApp |
| **Load requestor** | Post cargo pickup/drop details so the office can assign a lorry |
| **Lorry owner** | Register a vehicle so the office can call for nearby loads |
| **Office admin** | Unlock the desk, match open loads to available lorries, complete trips |

---

## 1. Visitor — discover & contact

```mermaid
flowchart TD
  A[Land on home] --> B{Need?}
  B -->|Browse| C[Hero · services · routes map · testimonials]
  B -->|Call| D[tel: office phones]
  B -->|Chat| E[WhatsApp]
  B -->|Directions| F[Google Maps share link]
  B -->|Language| G[Toggle EN / TE]
  C --> H[About portal]
  H --> D
  H --> E
  H --> F
```

**Home highlights**

1. Brand hero and office positioning (Dommeru)
2. Market pulse / live board: available lorries + open loads
3. Role tiles: post load · register lorry · call office
4. Routes map: Dommeru hub → major cities
5. How it works + testimonials

**Outcome:** Visitor calls, messages WhatsApp, or starts a booking form.

---

## 2. Load requestor — post a load

```mermaid
sequenceDiagram
  actor R as Requestor
  participant UI as SPA · request portal
  participant API as FastAPI
  participant DB as Database

  R->>UI: Open Post load
  R->>UI: Enter name, phone, pickup, drop, cargo, weight, date
  UI->>API: POST /v1/loads
  API->>DB: Insert load_requests status=open
  API-->>UI: Created load
  UI-->>R: Success · office will arrange
```

```mermaid
stateDiagram-v2
  [*] --> open: POST /v1/loads
  open --> assigned: Admin assigns vehicle
  assigned --> in_transit: Trip starts optional
  assigned --> delivered: Admin completes
  in_transit --> delivered: Admin completes
  open --> cancelled: Cancelled
  delivered --> [*]
```

**Typical fields:** requestor name/phone, pickup, dropoff, cargo, weight (tons), vehicle preference, preferred date, notes.

**After submit:** Load appears on the public live board (open) and in Admin → Loads / Match.

---

## 3. Lorry owner — register a vehicle

```mermaid
sequenceDiagram
  actor O as Owner
  participant UI as SPA · owner portal
  participant API as FastAPI
  participant DB as Database

  O->>UI: Open Register lorry
  O->>UI: Enter owner, phones, plate, type, capacity, location
  UI->>API: POST /v1/vehicles
  API->>DB: Insert vehicles
  API-->>UI: Created vehicle
  UI-->>O: Success · office can assign loads
```

```mermaid
stateDiagram-v2
  [*] --> available: Registered available
  [*] --> pending_approval: If held for review
  available --> assigned: Admin assigns to load
  assigned --> in_transit: Trip in progress
  in_transit --> available: Assignment completed
  assigned --> available: Assignment completed
  available --> offline: Marked offline
  offline --> available: Back online
```

**Typical fields:** owner/driver contacts, plate number (unique), vehicle type (e.g. mini lorry), capacity tons, current location (default Dommeru), notes.

**After submit:** Vehicle can appear on the live “Available lorries” board and in Admin → Lorries / Match suggestions.

---

## 4. Quick-find from home

```mermaid
flowchart LR
  A[Home find bar] --> B[Pickup place + vehicle type]
  B --> C[Continue]
  C --> D[Request portal · fields prefilled where possible]
  D --> E[POST /v1/loads]
```

Reduces friction for callers who already know pickup and equipment type.

---

## 5. Office admin — unlock desk

```mermaid
sequenceDiagram
  actor A as Admin
  participant UI as SPA · admin portal
  participant API as FastAPI

  A->>UI: Open Admin
  A->>UI: Enter PIN
  UI->>API: POST /v1/admin/login { pin }
  alt Rate limited IP
    API-->>UI: 429
    UI-->>A: Try later
  else Invalid PIN
    API-->>UI: 401
    UI-->>A: Wrong PIN
  else Valid PIN
    API-->>UI: Bearer token
    UI->>UI: Store murali_admin_token
    UI-->>A: Desk unlocked
  end

  A->>UI: Lock desk
  UI->>UI: Clear token · local lock
```

**Defaults:** PIN from `ADMIN_PIN` · max 5 failures / 15 minutes per IP.

**Note:** “Lock desk” clears the browser token. Server tokens also clear on process restart (in-memory store).

---

## 6. Office admin — match & assign

```mermaid
flowchart TD
  A[Admin unlocked] --> B{Tab}
  B --> S[Snapshot · stats]
  B --> L[Loads · search / page]
  B --> M[Match]
  B --> F[Lorries · fleet]
  B --> G[Assignments]

  M --> M1[Select open load]
  M1 --> M2[GET /v1/loads/id/suggestions]
  M2 --> M3[Ranked by location score]
  M3 --> M4[Choose vehicle]
  M4 --> M5[POST /v1/assignments]
  M5 --> M6[Load → assigned · Vehicle → assigned]

  G --> G1[POST /v1/assignments/id/complete]
  G1 --> G2[Load → delivered · Vehicle → available]
```

```mermaid
sequenceDiagram
  actor A as Admin
  participant UI as Admin Match tab
  participant API as FastAPI
  participant M as matching.py
  participant DB as Database

  A->>UI: Pick open load
  UI->>API: GET /v1/loads/{id}/suggestions
  API->>M: Score each available vehicle vs pickup
  M-->>API: score + reason
  API-->>UI: Ranked list
  A->>UI: Assign vehicle
  UI->>API: POST /v1/assignments
  API->>DB: Create assignment · update load + vehicle status
  API-->>UI: Assignment created

  A->>UI: Mark complete later
  UI->>API: POST /v1/assignments/{id}/complete
  API->>DB: completed · load delivered · vehicle available
  API-->>UI: Done
```

**Matching cues shown to admin:** exact match, nearby, shared tokens, same corridor, or different area (still assignable).

---

## 7. End-to-end booking lifecycle

```mermaid
flowchart LR
  subgraph Public
    R[Requestor posts load]
    O[Owner registers lorry]
  end

  subgraph Office
    A[Admin reviews open load]
    S[Suggestions by location]
    X[Assign]
    C[Complete delivery]
  end

  R --> A
  O --> S
  A --> S --> X --> C
  C --> R2[Load delivered]
  C --> O2[Lorry available again]
```

1. Requestor posts load → `open`
2. Owner has vehicle → `available`
3. Admin assigns → load `assigned`, vehicle `assigned`
4. Admin completes → load `delivered`, vehicle `available`

Optional contact channels (call / WhatsApp) run in parallel for same-day office dispatch.

---

## 8. Language & accessibility of copy

```mermaid
flowchart LR
  U[User] --> T{Lang}
  T -->|en| EN[English strings]
  T -->|te| TE[Telugu strings]
  EN --> UI[Same portals / forms]
  TE --> UI
```

All primary CTAs, forms, admin chrome, and marketing sections pull from `content.ts` dictionaries. Switching language does not change portal or auth state.

---

## 9. Suspend / resume the product

Operational flow (not in-app):

1. Open Render → service **murali-transport**
2. **Suspend** → site stops for custom domain and `.onrender.com`
3. **Resume** when needed again

Domain billing on Cloudflare is independent of Render suspend.

---

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — components, API, data, deploy
- [DEPLOY-FREE.md](./DEPLOY-FREE.md) — Render + Neon setup
- [DATABASE.md](./DATABASE.md) — Neon IDs and backup
