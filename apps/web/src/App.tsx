import { useEffect, useState, type FormEvent } from 'react'
import {
  adminLogin,
  assignLoad,
  completeAssignment,
  createLoad,
  fetchAssignments,
  fetchLoads,
  fetchStats,
  fetchSuggestions,
  fetchVehicles,
  registerVehicle,
  type Assignment,
  type Load,
  type Stats,
  type Vehicle,
  type VehicleSuggestion,
} from './api'
import { address, business } from './content'
import { LorrySky } from './LorrySky'

type Portal = 'home' | 'request' | 'owner' | 'admin'

const emptyLoad = {
  requestor_name: '',
  requestor_phone: '',
  pickup: '',
  dropoff: '',
  cargo: '',
  weight_tons: '1',
  vehicle_preference: 'any',
  preferred_date: '',
  notes: '',
}

const emptyVehicle = {
  owner_name: '',
  owner_phone: '',
  plate_number: '',
  vehicle_type: 'mini_lorry',
  capacity_tons: '2',
  current_location: 'Dommeru',
  notes: '',
}

export default function App() {
  const [portal, setPortal] = useState<Portal>('home')
  const [stats, setStats] = useState<Stats | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [loadForm, setLoadForm] = useState(emptyLoad)
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle)

  const [adminPin, setAdminPin] = useState('')
  const [adminToken, setAdminToken] = useState(
    () => localStorage.getItem('murali_admin_token') ?? '',
  )
  const [openLoads, setOpenLoads] = useState<Load[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedLoadId, setSelectedLoadId] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<VehicleSuggestion[]>([])
  const [busy, setBusy] = useState(false)

  async function refreshPublic() {
    try {
      setStats(await fetchStats())
    } catch {
      /* ignore */
    }
  }

  async function refreshAdmin(token: string) {
    const [loads, fleet, assigns] = await Promise.all([
      fetchLoads(),
      fetchVehicles(),
      fetchAssignments(token),
    ])
    setOpenLoads(loads)
    setVehicles(fleet)
    setAssignments(assigns)
  }

  useEffect(() => {
    void refreshPublic()
    const id = window.setInterval(() => void refreshPublic(), 15000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (!adminToken || portal !== 'admin') return
    void refreshAdmin(adminToken).catch((err) => {
      setError(err instanceof Error ? err.message : 'Admin session expired')
      setAdminToken('')
      localStorage.removeItem('murali_admin_token')
    })
  }, [adminToken, portal])

  useEffect(() => {
    if (!adminToken || selectedLoadId == null) {
      setSuggestions([])
      return
    }
    void fetchSuggestions(selectedLoadId, adminToken)
      .then(setSuggestions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Suggestions failed'))
  }, [adminToken, selectedLoadId])

  function clearFlash() {
    setMessage(null)
    setError(null)
  }

  async function onCreateLoad(event: FormEvent) {
    event.preventDefault()
    clearFlash()
    setBusy(true)
    try {
      const created = await createLoad({
        ...loadForm,
        weight_tons: Number(loadForm.weight_tons) || 1,
      })
      setMessage(`Load #${created.id} posted. Office will assign a lorry near ${created.pickup}.`)
      setLoadForm(emptyLoad)
      void refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post load')
    } finally {
      setBusy(false)
    }
  }

  async function onRegisterVehicle(event: FormEvent) {
    event.preventDefault()
    clearFlash()
    setBusy(true)
    try {
      const created = await registerVehicle({
        ...vehicleForm,
        capacity_tons: Number(vehicleForm.capacity_tons) || 1,
      })
      setMessage(
        `Vehicle ${created.plate_number} registered at ${created.current_location}. Ready for loads.`,
      )
      setVehicleForm(emptyVehicle)
      void refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register vehicle')
    } finally {
      setBusy(false)
    }
  }

  async function onAdminLogin(event: FormEvent) {
    event.preventDefault()
    clearFlash()
    setBusy(true)
    try {
      const { access_token } = await adminLogin(adminPin)
      setAdminToken(access_token)
      localStorage.setItem('murali_admin_token', access_token)
      setAdminPin('')
      setMessage('Admin desk unlocked.')
      await refreshAdmin(access_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function onAssign(vehicleId: number) {
    if (!adminToken || selectedLoadId == null) return
    clearFlash()
    setBusy(true)
    try {
      const row = await assignLoad(adminToken, {
        load_id: selectedLoadId,
        vehicle_id: vehicleId,
      })
      setMessage(
        `Assigned ${row.vehicle?.plate_number} to load #${row.load_id} (${Math.round(row.match_score * 100)}% location match).`,
      )
      setSelectedLoadId(null)
      await refreshAdmin(adminToken)
      void refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assign failed')
    } finally {
      setBusy(false)
    }
  }

  async function onComplete(id: number) {
    if (!adminToken) return
    clearFlash()
    setBusy(true)
    try {
      await completeAssignment(adminToken, id)
      setMessage(`Assignment #${id} completed. Vehicle is available again.`)
      await refreshAdmin(adminToken)
      void refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Complete failed')
    } finally {
      setBusy(false)
    }
  }

  function logoutAdmin() {
    setAdminToken('')
    localStorage.removeItem('murali_admin_token')
    setSelectedLoadId(null)
    setSuggestions([])
  }

  return (
    <div className="site">
      <LorrySky />

      <div className="topbar">
        <span>
          {stats
            ? `${stats.available_vehicles} lorries free · ${stats.open_loads} open loads · ${stats.assignments} assigned`
            : 'Live lorry booking desk · Dommeru'}
        </span>
        <span>{business.hours}</span>
      </div>

      <header className="nav">
        <a
          className="nav-brand"
          href="#top"
          onClick={(e) => {
            e.preventDefault()
            setPortal('home')
          }}
        >
          <span className="nav-mark" aria-hidden="true" />
          <span>
            <strong>Murali Office</strong>
            <small>Miny Lorry Transport</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <button type="button" className={portal === 'home' ? 'active' : ''} onClick={() => setPortal('home')}>
            Home
          </button>
          <button type="button" className={portal === 'request' ? 'active' : ''} onClick={() => setPortal('request')}>
            Post load
          </button>
          <button type="button" className={portal === 'owner' ? 'active' : ''} onClick={() => setPortal('owner')}>
            Register lorry
          </button>
          <button type="button" className={portal === 'admin' ? 'active' : ''} onClick={() => setPortal('admin')}>
            Admin desk
          </button>
        </nav>
        <button type="button" className="nav-cta" onClick={() => setPortal('request')}>
          Book freight
        </button>
      </header>

      <main id="top">
        {(message || error) && (
          <div className={`flash ${error ? 'flash-error' : 'flash-ok'}`} role="status">
            {error ?? message}
            <button type="button" onClick={clearFlash} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {portal === 'home' && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="hero-kicker">End-to-end lorry booking · Dommeru</p>
                <h1 className="hero-name">{business.name}</h1>
                <p className="hero-tagline">
                  Owners register lorries. Traders post loads. Office assigns by location.
                </p>
                <p className="hero-summary">{business.summary}</p>
                <div className="hero-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setPortal('request')}>
                    Post a load
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setPortal('owner')}>
                    Register your lorry
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setPortal('admin')}>
                    Open admin desk
                  </button>
                </div>
              </div>
              <div className="hero-visual" aria-hidden="true">
                <div className="road-band" />
                <div className="truck">
                  <div className="truck-cab" />
                  <div className="truck-bed" />
                  <div className="truck-wheel truck-wheel-f" />
                  <div className="truck-wheel truck-wheel-r" />
                </div>
                <p className="hero-visual-caption">Live dispatch in motion</p>
              </div>
            </section>

            <section className="trust" aria-label="Live platform stats">
              <div className="trust-item">
                <p className="trust-label">Fleet on books</p>
                <p className="trust-value">{stats?.vehicles ?? '—'}</p>
                <p className="trust-detail">{stats?.available_vehicles ?? 0} available now</p>
              </div>
              <div className="trust-item">
                <p className="trust-label">Open loads</p>
                <p className="trust-value">{stats?.open_loads ?? '—'}</p>
                <p className="trust-detail">Waiting for office assignment</p>
              </div>
              <div className="trust-item">
                <p className="trust-label">Assigned trips</p>
                <p className="trust-value">{stats?.assignments ?? '—'}</p>
                <p className="trust-detail">Matched by location & capacity</p>
              </div>
            </section>

            <section className="section">
              <div className="section-head">
                <h2>How the platform works</h2>
                <p>Three roles, one Dommeru transport desk.</p>
              </div>
              <ol className="steps">
                <li className="step">
                  <span className="step-num">01</span>
                  <div>
                    <h3>Lorry owners register</h3>
                    <p>Add plate, type, capacity, and current location so the office can find you.</p>
                  </div>
                </li>
                <li className="step">
                  <span className="step-num">02</span>
                  <div>
                    <h3>Requestors post loads</h3>
                    <p>Share pickup, drop, cargo, and weight. The desk receives every request.</p>
                  </div>
                </li>
                <li className="step">
                  <span className="step-num">03</span>
                  <div>
                    <h3>Admin assigns by location</h3>
                    <p>Suggested lorries are ranked near the pickup — assign in one click.</p>
                  </div>
                </li>
              </ol>
            </section>

            <section className="section section-alt">
              <div className="section-head">
                <h2>Office</h2>
                <p>{address.line}</p>
              </div>
              <div className="location-actions">
                <a className="btn btn-primary" href={business.mapsShareUrl} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
                <button type="button" className="btn btn-ghost" onClick={() => setPortal('admin')}>
                  Go to admin desk
                </button>
              </div>
            </section>
          </>
        )}

        {portal === 'request' && (
          <section className="portal">
            <div className="section-head">
              <h2>Post a load</h2>
              <p>Tell the Dommeru office what you need to move. Admin will assign a nearby lorry.</p>
            </div>
            <form className="panel-form" onSubmit={onCreateLoad}>
              <label>
                Your name
                <input required value={loadForm.requestor_name} onChange={(e) => setLoadForm({ ...loadForm, requestor_name: e.target.value })} />
              </label>
              <label>
                Phone
                <input required value={loadForm.requestor_phone} onChange={(e) => setLoadForm({ ...loadForm, requestor_phone: e.target.value })} />
              </label>
              <label>
                Pickup location
                <input required value={loadForm.pickup} onChange={(e) => setLoadForm({ ...loadForm, pickup: e.target.value })} placeholder="e.g. Dommeru" />
              </label>
              <label>
                Drop location
                <input required value={loadForm.dropoff} onChange={(e) => setLoadForm({ ...loadForm, dropoff: e.target.value })} placeholder="e.g. Rajahmundry" />
              </label>
              <label>
                Cargo
                <input required value={loadForm.cargo} onChange={(e) => setLoadForm({ ...loadForm, cargo: e.target.value })} />
              </label>
              <label>
                Weight (tons)
                <input required type="number" min="0.1" step="0.1" value={loadForm.weight_tons} onChange={(e) => setLoadForm({ ...loadForm, weight_tons: e.target.value })} />
              </label>
              <label>
                Vehicle preference
                <select value={loadForm.vehicle_preference} onChange={(e) => setLoadForm({ ...loadForm, vehicle_preference: e.target.value })}>
                  <option value="any">Any</option>
                  <option value="mini_lorry">Mini lorry</option>
                  <option value="truck">Truck</option>
                  <option value="part_load">Part load</option>
                </select>
              </label>
              <label>
                Preferred date
                <input value={loadForm.preferred_date} onChange={(e) => setLoadForm({ ...loadForm, preferred_date: e.target.value })} />
              </label>
              <label className="span-2">
                Notes
                <textarea rows={3} value={loadForm.notes} onChange={(e) => setLoadForm({ ...loadForm, notes: e.target.value })} />
              </label>
              <div className="form-actions span-2">
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? 'Posting…' : 'Submit load request'}
                </button>
              </div>
            </form>
          </section>
        )}

        {portal === 'owner' && (
          <section className="portal">
            <div className="section-head">
              <h2>Register your lorry</h2>
              <p>Owners list vehicles with the transport office. Keep location updated for better load matches.</p>
            </div>
            <form className="panel-form" onSubmit={onRegisterVehicle}>
              <label>
                Owner name
                <input required value={vehicleForm.owner_name} onChange={(e) => setVehicleForm({ ...vehicleForm, owner_name: e.target.value })} />
              </label>
              <label>
                Owner phone
                <input required value={vehicleForm.owner_phone} onChange={(e) => setVehicleForm({ ...vehicleForm, owner_phone: e.target.value })} />
              </label>
              <label>
                Plate number
                <input required value={vehicleForm.plate_number} onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })} placeholder="AP39XX1234" />
              </label>
              <label>
                Vehicle type
                <select value={vehicleForm.vehicle_type} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}>
                  <option value="mini_lorry">Mini lorry</option>
                  <option value="truck">Truck</option>
                  <option value="trailer">Trailer</option>
                </select>
              </label>
              <label>
                Capacity (tons)
                <input required type="number" min="0.5" step="0.5" value={vehicleForm.capacity_tons} onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_tons: e.target.value })} />
              </label>
              <label>
                Current location
                <input required value={vehicleForm.current_location} onChange={(e) => setVehicleForm({ ...vehicleForm, current_location: e.target.value })} />
              </label>
              <label className="span-2">
                Notes
                <textarea rows={3} value={vehicleForm.notes} onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })} />
              </label>
              <div className="form-actions span-2">
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? 'Saving…' : 'Register with office'}
                </button>
              </div>
            </form>
          </section>
        )}

        {portal === 'admin' && (
          <section className="portal admin-portal">
            <div className="section-head">
              <h2>Transport office admin</h2>
              <p>Receive load requests, review nearby lorries, and assign trips.</p>
            </div>

            {!adminToken ? (
              <form className="panel-form admin-login" onSubmit={onAdminLogin}>
                <label className="span-2">
                  Admin PIN
                  <input
                    required
                    type="password"
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Office PIN"
                    autoComplete="current-password"
                  />
                </label>
                <div className="form-actions span-2">
                  <button className="btn btn-primary" type="submit" disabled={busy}>
                    {busy ? 'Checking…' : 'Unlock desk'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="admin-toolbar">
                  <p>Desk session active</p>
                  <button type="button" className="btn btn-ghost" onClick={logoutAdmin}>
                    Lock desk
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => void refreshAdmin(adminToken)}
                  >
                    Refresh
                  </button>
                </div>

                <div className="admin-grid">
                  <div className="admin-col">
                    <h3>Open loads</h3>
                    <ul className="data-list">
                      {openLoads.filter((l) => l.status === 'open').map((load) => (
                        <li key={load.id}>
                          <button
                            type="button"
                            className={selectedLoadId === load.id ? 'data-card active' : 'data-card'}
                            onClick={() => setSelectedLoadId(load.id)}
                          >
                            <strong>
                              #{load.id} · {load.pickup} → {load.dropoff}
                            </strong>
                            <span>
                              {load.cargo} · {load.weight_tons}t · {load.requestor_name}
                            </span>
                            <span>{load.requestor_phone}</span>
                          </button>
                        </li>
                      ))}
                      {openLoads.filter((l) => l.status === 'open').length === 0 && (
                        <li className="empty">No open loads right now.</li>
                      )}
                    </ul>
                  </div>

                  <div className="admin-col">
                    <h3>
                      Suggested lorries
                      {selectedLoadId ? ` for #${selectedLoadId}` : ''}
                    </h3>
                    {!selectedLoadId ? (
                      <p className="empty">Select an open load to see location-ranked vehicles.</p>
                    ) : (
                      <ul className="data-list">
                        {suggestions.map((s) => (
                          <li key={s.vehicle.id} className="data-card suggest">
                            <strong>
                              {s.vehicle.plate_number} · {Math.round(s.match_score * 100)}% match
                            </strong>
                            <span>
                              {s.vehicle.current_location} · {s.vehicle.capacity_tons}t ·{' '}
                              {s.vehicle.vehicle_type}
                            </span>
                            <span>{s.match_reason}</span>
                            <span>
                              Owner: {s.vehicle.owner_name} · {s.vehicle.owner_phone}
                            </span>
                            <button
                              type="button"
                              className="btn btn-primary"
                              disabled={busy}
                              onClick={() => void onAssign(s.vehicle.id)}
                            >
                              Assign this lorry
                            </button>
                          </li>
                        ))}
                        {suggestions.length === 0 && (
                          <li className="empty">No available vehicles match capacity yet.</li>
                        )}
                      </ul>
                    )}
                  </div>

                  <div className="admin-col">
                    <h3>Fleet snapshot</h3>
                    <ul className="data-list compact">
                      {vehicles.map((v) => (
                        <li key={v.id} className="data-card">
                          <strong>
                            {v.plate_number} · {v.status}
                          </strong>
                          <span>
                            {v.current_location} · {v.capacity_tons}t
                          </span>
                        </li>
                      ))}
                      {vehicles.length === 0 && <li className="empty">No vehicles registered.</li>}
                    </ul>
                  </div>

                  <div className="admin-col">
                    <h3>Assignments</h3>
                    <ul className="data-list">
                      {assignments.map((a) => (
                        <li key={a.id} className="data-card">
                          <strong>
                            #{a.id} · {a.vehicle?.plate_number} → load #{a.load_id}
                          </strong>
                          <span>
                            {a.load?.pickup} → {a.load?.dropoff} · {a.status}
                          </span>
                          <span>{a.match_reason}</span>
                          {a.status === 'assigned' && (
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={busy}
                              onClick={() => void onComplete(a.id)}
                            >
                              Mark delivered
                            </button>
                          )}
                        </li>
                      ))}
                      {assignments.length === 0 && <li className="empty">No assignments yet.</li>}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <div>
          <strong>{business.name}</strong>
          <p>{address.line}</p>
        </div>
        <p className="footer-meta">Lorry owners · Load requestors · Office dispatch</p>
      </footer>
    </div>
  )
}
