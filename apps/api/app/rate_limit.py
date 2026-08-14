"""In-memory IP rate limiting for login and public writes."""

from __future__ import annotations

import os
from collections import defaultdict
from math import ceil
from time import time

from fastapi import HTTPException, Request

_buckets: dict[str, list[float]] = defaultdict(list)

LOGIN_MAX_ATTEMPTS = int(os.getenv("ADMIN_LOGIN_MAX_ATTEMPTS", "5"))
LOGIN_WINDOW_SEC = int(os.getenv("ADMIN_LOGIN_WINDOW_SEC", str(15 * 60)))

# Layered public write limits (loads, vehicles, bookings) per IP per action.
PUBLIC_WRITE_BURST_MAX = int(os.getenv("PUBLIC_WRITE_BURST_MAX", "1"))
PUBLIC_WRITE_BURST_WINDOW_SEC = int(os.getenv("PUBLIC_WRITE_BURST_WINDOW_SEC", "60"))
PUBLIC_WRITE_SHORT_MAX = int(os.getenv("PUBLIC_WRITE_SHORT_MAX", "3"))
PUBLIC_WRITE_SHORT_WINDOW_SEC = int(os.getenv("PUBLIC_WRITE_SHORT_WINDOW_SEC", str(5 * 60)))
PUBLIC_WRITE_MAX = int(os.getenv("PUBLIC_WRITE_MAX_ATTEMPTS", "8"))
PUBLIC_WRITE_WINDOW_SEC = int(os.getenv("PUBLIC_WRITE_WINDOW_SEC", str(60 * 60)))

ANALYTICS_HIT_MAX = int(os.getenv("ANALYTICS_HIT_MAX", "60"))
ANALYTICS_HIT_WINDOW_SEC = int(os.getenv("ANALYTICS_HIT_WINDOW_SEC", "60"))


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or "unknown"
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _prune(key: str, window: int, now: float) -> list[float]:
    recent = [t for t in _buckets.get(key, []) if now - t < window]
    if recent:
        _buckets[key] = recent
    else:
        _buckets.pop(key, None)
    return recent


def _retry_after(recent: list[float], window_sec: int, now: float) -> int:
    if not recent:
        return window_sec
    oldest = min(recent)
    return max(1, ceil(window_sec - (now - oldest)))


def _deny(detail: str, recent: list[float], window_sec: int, now: float) -> None:
    raise HTTPException(
        status_code=429,
        detail=detail,
        headers={"Retry-After": str(_retry_after(recent, window_sec, now))},
    )


def enforce(key: str, *, max_attempts: int, window_sec: int, detail: str) -> None:
    now = time()
    recent = _prune(key, window_sec, now)
    if len(recent) >= max_attempts:
        _deny(detail, recent, window_sec, now)


def record(key: str) -> None:
    _buckets[key].append(time())


def clear(key: str) -> None:
    _buckets.pop(key, None)


def reset_all() -> None:
    """Test helper — clear all rate-limit buckets."""
    _buckets.clear()


def enforce_login(ip: str) -> None:
    enforce(
        f"login:{ip}",
        max_attempts=LOGIN_MAX_ATTEMPTS,
        window_sec=LOGIN_WINDOW_SEC,
        detail="Too many failed login attempts. Try again in 15 minutes.",
    )


def record_login_failure(ip: str) -> None:
    record(f"login:{ip}")


def clear_login_failures(ip: str) -> None:
    clear(f"login:{ip}")


def login_failures_remaining(ip: str) -> int:
    recent = _prune(f"login:{ip}", LOGIN_WINDOW_SEC, time())
    return max(0, LOGIN_MAX_ATTEMPTS - len(recent))


def enforce_public_write(request: Request, action: str) -> None:
    """Apply burst (1/min), short (3/5min), and hourly caps for public POSTs."""
    ip = client_ip(request)
    key = f"write:{action}:{ip}"
    now = time()

    # Keep timestamps for the longest window; count each tier from that set.
    retained = _prune(key, PUBLIC_WRITE_WINDOW_SEC, now)
    burst = [t for t in retained if now - t < PUBLIC_WRITE_BURST_WINDOW_SEC]
    short = [t for t in retained if now - t < PUBLIC_WRITE_SHORT_WINDOW_SEC]

    if len(burst) >= PUBLIC_WRITE_BURST_MAX:
        _deny(
            "Please wait about a minute before submitting again.",
            burst,
            PUBLIC_WRITE_BURST_WINDOW_SEC,
            now,
        )
    if len(short) >= PUBLIC_WRITE_SHORT_MAX:
        _deny(
            "Too many submissions. You can post again in a few minutes.",
            short,
            PUBLIC_WRITE_SHORT_WINDOW_SEC,
            now,
        )
    if len(retained) >= PUBLIC_WRITE_MAX:
        _deny(
            "Too many submissions from this network. Please try again later.",
            retained,
            PUBLIC_WRITE_WINDOW_SEC,
            now,
        )

    record(key)


def enforce_analytics_hit(request: Request) -> None:
    ip = client_ip(request)
    enforce(
        f"analytics:{ip}",
        max_attempts=ANALYTICS_HIT_MAX,
        window_sec=ANALYTICS_HIT_WINDOW_SEC,
        detail="Too many analytics pings. Slow down.",
    )
    record(f"analytics:{ip}")
