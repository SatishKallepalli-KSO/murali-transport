"""Privacy-safe visit analytics — aggregates only, no stored IPs."""

from __future__ import annotations

import hashlib
import hmac
import os
import re
from datetime import date, datetime, timedelta, timezone

from fastapi import Request
from sqlalchemy.orm import Session

from app.models import VisitDaily, VisitGeoDaily, VisitUnique
from app.rate_limit import client_ip

ALLOWED_PATHS = frozenset(
    {
        "home",
        "request",
        "owner",
        "about",
        "confirm",
        "privacy",
        "other",
    }
)

_PATH_RE = re.compile(r"^[a-z][a-z0-9_-]{0,31}$")


def _hash_secret() -> str:
    return (
        os.getenv("ANALYTICS_HASH_SECRET")
        or os.getenv("ADMIN_PIN")
        or "murali-dev-analytics"
    )


def ist_today() -> date:
    # Asia/Kolkata = UTC+5:30
    return (datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)).date()


def normalize_path(raw: str | None) -> str:
    value = (raw or "home").strip().lower().lstrip("#/")
    value = value.split("?")[0].split("/")[0] or "home"
    if value == "admin":
        return ""  # do not track admin desk refreshes
    if value not in ALLOWED_PATHS:
        if _PATH_RE.match(value):
            return "other"
        return "home"
    return value


def visitor_hash(request: Request, day: date) -> str:
    """One-way daily fingerprint. IP is never stored."""
    ip = client_ip(request)
    ua = (request.headers.get("user-agent") or "")[:160]
    material = f"{day.isoformat()}|{ip}|{ua}"
    digest = hmac.new(
        _hash_secret().encode("utf-8"),
        material.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return digest[:32]


def geo_from_request(request: Request) -> tuple[str, str]:
    """Prefer CDN headers; never call third-party geo APIs."""
    headers = request.headers
    country = (
        headers.get("cf-ipcountry")
        or headers.get("CF-IPCountry")
        or headers.get("x-vercel-ip-country")
        or headers.get("cloudfront-viewer-country")
        or ""
    ).strip().upper()
    if not country or country in {"XX", "T1"}:
        country = "ZZ"

    city = (
        headers.get("cf-ipcity")
        or headers.get("CF-IPCity")
        or headers.get("x-vercel-ip-city")
        or ""
    ).strip()
    if city:
        try:
            city = city.encode("latin-1").decode("utf-8")
        except (UnicodeDecodeError, UnicodeEncodeError):
            pass
        city = city[:80]
    else:
        city = ""

    return country, city


def _prune(db: Session, today: date) -> None:
    unique_cut = today - timedelta(days=2)
    daily_cut = today - timedelta(days=90)
    db.query(VisitUnique).filter(VisitUnique.day < unique_cut).delete(synchronize_session=False)
    db.query(VisitDaily).filter(VisitDaily.day < daily_cut).delete(synchronize_session=False)
    db.query(VisitGeoDaily).filter(VisitGeoDaily.day < daily_cut).delete(synchronize_session=False)


def record_hit(db: Session, request: Request, path: str | None) -> dict[str, str]:
    page = normalize_path(path)
    if not page:
        return {"status": "skipped"}

    today = ist_today()
    vhash = visitor_hash(request, today)
    country, city = geo_from_request(request)

    existing = (
        db.query(VisitUnique)
        .filter(VisitUnique.day == today, VisitUnique.visitor_hash == vhash)
        .first()
    )
    is_new = existing is None
    if is_new:
        db.add(VisitUnique(day=today, visitor_hash=vhash))

    daily = db.query(VisitDaily).filter(VisitDaily.day == today).first()
    if daily:
        daily.hits += 1
        if is_new:
            daily.uniques += 1
    else:
        db.add(VisitDaily(day=today, hits=1, uniques=1 if is_new else 0))

    geo = (
        db.query(VisitGeoDaily)
        .filter(
            VisitGeoDaily.day == today,
            VisitGeoDaily.country == country,
            VisitGeoDaily.city == city,
        )
        .first()
    )
    if geo:
        geo.hits += 1
    else:
        db.add(VisitGeoDaily(day=today, country=country, city=city, hits=1))

    # Occasional prune keeps tables small without a cron job.
    if today.toordinal() % 3 == 0 and is_new:
        _prune(db, today)

    db.commit()
    return {"status": "ok"}


def analytics_summary(db: Session, days: int = 14) -> dict:
    days = max(1, min(days, 90))
    today = ist_today()
    start = today - timedelta(days=days - 1)

    daily_rows = (
        db.query(VisitDaily)
        .filter(VisitDaily.day >= start)
        .order_by(VisitDaily.day.asc())
        .all()
    )
    geo_rows = (
        db.query(VisitGeoDaily)
        .filter(VisitGeoDaily.day >= start)
        .order_by(VisitGeoDaily.hits.desc())
        .all()
    )

    by_day = {r.day: r for r in daily_rows}
    daily = []
    for offset in range(days):
        d = start + timedelta(days=offset)
        row = by_day.get(d)
        daily.append(
            {
                "day": d.isoformat(),
                "hits": row.hits if row else 0,
                "uniques": row.uniques if row else 0,
            }
        )

    # Aggregate geo across the window
    geo_map: dict[tuple[str, str], int] = {}
    for row in geo_rows:
        key = (row.country, row.city)
        geo_map[key] = geo_map.get(key, 0) + row.hits

    geo = [
        {"country": country, "city": city or None, "hits": hits}
        for (country, city), hits in sorted(geo_map.items(), key=lambda x: -x[1])
    ][:40]

    today_row = by_day.get(today)
    return {
        "timezone": "Asia/Kolkata",
        "days": days,
        "today": {
            "day": today.isoformat(),
            "hits": today_row.hits if today_row else 0,
            "uniques": today_row.uniques if today_row else 0,
        },
        "totals": {
            "hits": sum(item["hits"] for item in daily),
            "uniques": sum(item["uniques"] for item in daily),
        },
        "daily": daily,
        "geo": geo,
        "privacy": "No IP addresses are stored. Location uses CDN country/city headers only.",
    }
