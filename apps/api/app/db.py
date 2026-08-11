"""Alembic migrations + create_all safety net for existing Neon DBs."""

from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

_raw_url = (os.getenv("DATABASE_URL") or "").strip()
_is_prod = bool(
    os.getenv("RENDER")
    or os.getenv("RENDER_SERVICE_ID")
    or os.getenv("ENVIRONMENT", "").lower() == "production"
)

if _is_prod and not _raw_url:
    raise RuntimeError(
        "DATABASE_URL is required on Render. "
        "Without it the app uses container SQLite and data is lost on every redeploy."
    )

DATABASE_URL = _raw_url or f"sqlite:///{DATA_DIR / 'murali.db'}"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if _is_prod and DATABASE_URL.startswith("sqlite"):
    raise RuntimeError("SQLite is not allowed in production. Set DATABASE_URL to Neon Postgres.")


connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_column(table: str, column: str, ddl: str) -> None:
    insp = inspect(engine)
    if table not in insp.get_table_names():
        return
    existing = {c["name"] for c in insp.get_columns(table)}
    if column in existing:
        return
    with engine.begin() as conn:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))


def run_migrations() -> None:
    """Apply Alembic migrations when alembic is available."""
    try:
        from alembic import command
        from alembic.config import Config
    except ImportError:
        return

    root = Path(__file__).resolve().parent.parent
    ini = root / "alembic.ini"
    if not ini.exists():
        return
    cfg = Config(str(ini))
    cfg.set_main_option("sqlalchemy.url", DATABASE_URL)
    command.upgrade(cfg, "head")


def init_db() -> None:
    from app import models  # noqa: F401

    # Prefer Alembic; keep create_all for first boot / legacy DBs.
    try:
        run_migrations()
    except Exception:
        # Existing Neon DBs may already have tables before alembic_version —
        # fall through to create_all / column ensure.
        pass
    Base.metadata.create_all(bind=engine)
    _ensure_column("vehicles", "driver_name", "driver_name VARCHAR(120) DEFAULT ''")
    _ensure_column("vehicles", "driver_phone", "driver_phone VARCHAR(32) DEFAULT ''")
