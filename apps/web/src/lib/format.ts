export const ADMIN_PAGE_SIZE = 8

export function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function statusBadge(status: string, labels: { open: string; available: string; assigned: string }) {
  const key = status.toLowerCase()
  if (key === 'open') return labels.open
  if (key === 'available') return labels.available
  if (key === 'assigned') return labels.assigned
  return status
}

export function matchesQuery(parts: Array<string | number | null | undefined>, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return parts.some((part) => String(part ?? '').toLowerCase().includes(q))
}

export function paginateItems<T>(items: T[], page: number, pageSize = ADMIN_PAGE_SIZE) {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1)
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    total,
    totalPages,
    page: safePage,
    items: items.slice(start, start + pageSize),
  }
}
