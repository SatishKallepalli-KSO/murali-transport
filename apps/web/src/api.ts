const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let detail = await res.text()
    try {
      const parsed = JSON.parse(detail) as { detail?: string }
      if (parsed.detail) detail = parsed.detail
    } catch {
      /* keep text */
    }
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
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
export const fetchVehicles = (status?: string) =>
  api<Vehicle[]>(status ? `/v1/vehicles?status=${status}` : '/v1/vehicles')
export const fetchLoads = (status?: string) =>
  api<Load[]>(status ? `/v1/loads?status=${status}` : '/v1/loads')

export const registerVehicle = (body: Record<string, unknown>) =>
  api<Vehicle>('/v1/vehicles', { method: 'POST', body: JSON.stringify(body) })

export const createLoad = (body: Record<string, unknown>) =>
  api<Load>('/v1/loads', { method: 'POST', body: JSON.stringify(body) })

export const adminLogin = (pin: string) =>
  api<{ access_token: string }>('/v1/admin/login', {
    method: 'POST',
    body: JSON.stringify({ pin }),
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

export const fetchAssignments = (token: string) =>
  api<Assignment[]>('/v1/assignments', {
    headers: { Authorization: `Bearer ${token}` },
  })

export const completeAssignment = (token: string, id: number) =>
  api<Assignment>(`/v1/assignments/${id}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
