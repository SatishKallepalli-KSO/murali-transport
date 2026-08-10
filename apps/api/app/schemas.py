"""Pydantic request/response schemas and public redaction helpers."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.models import LoadRequest


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
    driver_name: str = Field(min_length=2, max_length=120)
    driver_phone: str = Field(min_length=7, max_length=32)
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
    driver_name: str
    driver_phone: str
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


def mask_plate(plate: str) -> str:
    p = (plate or "").strip()
    if len(p) <= 4:
        return "****"
    return f"{p[:2]}{'*' * max(2, len(p) - 4)}{p[-2:]}"


def redact_vehicle(row: VehicleOut | object) -> VehicleOut:
    data = VehicleOut.model_validate(row)
    return data.model_copy(
        update={
            "owner_name": "Registered owner",
            "owner_phone": "",
            "driver_name": "",
            "driver_phone": "",
            "plate_number": mask_plate(data.plate_number),
            "notes": "",
        }
    )


def load_to_out(row: LoadRequest, *, public: bool = False) -> LoadOut:
    plate = None
    vehicle_id = None
    if row.assignment and row.assignment.vehicle:
        plate = row.assignment.vehicle.plate_number
        vehicle_id = row.assignment.vehicle_id
    elif row.assignment:
        vehicle_id = row.assignment.vehicle_id

    out = LoadOut(
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
        assigned_plate=mask_plate(plate) if public and plate else plate,
    )
    if public:
        return out.model_copy(
            update={
                "requestor_name": "Customer",
                "requestor_phone": "",
                "notes": "",
            }
        )
    return out
