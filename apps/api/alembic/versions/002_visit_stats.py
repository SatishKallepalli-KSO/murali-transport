"""Add privacy-safe visit analytics aggregate tables.

Revision ID: 002_visit_stats
Revises: 001_initial
Create Date: 2026-08-14
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_visit_stats"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "visit_stats_daily",
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("hits", sa.Integer(), nullable=False),
        sa.Column("uniques", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("day"),
        if_not_exists=True,
    )
    op.create_table(
        "visit_stats_geo_daily",
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("country", sa.String(length=8), nullable=False),
        sa.Column("city", sa.String(length=80), nullable=False),
        sa.Column("hits", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("day", "country", "city"),
        if_not_exists=True,
    )
    op.create_table(
        "visit_stats_uniques",
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("visitor_hash", sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint("day", "visitor_hash"),
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_table("visit_stats_uniques")
    op.drop_table("visit_stats_geo_daily")
    op.drop_table("visit_stats_daily")
