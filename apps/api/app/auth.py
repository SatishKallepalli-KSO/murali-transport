"""Admin PIN and Bearer session helpers."""

from __future__ import annotations

import os
import secrets

from fastapi import Header, HTTPException

# Known weak / previously documented defaults — rejected in production.
WEAK_PINS = frozenset(
    {
        "dommeru123",
        "admin",
        "admin123",
        "1234",
        "123456",
        "password",
        "changeme",
        "local-dev-pin",
    }
)

_admin_tokens: set[str] = set()


def is_production() -> bool:
    return bool(
        os.getenv("RENDER")
        or os.getenv("RENDER_SERVICE_ID")
        or os.getenv("ENVIRONMENT", "").lower() == "production"
    )


def resolve_admin_pin() -> str:
    """Require a real ADMIN_PIN. Weak defaults are blocked in production."""
    pin = (os.getenv("ADMIN_PIN") or "").strip()
    allow_insecure = os.getenv("ALLOW_INSECURE_DEFAULT_PIN", "").strip() == "1"

    if not pin:
        if allow_insecure and not is_production():
            return "local-dev-only-not-for-prod"
        raise RuntimeError(
            "ADMIN_PIN must be set. For local only, set ALLOW_INSECURE_DEFAULT_PIN=1."
        )

    if pin.lower() in WEAK_PINS or len(pin) < 8:
        if is_production() or not allow_insecure:
            raise RuntimeError(
                "ADMIN_PIN is missing, too short (<8), or a known weak default. "
                "Set a strong unique PIN (8+ characters)."
            )
    return pin


_cached_pin: str | None = None


def get_admin_pin() -> str:
    global _cached_pin
    if _cached_pin is None:
        _cached_pin = resolve_admin_pin()
    return _cached_pin


def issue_token() -> str:
    token = secrets.token_urlsafe(32)
    _admin_tokens.add(token)
    return token


def revoke_token(token: str) -> None:
    _admin_tokens.discard(token)


def token_valid(token: str) -> bool:
    return token in _admin_tokens


def require_admin(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Admin login required")
    token = authorization.split(" ", 1)[1].strip()
    if not token_valid(token):
        raise HTTPException(status_code=401, detail="Invalid or expired admin session")
    return token


def optional_admin(authorization: str | None = Header(default=None)) -> str | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    if not token_valid(token):
        return None
    return token
