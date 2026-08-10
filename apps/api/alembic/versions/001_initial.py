"""Initial schema for murali transport platform.

Revision ID: 001_initial
Revises:
Create Date: 2026-08-10
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "booking_enquiries",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=32), nullable=False),
        sa.Column("pickup", sa.String(length=255), nullable=False),
        sa.Column("dropoff", sa.String(length=255), nullable=False),
        sa.Column("vehicle_type", sa.String(length=64), nullable=False),
        sa.Column("cargo", sa.String(length=255), nullable=False),
        sa.Column("preferred_date", sa.String(length=64), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        if_not_exists=True,
    )
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("owner_name", sa.String(length=120), nullable=False),
        sa.Column("owner_phone", sa.String(length=32), nullable=False),
        sa.Column("driver_name", sa.String(length=120), nullable=False),
        sa.Column("driver_phone", sa.String(length=32), nullable=False),
        sa.Column("plate_number", sa.String(length=32), nullable=False),
        sa.Column("vehicle_type", sa.String(length=64), nullable=False),
        sa.Column("capacity_tons", sa.Float(), nullable=False),
        sa.Column("current_location", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plate_number"),
        if_not_exists=True,
    )
    op.create_table(
        "load_requests",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("requestor_name", sa.String(length=120), nullable=False),
        sa.Column("requestor_phone", sa.String(length=32), nullable=False),
        sa.Column("pickup", sa.String(length=255), nullable=False),
        sa.Column("dropoff", sa.String(length=255), nullable=False),
        sa.Column("cargo", sa.String(length=255), nullable=False),
        sa.Column("weight_tons", sa.Float(), nullable=False),
        sa.Column("vehicle_preference", sa.String(length=64), nullable=False),
        sa.Column("preferred_date", sa.String(length=64), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        if_not_exists=True,
    )
    op.create_table(
        "assignments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("load_id", sa.Integer(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("assigned_by", sa.String(length=64), nullable=False),
        sa.Column("match_score", sa.Float(), nullable=False),
        sa.Column("match_reason", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["load_id"], ["load_requests.id"]),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("load_id"),
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_table("assignments")
    op.drop_table("load_requests")
    op.drop_table("vehicles")
    op.drop_table("booking_enquiries")
