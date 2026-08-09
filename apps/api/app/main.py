"""Murali Transport — FastAPI backend (+ static web UI)."""

from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db, init_db
from app.models import BookingEnquiry

load_dotenv()

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(
    title="Murali Transport API",
    version="0.1.0",
    description="Freight booking enquiries for Murali Office Miny Lorry Transport",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    }


@app.post("/v1/bookings", response_model=BookingOut, status_code=201)
def create_booking(body: BookingCreate, db: Session = Depends(get_db)) -> BookingEnquiry:
    row = BookingEnquiry(
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
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


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
