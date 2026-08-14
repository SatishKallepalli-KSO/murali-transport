const apiBase = import.meta.env.VITE_API_BASE ?? ''

function formatApiDetail(detail: unknown, fallback: string): string {
  if (detail == null || detail === '') return fallback
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    const parts = detail.map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const row = item as { msg?: string; loc?: unknown[]; message?: string }
        const field = Array.isArray(row.loc)
          ? row.loc.filter((p) => p !== 'body' && p !== 'query').join('.')
          : ''
        const msg = row.msg || row.message || JSON.stringify(item)
        return field ? `${field}: ${msg}` : msg
      }
      return String(item)
    })
    return parts.filter(Boolean).join(' · ') || fallback
  }
  if (typeof detail === 'object') {
    const row = detail as { message?: string; msg?: string }
    if (row.message || row.msg) return String(row.message || row.msg)
    try {
      return JSON.stringify(detail)
    } catch {
      return fallback
    }
  }
  return String(detail)
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const fallback = `Request failed (${res.status})`
    const raw = await res.text()
    let message = raw || fallback
    try {
      const parsed = JSON.parse(raw) as { detail?: unknown }
      message = formatApiDetail(parsed.detail, fallback)
    } catch {
      /* keep text body */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

function authHeaders(token?: string): HeadersInit | undefined {
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

export type Stats = {
  vehicles: number
  available_vehicles: number
  open_loads: number
  assigned_loads: number
  assignments: number
}

export type ActivityItem = {
  kind: 'load' | 'vehicle'
  id: number
  title: string
  detail: string
  at: string
}

export type Vehicle = {
  id: number
  owner_name: string
  owner_phone: string
  driver_name: string
  driver_phone: string
  plate_number: string
  vehicle_type: string
  capacity_tons: number
  current_location: string
  status: string
  notes: string
  created_at: string
  updated_at: string
}

export type Load = {
  id: number
  requestor_name: string
  requestor_phone: string
  pickup: string
  dropoff: string
  cargo: string
  weight_tons: number
  vehicle_preference: string
  preferred_date: string
  notes: string
  status: string
  created_at: string
  updated_at: string
  assigned_vehicle_id: number | null
  assigned_plate: string | null
}

export type VehicleSuggestion = {
  vehicle: Vehicle
  match_score: number
  match_reason: string
}

export type Assignment = {
  id: number
  load_id: number
  vehicle_id: number
  match_score: number
  match_reason: string
  status: string
  notes: string
  created_at: string
  load: Load | null
  vehicle: Vehicle | null
}

export const fetchStats = () => api<Stats>('/v1/stats')
export const fetchActivity = () => api<ActivityItem[]>('/v1/activity?limit=16')

export const fetchVehicles = (status?: string, limit = 500, token?: string) => {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  params.set('limit', String(limit))
  return api<Vehicle[]>(`/v1/vehicles?${params}`, {
    headers: authHeaders(token),
  })
}

export const fetchLoads = (status?: string, limit = 500, token?: string) => {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  params.set('limit', String(limit))
  return api<Load[]>(`/v1/loads?${params}`, {
    headers: authHeaders(token),
  })
}

export const registerVehicle = (body: Record<string, unknown>) =>
  api<Vehicle>('/v1/vehicles', { method: 'POST', body: JSON.stringify(body) })

export const createLoad = (body: Record<string, unknown>) =>
  api<Load>('/v1/loads', { method: 'POST', body: JSON.stringify(body) })

export const adminLogin = (pin: string) =>
  api<{ access_token: string }>('/v1/admin/login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  })

export const adminLogout = (token: string) =>
  api<Record<string, string>>('/v1/admin/logout', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

export const fetchSuggestions = (loadId: number, token: string) =>
  api<VehicleSuggestion[]>(`/v1/loads/${loadId}/suggestions`, {
    headers: { Authorization: `Bearer ${token}` },
  })

export const assignLoad = (
  token: string,
  body: { load_id: number; vehicle_id: number; notes?: string },
) =>
  api<Assignment>('/v1/assignments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

export const fetchAssignments = (token: string, limit = 500) =>
  api<Assignment[]>(`/v1/assignments?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

export const completeAssignment = (token: string, id: number) =>
  api<Assignment>(`/v1/assignments/${id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })

export const updateLoad = (token: string, id: number, body: Record<string, unknown>) =>
  api<Load>(`/v1/loads/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

export const deleteLoad = (token: string, id: number) =>
  api<{ status: string }>(`/v1/loads/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

export const updateVehicle = (token: string, id: number, body: Record<string, unknown>) =>
  api<Vehicle>(`/v1/vehicles/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })

export const deleteVehicle = (token: string, id: number) =>
  api<{ status: string }>(`/v1/vehicles/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

export type VisitDay = {
  day: string
  hits: number
  uniques: number
}

export type VisitGeo = {
  country: string
  city: string | null
  hits: number
}

export type VisitAnalytics = {
  timezone: string
  days: number
  today: VisitDay
  totals: { hits: number; uniques: number }
  daily: VisitDay[]
  geo: VisitGeo[]
  privacy: string
}

export function trackPageView(path: string) {
  const payload = JSON.stringify({ path })
  try {
    void fetch(`${apiBase}/v1/analytics/hit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {
      /* ignore analytics failures */
    })
  } catch {
    /* ignore */
  }
}

export const fetchVisitAnalytics = (token: string, days = 14) =>
  api<VisitAnalytics>(`/v1/admin/analytics?days=${days}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
