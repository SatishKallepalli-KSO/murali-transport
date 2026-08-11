"""Murali Transport — end-to-end lorry booking platform API."""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session, joinedload

from app.auth import (
    get_admin_pin,
    issue_token,
    optional_admin,
    require_admin,
    revoke_token,
)
from app.db import get_db, init_db
from app.matching import location_match_score
from app.models import Assignment, BookingEnquiry, LoadRequest, Vehicle, utcnow
from app.rate_limit import (
    clear_login_failures,
    client_ip,
    enforce_login,
    enforce_public_write,
    login_failures_remaining,
    record_login_failure,
)
from app.schemas import (
    AdminLogin,
    AdminLoginOut,
    AssignBody,
    AssignmentOut,
    BookingCreate,
    BookingOut,
    LoadCreate,
    LoadOut,
    VehicleCreate,
    VehicleOut,
    VehicleSuggestion,
    VehicleUpdateLocation,
    load_to_out,
    redact_vehicle,
)

load_dotenv()

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
APP_URL = (os.getenv("APP_URL") or "").rstrip("/")

app = FastAPI(
    title="Murali Transport API",
    version="0.4.0",
    description="Lorry booking platform — owners, load requestors, and office admin",
)

_cors_origins = [
    o.strip()
    for o in (os.getenv("CORS_ORIGINS") or "*").split(",")
    if o.strip()
]
# Same-origin Docker deploy does not need credentials+wildcard; keep simple.
_allow_credentials = "*" not in _cors_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/healthz")
def healthz() -> dict[str, str]:
    from app.db import DATABASE_URL

    backend = "postgres" if DATABASE_URL.startswith("postgresql") else "sqlite"
    return {
        "status": "ok",
        "service": "murali-transport-api",
        "db": backend,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/v1/office")
def office_info() -> dict:
    return {
        "name": "Murali Office Miny Lorry Transport",
        "owner": "Murali Kallepalli",
        "phone": "+919949705008",
        "phone_alt": "+918885075008",
        "phones": ["+919949705008", "+918885075008"],
        "address": "2MFM+F2V, Dommeru, Andhra Pradesh 534342, India",
        "rating": "4.2",
        "reviews": 27,
        "maps": "https://share.google/mAW3H8LK7Ogq0qrBl",
        "platform": "lorry-booking",
        "version": "0.4.0",
        "app_url": APP_URL or None,
    }


@app.get("/v1/stats")
def platform_stats(db: Session = Depends(get_db)) -> dict:
    vehicles = db.query(Vehicle).count()
    available = db.query(Vehicle).filter(Vehicle.status == "available").count()
    open_loads = db.query(LoadRequest).filter(LoadRequest.status == "open").count()
    assigned = db.query(LoadRequest).filter(LoadRequest.status == "assigned").count()
    assignments = db.query(Assignment).count()
    return {
        "vehicles": vehicles,
        "available_vehicles": available,
        "open_loads": open_loads,
        "assigned_loads": assigned,
        "assignments": assignments,
    }


@app.get("/v1/activity")
def recent_activity(limit: int = 12, db: Session = Depends(get_db)) -> list[dict]:
    """Public ticker — no phones or full plates."""
    from app.schemas import mask_plate

    limit = max(1, min(limit, 30))
    items: list[dict] = []

    for load in (
        db.query(LoadRequest)
        .order_by(LoadRequest.created_at.desc())
        .limit(limit)
        .all()
    ):
        items.append(
            {
                "kind": "load",
                "id": load.id,
                "title": f"{load.pickup} → {load.dropoff}",
                "detail": f"{load.cargo} · {load.weight_tons:g}t · {load.status}",
                "at": load.created_at.isoformat(),
            }
        )

    for vehicle in (
        db.query(Vehicle).order_by(Vehicle.created_at.desc()).limit(limit).all()
    ):
        items.append(
            {
                "kind": "vehicle",
                "id": vehicle.id,
                "title": f"{mask_plate(vehicle.plate_number)} · {vehicle.vehicle_type}",
                "detail": f"{vehicle.current_location} · {vehicle.status}",
                "at": vehicle.created_at.isoformat(),
            }
        )

    items.sort(key=lambda x: x["at"], reverse=True)
    return items[:limit]


@app.post("/v1/admin/login", response_model=AdminLoginOut)
def admin_login(body: AdminLogin, request: Request) -> AdminLoginOut:
    ip = client_ip(request)
    enforce_login(ip)
    submitted = body.pin.strip()
    if not secrets.compare_digest(submitted, get_admin_pin()):
        record_login_failure(ip)
        remaining = login_failures_remaining(ip)
        raise HTTPException(
            status_code=401,
            detail=(
                "Incorrect admin PIN"
                if remaining > 0
                else "Too many failed login attempts. Try again in 15 minutes."
            ),
        )
    clear_login_failures(ip)
    return AdminLoginOut(access_token=issue_token())


@app.post("/v1/admin/logout")
def admin_logout(authorization: str | None = Header(default=None)) -> dict[str, str]:
    if authorization and authorization.lower().startswith("bearer "):
        revoke_token(authorization.split(" ", 1)[1].strip())
    return {"status": "ok"}


@app.post("/v1/vehicles", response_model=VehicleOut, status_code=201)
def register_vehicle(
    body: VehicleCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> VehicleOut:
    enforce_public_write(request, "vehicles")
    plate = body.plate_number.strip().upper().replace(" ", "")
    existing = db.query(Vehicle).filter(Vehicle.plate_number == plate).first()
    if existing:
        raise HTTPException(status_code=409, detail="Vehicle plate already registered")
    row = Vehicle(
        owner_name=body.owner_name.strip(),
        owner_phone=body.owner_phone.strip(),
        driver_name=body.driver_name.strip(),
        driver_phone=body.driver_phone.strip(),
        plate_number=plate,
        vehicle_type=body.vehicle_type.strip() or "mini_lorry",
        capacity_tons=body.capacity_tons,
        current_location=body.current_location.strip() or "Dommeru",
        status="available",
        notes=body.notes.strip(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    # Confirm to submitter with full record once; public lists stay redacted.
    return VehicleOut.model_validate(row)


@app.get("/v1/vehicles", response_model=list[VehicleOut])
def list_vehicles(
    status: str | None = None,
    location: str | None = None,
    q: str | None = None,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: str | None = Depends(optional_admin),
) -> list[VehicleOut]:
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    query = db.query(Vehicle)
    if status:
        query = query.filter(Vehicle.status == status)
    if q and q.strip():
        if not admin:
            raise HTTPException(
                status_code=401,
                detail="Admin login required to search private vehicle fields",
            )
        term = f"%{q.strip()}%"
        query = query.filter(
            (Vehicle.plate_number.ilike(term))
            | (Vehicle.owner_name.ilike(term))
            | (Vehicle.owner_phone.ilike(term))
            | (Vehicle.driver_name.ilike(term))
            | (Vehicle.driver_phone.ilike(term))
            | (Vehicle.current_location.ilike(term))
            | (Vehicle.vehicle_type.ilike(term))
        )
    rows = query.order_by(Vehicle.updated_at.desc()).offset(offset).limit(limit).all()
    if location:
        rows = sorted(
            rows,
            key=lambda v: location_match_score(v.current_location, location)[0],
            reverse=True,
        )
    out = [VehicleOut.model_validate(r) for r in rows]
    if admin:
        return out
    return [redact_vehicle(v) for v in out]


@app.get("/v1/vehicles/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    admin: str | None = Depends(optional_admin),
) -> VehicleOut:
    row = db.get(Vehicle, vehicle_id)
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    out = VehicleOut.model_validate(row)
    return out if admin else redact_vehicle(out)


@app.patch("/v1/vehicles/{vehicle_id}/location", response_model=VehicleOut)
def update_vehicle_location(
    vehicle_id: int,
    body: VehicleUpdateLocation,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> VehicleOut:
    row = db.get(Vehicle, vehicle_id)
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    row.current_location = body.current_location.strip()
    if body.status:
        row.status = body.status.strip()
    row.updated_at = utcnow()
    db.commit()
    db.refresh(row)
    return VehicleOut.model_validate(row)


@app.post("/v1/loads", response_model=LoadOut, status_code=201)
def create_load(
    body: LoadCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> LoadOut:
    enforce_public_write(request, "loads")
    row = LoadRequest(
        requestor_name=body.requestor_name.strip(),
        requestor_phone=body.requestor_phone.strip(),
        pickup=body.pickup.strip(),
        dropoff=body.dropoff.strip(),
        cargo=body.cargo.strip(),
        weight_tons=body.weight_tons,
        vehicle_preference=body.vehicle_preference.strip() or "any",
        preferred_date=body.preferred_date.strip(),
        notes=body.notes.strip(),
        status="open",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return load_to_out(row, public=False)


@app.get("/v1/loads", response_model=list[LoadOut])
def list_loads(
    status: str | None = None,
    q: str | None = None,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
    admin: str | None = Depends(optional_admin),
) -> list[LoadOut]:
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    query = db.query(LoadRequest).options(
        joinedload(LoadRequest.assignment).joinedload(Assignment.vehicle)
    )
    if status:
        query = query.filter(LoadRequest.status == status)
    if q and q.strip():
        if not admin:
            raise HTTPException(
                status_code=401,
                detail="Admin login required to search private load fields",
            )
        term = f"%{q.strip()}%"
        query = query.filter(
            (LoadRequest.requestor_name.ilike(term))
            | (LoadRequest.requestor_phone.ilike(term))
            | (LoadRequest.pickup.ilike(term))
            | (LoadRequest.dropoff.ilike(term))
            | (LoadRequest.cargo.ilike(term))
            | (LoadRequest.preferred_date.ilike(term))
            | (LoadRequest.notes.ilike(term))
        )
    rows = query.order_by(LoadRequest.created_at.desc()).offset(offset).limit(limit).all()
    return [load_to_out(r, public=admin is None) for r in rows]


@app.get("/v1/loads/{load_id}", response_model=LoadOut)
def get_load(
    load_id: int,
    db: Session = Depends(get_db),
    admin: str | None = Depends(optional_admin),
) -> LoadOut:
    row = (
        db.query(LoadRequest)
        .options(joinedload(LoadRequest.assignment).joinedload(Assignment.vehicle))
        .filter(LoadRequest.id == load_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Load not found")
    return load_to_out(row, public=admin is None)


@app.get("/v1/loads/{load_id}/suggestions", response_model=list[VehicleSuggestion])
def suggest_vehicles_for_load(
    load_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> list[VehicleSuggestion]:
    load = db.get(LoadRequest, load_id)
    if not load:
        raise HTTPException(status_code=404, detail="Load not found")
    vehicles = (
        db.query(Vehicle)
        .filter(Vehicle.status.in_(["available", "pending_approval"]))
        .all()
    )
    suggestions: list[VehicleSuggestion] = []
    for vehicle in vehicles:
        if vehicle.capacity_tons + 1e-6 < load.weight_tons:
            continue
        if (
            load.vehicle_preference not in ("", "any")
            and vehicle.vehicle_type != load.vehicle_preference
        ):
            score, reason = location_match_score(vehicle.current_location, load.pickup)
            score *= 0.7
            reason = f"{reason} · type differs ({vehicle.vehicle_type})"
        else:
            score, reason = location_match_score(vehicle.current_location, load.pickup)
        suggestions.append(
            VehicleSuggestion(
                vehicle=VehicleOut.model_validate(vehicle),
                match_score=round(score, 3),
                match_reason=reason,
            )
        )
    suggestions.sort(key=lambda s: s.match_score, reverse=True)
    return suggestions


def _assignment_out(row: Assignment) -> AssignmentOut:
    return AssignmentOut(
        id=row.id,
        load_id=row.load_id,
        vehicle_id=row.vehicle_id,
        assigned_by=row.assigned_by,
        match_score=row.match_score,
        match_reason=row.match_reason,
        status=row.status,
        notes=row.notes,
        created_at=row.created_at,
        load=load_to_out(row.load) if row.load else None,
        vehicle=VehicleOut.model_validate(row.vehicle) if row.vehicle else None,
    )


@app.post("/v1/assignments", response_model=AssignmentOut, status_code=201)
def assign_load(
    body: AssignBody,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> AssignmentOut:
    load = (
        db.query(LoadRequest)
        .options(joinedload(LoadRequest.assignment))
        .filter(LoadRequest.id == body.load_id)
        .first()
    )
    if not load:
        raise HTTPException(status_code=404, detail="Load not found")
    if load.status != "open":
        raise HTTPException(status_code=400, detail=f"Load is {load.status}, not open")
    if load.assignment:
        raise HTTPException(status_code=409, detail="Load already assigned")

    vehicle = db.get(Vehicle, body.vehicle_id)
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if vehicle.status not in ("available", "pending_approval"):
        raise HTTPException(
            status_code=400,
            detail=f"Vehicle is {vehicle.status}, not available",
        )
    if vehicle.capacity_tons + 1e-6 < load.weight_tons:
        raise HTTPException(status_code=400, detail="Vehicle capacity too low for this load")

    score, reason = location_match_score(vehicle.current_location, load.pickup)
    assignment = Assignment(
        load_id=load.id,
        vehicle_id=vehicle.id,
        assigned_by="admin",
        match_score=score,
        match_reason=reason,
        status="assigned",
        notes=body.notes.strip(),
    )
    load.status = "assigned"
    load.updated_at = utcnow()
    vehicle.status = "assigned"
    vehicle.updated_at = utcnow()
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    assignment = (
        db.query(Assignment)
        .options(joinedload(Assignment.load), joinedload(Assignment.vehicle))
        .filter(Assignment.id == assignment.id)
        .first()
    )
    assert assignment is not None
    return _assignment_out(assignment)


@app.get("/v1/assignments", response_model=list[AssignmentOut])
def list_assignments(
    q: str | None = None,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> list[AssignmentOut]:
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    query = db.query(Assignment).options(
        joinedload(Assignment.load), joinedload(Assignment.vehicle)
    )
    if q and q.strip():
        term = f"%{q.strip()}%"
        query = (
            query.outerjoin(LoadRequest, Assignment.load_id == LoadRequest.id)
            .outerjoin(Vehicle, Assignment.vehicle_id == Vehicle.id)
            .filter(
                (Vehicle.plate_number.ilike(term))
                | (LoadRequest.pickup.ilike(term))
                | (LoadRequest.dropoff.ilike(term))
                | (LoadRequest.requestor_name.ilike(term))
                | (Assignment.match_reason.ilike(term))
                | (Assignment.status.ilike(term))
            )
        )
    rows = (
        query.order_by(Assignment.created_at.desc()).offset(offset).limit(limit).all()
    )
    return [_assignment_out(r) for r in rows]


@app.post("/v1/assignments/{assignment_id}/complete", response_model=AssignmentOut)
def complete_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> AssignmentOut:
    row = (
        db.query(Assignment)
        .options(joinedload(Assignment.load), joinedload(Assignment.vehicle))
        .filter(Assignment.id == assignment_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    row.status = "completed"
    if row.load:
        row.load.status = "delivered"
        row.load.updated_at = utcnow()
    if row.vehicle:
        row.vehicle.status = "available"
        if row.load:
            row.vehicle.current_location = row.load.dropoff
        row.vehicle.updated_at = utcnow()
    db.commit()
    db.refresh(row)
    return _assignment_out(row)


@app.post("/v1/bookings", response_model=BookingOut, status_code=201)
def create_booking(
    body: BookingCreate,
    request: Request,
    db: Session = Depends(get_db),
) -> BookingEnquiry:
    enforce_public_write(request, "bookings")
    enquiry = BookingEnquiry(
        name=body.name.strip(),
        phone=body.phone.strip(),
        pickup=body.pickup.strip(),
        dropoff=body.dropoff.strip(),
        vehicle_type=body.vehicle_type.strip() or "mini_lorry",
        cargo=body.cargo.strip(),
        preferred_date=body.preferred_date.strip(),
        notes=body.notes.strip(),
        status="new",
    )
    load = LoadRequest(
        requestor_name=body.name.strip(),
        requestor_phone=body.phone.strip(),
        pickup=body.pickup.strip(),
        dropoff=body.dropoff.strip(),
        cargo=body.cargo.strip() or "General cargo",
        weight_tons=1.0,
        vehicle_preference=body.vehicle_type.strip() or "any",
        preferred_date=body.preferred_date.strip(),
        notes=body.notes.strip(),
        status="open",
    )
    db.add(enquiry)
    db.add(load)
    db.commit()
    db.refresh(enquiry)
    return enquiry


@app.get("/v1/bookings", response_model=list[BookingOut])
def list_bookings(
    limit: int = 50,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> list[BookingEnquiry]:
    limit = max(1, min(limit, 200))
    return (
        db.query(BookingEnquiry)
        .order_by(BookingEnquiry.created_at.desc())
        .limit(limit)
        .all()
    )


@app.get("/v1/bookings/{booking_id}", response_model=BookingOut)
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> BookingEnquiry:
    row = db.get(BookingEnquiry, booking_id)
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")
    return row


if STATIC_DIR.exists():
    assets = STATIC_DIR / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/")
    def spa_index() -> FileResponse:
        return FileResponse(STATIC_DIR / "index.html")

    @app.get("/{full_path:path}")
    def spa_fallback(full_path: str) -> FileResponse:
        if full_path.startswith("v1/") or full_path == "healthz":
            raise HTTPException(status_code=404, detail="Not found")
        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
