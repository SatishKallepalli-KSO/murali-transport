"""ORM models for freight booking enquiries."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class BookingEnquiry(Base):
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
