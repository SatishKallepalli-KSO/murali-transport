"""ORM models for the lorry booking platform."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BookingEnquiry(Base):
    """Legacy simple enquiry (kept for older rows)."""

    __tablename__ = "booking_enquiries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    pickup: Mapped[str] = mapped_column(String(255), nullable=False)
    dropoff: Mapped[str] = mapped_column(String(255), nullable=False)
    vehicle_type: Mapped[str] = mapped_column(String(64), nullable=False, default="mini_lorry")
    cargo: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    preferred_date: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="new")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )


class Vehicle(Base):
    """Lorry / truck registered by an owner with the transport office."""

    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    owner_name: Mapped[str] = mapped_column(String(120), nullable=False)
    owner_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    plate_number: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    vehicle_type: Mapped[str] = mapped_column(String(64), nullable=False, default="mini_lorry")
    capacity_tons: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    current_location: Mapped[str] = mapped_column(String(255), nullable=False, default="Dommeru")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="available")
    # available | assigned | in_transit | offline | pending_approval
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    assignments: Mapped[list["Assignment"]] = relationship(back_populates="vehicle")


class LoadRequest(Base):
    """Goods / freight request posted by a requestor."""

    __tablename__ = "load_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    requestor_name: Mapped[str] = mapped_column(String(120), nullable=False)
    requestor_phone: Mapped[str] = mapped_column(String(32), nullable=False)
    pickup: Mapped[str] = mapped_column(String(255), nullable=False)
    dropoff: Mapped[str] = mapped_column(String(255), nullable=False)
    cargo: Mapped[str] = mapped_column(String(255), nullable=False)
    weight_tons: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    vehicle_preference: Mapped[str] = mapped_column(String(64), nullable=False, default="any")
    preferred_date: Mapped[str] = mapped_column(String(64), nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    # open | assigned | in_transit | delivered | cancelled
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        onupdate=utcnow,
    )

    assignment: Mapped["Assignment | None"] = relationship(
        back_populates="load",
        uselist=False,
    )


class Assignment(Base):
    """Admin assigns a registered vehicle to an open load."""

    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    load_id: Mapped[int] = mapped_column(ForeignKey("load_requests.id"), nullable=False, unique=True)
    vehicle_id: Mapped[int] = mapped_column(ForeignKey("vehicles.id"), nullable=False)
    assigned_by: Mapped[str] = mapped_column(String(64), nullable=False, default="admin")
    match_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    match_reason: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="assigned")
    # assigned | in_transit | completed | cancelled
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
    )

    load: Mapped[LoadRequest] = relationship(back_populates="assignment")
    vehicle: Mapped[Vehicle] = relationship(back_populates="assignments")
