"""In-memory IP rate limiting for login and public writes."""

from __future__ import annotations

import os
from collections import defaultdict
from time import time

from fastapi import HTTPException, Request

_buckets: dict[str, list[float]] = defaultdict(list)

LOGIN_MAX_ATTEMPTS = int(os.getenv("ADMIN_LOGIN_MAX_ATTEMPTS", "5"))
LOGIN_WINDOW_SEC = int(os.getenv("ADMIN_LOGIN_WINDOW_SEC", str(15 * 60)))
PUBLIC_WRITE_MAX = int(os.getenv("PUBLIC_WRITE_MAX_ATTEMPTS", "20"))
PUBLIC_WRITE_WINDOW_SEC = int(os.getenv("PUBLIC_WRITE_WINDOW_SEC", str(60 * 60)))


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


def enforce(key: str, *, max_attempts: int, window_sec: int, detail: str) -> None:
    now = time()
    recent = _prune(key, window_sec, now)
    if len(recent) >= max_attempts:
        raise HTTPException(status_code=429, detail=detail)


def record(key: str) -> None:
    _buckets[key].append(time())


def clear(key: str) -> None:
    _buckets.pop(key, None)


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
    ip = client_ip(request)
    enforce(
        f"write:{action}:{ip}",
        max_attempts=PUBLIC_WRITE_MAX,
        window_sec=PUBLIC_WRITE_WINDOW_SEC,
        detail="Too many submissions from this network. Please try again later.",
    )
    record(f"write:{action}:{ip}")
