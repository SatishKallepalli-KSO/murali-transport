#!/usr/bin/env bash
# Backup Murali Transport Postgres (Neon Free by default).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/backups"
MODE="${1:---neon}"
NEON_PROJECT_ID="${NEON_PROJECT_ID:-polished-river-47162645}"
NEON_ORG_ID="${NEON_ORG_ID:-org-falling-bird-44330402}"
NEON_DB="${NEON_DB:-murali}"
NEON_ROLE="${NEON_ROLE:-murali}"

mkdir -p "${OUT_DIR}"
export PATH="/opt/homebrew/opt/libpq/bin:/usr/local/opt/libpq/bin:${PATH}"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install with: brew install libpq" >&2
  exit 1
fi

resolve_url() {
  case "$MODE" in
    --neon|"")
      command -v neonctl >/dev/null 2>&1 || {
        echo "neonctl not found. Install with: brew install neonctl" >&2
        exit 1
      }
      neonctl connection-string \
        --project-id "${NEON_PROJECT_ID}" \
        --org-id "${NEON_ORG_ID}" \
        --database-name "${NEON_DB}" \
        --role-name "${NEON_ROLE}" \
        --pooled \
        2>/dev/null | tail -1
      ;;
    --url)
      if [[ -z "${DATABASE_URL:-}" ]]; then
        echo "DATABASE_URL is required with --url" >&2
        exit 1
      fi
      printf '%s\n' "$DATABASE_URL"
      ;;
    *)
      echo "Usage: $0 [--neon|--url]" >&2
      exit 1
      ;;
  esac
}

URL="$(resolve_url)"
if [[ -z "$URL" || "$URL" != postgresql* && "$URL" != postgres* ]]; then
  echo "Could not resolve database URL for mode ${MODE}" >&2
  exit 1
fi

if [[ "$URL" == postgres://* ]]; then
  URL="postgresql://${URL#postgres://}"
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="${OUT_DIR}/murali-transport-${STAMP}.sql.gz"

pg_dump --no-owner --no-acl --clean --if-exists "$URL" | gzip -c >"$OUT"
cp "$OUT" "${OUT_DIR}/latest.sql.gz"
BYTES="$(wc -c <"$OUT" | tr -d ' ')"
echo "Wrote ${OUT} (${BYTES} bytes gzipped) via ${MODE}"
