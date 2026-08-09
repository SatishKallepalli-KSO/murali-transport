"""Location matching helpers for admin load ↔ vehicle assignment."""

from __future__ import annotations

import re


def normalize_place(value: str) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def place_tokens(value: str) -> set[str]:
    return {t for t in normalize_place(value).split(" ") if len(t) > 2}


def location_match_score(vehicle_location: str, pickup: str) -> tuple[float, str]:
    """Score how well a vehicle's current location fits a load pickup."""
    v = normalize_place(vehicle_location)
    p = normalize_place(pickup)
    if not v or not p:
        return 0.0, "Missing location"

    if v == p:
        return 1.0, f"Exact match · {pickup}"

    if v in p or p in v:
        return 0.85, f"Nearby · vehicle in {vehicle_location}"

    v_tokens = place_tokens(vehicle_location)
    p_tokens = place_tokens(pickup)
    overlap = v_tokens & p_tokens
    if overlap:
        score = min(0.75, 0.35 + 0.2 * len(overlap))
        return score, f"Partial · shared: {', '.join(sorted(overlap))}"

    # Same district / corridor heuristics for Dommeru belt
    corridors = [
        {"dommeru", "kovvur", "nidadavole", "tanuku"},
        {"rajahmundry", "rajamahendravaram", "kakinada", "east"},
        {"eluru", "bhimavaram", "west"},
        {"vijayawada", "guntur"},
        {"visakhapatnam", "vizag"},
    ]
    for group in corridors:
        if (v_tokens & group) and (p_tokens & group):
            return 0.55, "Same regional corridor"

    return 0.15, "Different area · still assignable"
