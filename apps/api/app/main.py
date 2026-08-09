"""Murali Transport — end-to-end lorry booking platform API."""

from __future__ import annotations

import os
import secrets
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from app.db import get_db, init_db
from app.matching import location_match_score
from app.models import Assignment, BookingEnquiry, LoadRequest, Vehicle, utcnow

load_dotenv()

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
ADMIN_PIN = os.getenv("ADMIN_PIN", "dommeru123")
# In-memory session tokens for admin desk (fine for single free instance)
_admin_tokens: set[str] = set()

app = FastAPI(
    title="Murali Transport API",
    version="0.2.0",
    description="Lorry booking platform — owners, load requestors, and office admin",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- schemas ----------


class BookingCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=32)
    pickup: str = Field(min_length=2, max_length=255)
    dropoff: str = Field(min_length=2, max_length=255)
    vehicle_type: str = Field(default="mini_lorry", max_length=64)
    cargo: str = Field(default="", max_length=255)
    preferred_date: str = Field(default="", max_length=64)
    notes: str = Field(default="", max_length=2000)


class BookingOut(BaseModel):
    id: int
    name: str
    phone: str
    pickup: str
    dropoff: str
    vehicle_type: str
    cargo: str
    preferred_date: str
    notes: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class VehicleCreate(BaseModel):
    owner_name: str = Field(min_length=2, max_length=120)
    owner_phone: str = Field(min_length=7, max_length=32)
    plate_number: str = Field(min_length=4, max_length=32)
    vehicle_type: str = Field(default="mini_lorry", max_length=64)
    capacity_tons: float = Field(default=1.0, gt=0, le=50)
    current_location: str = Field(default="Dommeru", min_length=2, max_length=255)
    notes: str = Field(default="", max_length=2000)


class VehicleUpdateLocation(BaseModel):
    current_location: str = Field(min_length=2, max_length=255)
    status: str | None = Field(default=None, max_length=32)


class VehicleOut(BaseModel):
    id: int
    owner_name: str
    owner_phone: str
    plate_number: str
    vehicle_type: str
    capacity_tons: float
    current_location: str
    status: str
    notes: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LoadCreate(BaseModel):
    requestor_name: str = Field(min_length=2, max_length=120)
    requestor_phone: str = Field(min_length=7, max_length=32)
    pickup: str = Field(min_length=2, max_length=255)
    dropoff: str = Field(min_length=2, max_length=255)
    cargo: str = Field(min_length=1, max_length=255)
    weight_tons: float = Field(default=1.0, gt=0, le=50)
    vehicle_preference: str = Field(default="any", max_length=64)
    preferred_date: str = Field(default="", max_length=64)
    notes: str = Field(default="", max_length=2000)


class LoadOut(BaseModel):
    id: int
    requestor_name: str
    requestor_phone: str
    pickup: str
    dropoff: str
    cargo: str
    weight_tons: float
    vehicle_preference: str
    preferred_date: str
    notes: str
    status: str
    created_at: datetime
    updated_at: datetime
    assigned_vehicle_id: int | None = None
    assigned_plate: str | None = None

    model_config = {"from_attributes": True}


class VehicleSuggestion(BaseModel):
    vehicle: VehicleOut
    match_score: float
    match_reason: str


class AssignBody(BaseModel):
    load_id: int
    vehicle_id: int
    notes: str = Field(default="", max_length=2000)


class AssignmentOut(BaseModel):
    id: int
    load_id: int
    vehicle_id: int
    assigned_by: str
    match_score: float
    match_reason: str
    status: str
    notes: str
    created_at: datetime
    load: LoadOut | None = None
    vehicle: VehicleOut | None = None

    model_config = {"from_attributes": True}


class AdminLogin(BaseModel):
    pin: str = Field(min_length=4, max_length=64)


class AdminLoginOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------- helpers ----------


def require_admin(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Admin login required")
    token = authorization.split(" ", 1)[1].strip()
    if token not in _admin_tokens:
        raise HTTPException(status_code=401, detail="Invalid or expired admin session")
    return token


def load_to_out(row: LoadRequest) -> LoadOut:
    plate = None
    vehicle_id = None
    if row.assignment and row.assignment.vehicle:
        plate = row.assignment.vehicle.plate_number
        vehicle_id = row.assignment.vehicle_id
    elif row.assignment:
        vehicle_id = row.assignment.vehicle_id
    return LoadOut(
        id=row.id,
        requestor_name=row.requestor_name,
        requestor_phone=row.requestor_phone,
        pickup=row.pickup,
        dropoff=row.dropoff,
        cargo=row.cargo,
        weight_tons=row.weight_tons,
        vehicle_preference=row.vehicle_preference,
        preferred_date=row.preferred_date,
        notes=row.notes,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
        assigned_vehicle_id=vehicle_id,
        assigned_plate=plate,
    )


# ---------- lifecycle ----------


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "murali-transport-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/v1/office")
def office_info() -> dict:
    return {
        "name": "Murali Office Miny Lorry Transport",
        "address": "2MFM+F2V, Dommeru, Andhra Pradesh 534342, India",
        "rating": "4.2",
        "reviews": 27,
        "maps": "https://share.google/mAW3H8LK7Ogq0qrBl",
        "platform": "lorry-booking",
        "version": "0.2.0",
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
    """Public ticker feed for the animated landing backdrop."""
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
                "title": f"{vehicle.plate_number} · {vehicle.vehicle_type}",
                "detail": f"{vehicle.current_location} · {vehicle.status}",
                "at": vehicle.created_at.isoformat(),
            }
        )

    items.sort(key=lambda x: x["at"], reverse=True)
    return items[:limit]


# ---------- admin auth ----------


@app.post("/v1/admin/login", response_model=AdminLoginOut)
def admin_login(body: AdminLogin) -> AdminLoginOut:
    if not secrets.compare_digest(body.pin.strip(), ADMIN_PIN):
        raise HTTPException(status_code=401, detail="Incorrect admin PIN")
    token = secrets.token_urlsafe(24)
    _admin_tokens.add(token)
    return AdminLoginOut(access_token=token)


@app.post("/v1/admin/logout")
def admin_logout(authorization: str | None = Header(default=None)) -> dict[str, str]:
    if authorization and authorization.lower().startswith("bearer "):
        _admin_tokens.discard(authorization.split(" ", 1)[1].strip())
    return {"status": "ok"}


# ---------- vehicles (owners) ----------


@app.post("/v1/vehicles", response_model=VehicleOut, status_code=201)
def register_vehicle(body: VehicleCreate, db: Session = Depends(get_db)) -> Vehicle:
    plate = body.plate_number.strip().upper().replace(" ", "")
    existing = db.query(Vehicle).filter(Vehicle.plate_number == plate).first()
    if existing:
        raise HTTPException(status_code=409, detail="Vehicle plate already registered")
    row = Vehicle(
        owner_name=body.owner_name.strip(),
        owner_phone=body.owner_phone.strip(),
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
    return row


@app.get("/v1/vehicles", response_model=list[VehicleOut])
def list_vehicles(
    status: str | None = None,
    location: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[Vehicle]:
    limit = max(1, min(limit, 200))
    q = db.query(Vehicle)
    if status:
        q = q.filter(Vehicle.status == status)
    rows = q.order_by(Vehicle.updated_at.desc()).limit(limit).all()
    if location:
        scored = sorted(
            rows,
            key=lambda v: location_match_score(v.current_location, location)[0],
            reverse=True,
        )
        return scored
    return rows


@app.get("/v1/vehicles/{vehicle_id}", response_model=VehicleOut)
def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)) -> Vehicle:
    row = db.get(Vehicle, vehicle_id)
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return row


@app.patch("/v1/vehicles/{vehicle_id}/location", response_model=VehicleOut)
def update_vehicle_location(
    vehicle_id: int,
    body: VehicleUpdateLocation,
    db: Session = Depends(get_db),
) -> Vehicle:
    row = db.get(Vehicle, vehicle_id)
    if not row:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    row.current_location = body.current_location.strip()
    if body.status:
        row.status = body.status.strip()
    row.updated_at = utcnow()
    db.commit()
    db.refresh(row)
    return row


# ---------- loads (requestors) ----------


@app.post("/v1/loads", response_model=LoadOut, status_code=201)
def create_load(body: LoadCreate, db: Session = Depends(get_db)) -> LoadOut:
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
    return load_to_out(row)


@app.get("/v1/loads", response_model=list[LoadOut])
def list_loads(
    status: str | None = None,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> list[LoadOut]:
    limit = max(1, min(limit, 200))
    q = db.query(LoadRequest).options(
        joinedload(LoadRequest.assignment).joinedload(Assignment.vehicle)
    )
    if status:
        q = q.filter(LoadRequest.status == status)
    rows = q.order_by(LoadRequest.created_at.desc()).limit(limit).all()
    return [load_to_out(r) for r in rows]


@app.get("/v1/loads/{load_id}", response_model=LoadOut)
def get_load(load_id: int, db: Session = Depends(get_db)) -> LoadOut:
    row = (
        db.query(LoadRequest)
        .options(joinedload(LoadRequest.assignment).joinedload(Assignment.vehicle))
        .filter(LoadRequest.id == load_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Load not found")
    return load_to_out(row)


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
            # Still allow, but lower score via reason note
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


# ---------- assignments (admin) ----------


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
    return AssignmentOut(
        id=assignment.id,
        load_id=assignment.load_id,
        vehicle_id=assignment.vehicle_id,
        assigned_by=assignment.assigned_by,
        match_score=assignment.match_score,
        match_reason=assignment.match_reason,
        status=assignment.status,
        notes=assignment.notes,
        created_at=assignment.created_at,
        load=load_to_out(assignment.load),
        vehicle=VehicleOut.model_validate(assignment.vehicle),
    )


@app.get("/v1/assignments", response_model=list[AssignmentOut])
def list_assignments(
    limit: int = 50,
    db: Session = Depends(get_db),
    _: str = Depends(require_admin),
) -> list[AssignmentOut]:
    limit = max(1, min(limit, 200))
    rows = (
        db.query(Assignment)
        .options(joinedload(Assignment.load), joinedload(Assignment.vehicle))
        .order_by(Assignment.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        AssignmentOut(
            id=r.id,
            load_id=r.load_id,
            vehicle_id=r.vehicle_id,
            assigned_by=r.assigned_by,
            match_score=r.match_score,
            match_reason=r.match_reason,
            status=r.status,
            notes=r.notes,
            created_at=r.created_at,
            load=load_to_out(r.load) if r.load else None,
            vehicle=VehicleOut.model_validate(r.vehicle) if r.vehicle else None,
        )
        for r in rows
    ]


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


# ---------- legacy bookings ----------


@app.post("/v1/bookings", response_model=BookingOut, status_code=201)
def create_booking(body: BookingCreate, db: Session = Depends(get_db)) -> BookingEnquiry:
    """Compat: also creates a LoadRequest so admin desk sees it."""
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
def list_bookings(limit: int = 50, db: Session = Depends(get_db)) -> list[BookingEnquiry]:
    limit = max(1, min(limit, 200))
    return (
        db.query(BookingEnquiry)
        .order_by(BookingEnquiry.created_at.desc())
        .limit(limit)
        .all()
    )


@app.get("/v1/bookings/{booking_id}", response_model=BookingOut)
def get_booking(booking_id: int, db: Session = Depends(get_db)) -> BookingEnquiry:
    row = db.get(BookingEnquiry, booking_id)
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")
    return row


# ---------- static SPA ----------


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
