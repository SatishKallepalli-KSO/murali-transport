import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  fetchVisitAnalytics,
  type Assignment,
  type Load,
  type Vehicle,
  type VehicleSuggestion,
  type VisitAnalytics,
} from '../api'
import type { DictKey } from '../content'
import { matchesQuery, paginateItems, statusBadge } from '../lib/format'

export type AdminTab = 'snapshot' | 'loads' | 'match' | 'fleet' | 'assign' | 'visits'

type Props = {
  tx: (key: DictKey) => string
  adminToken: string
  adminPin: string
  setAdminPin: (value: string) => void
  busy: boolean
  openLoads: Load[]
  vehicles: Vehicle[]
  assignments: Assignment[]
  suggestions: VehicleSuggestion[]
  selectedLoadId: number | null
  setSelectedLoadId: (id: number | null) => void
  adminTab: AdminTab
  setAdminTab: (tab: AdminTab) => void
  onAdminLogin: (event: FormEvent) => void
  onAssign: (vehicleId: number) => void
  onComplete: (id: number) => void
  onUpdateLoad: (id: number, body: Record<string, unknown>) => Promise<void>
  onDeleteLoad: (id: number) => Promise<void>
  onUpdateVehicle: (id: number, body: Record<string, unknown>) => Promise<void>
  onDeleteVehicle: (id: number) => Promise<void>
  logoutAdmin: () => void
  refreshAdmin: (token: string) => Promise<void>
}

export function AdminPortal({
  tx,
  adminToken,
  adminPin,
  setAdminPin,
  busy,
  openLoads,
  vehicles,
  assignments,
  suggestions,
  selectedLoadId,
  setSelectedLoadId,
  adminTab,
  setAdminTab,
  onAdminLogin,
  onAssign,
  onComplete,
  onUpdateLoad,
  onDeleteLoad,
  onUpdateVehicle,
  onDeleteVehicle,
  logoutAdmin,
  refreshAdmin,
}: Props) {
  const [loadSearch, setLoadSearch] = useState('')
  const [fleetSearch, setFleetSearch] = useState('')
  const [assignSearch, setAssignSearch] = useState('')
  const [matchSearch, setMatchSearch] = useState('')
  const [loadPage, setLoadPage] = useState(1)
  const [fleetPage, setFleetPage] = useState(1)
  const [assignPage, setAssignPage] = useState(1)
  const [matchPage, setMatchPage] = useState(1)
  const [editingLoadId, setEditingLoadId] = useState<number | null>(null)
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null)
  const [loadEdit, setLoadEdit] = useState<Record<string, string>>({})
  const [vehicleEdit, setVehicleEdit] = useState<Record<string, string>>({})
  const [visitStats, setVisitStats] = useState<VisitAnalytics | null>(null)
  const [visitError, setVisitError] = useState<string | null>(null)
  const [visitLoading, setVisitLoading] = useState(false)

  const deferredLoadSearch = useDeferredValue(loadSearch)
  const deferredFleetSearch = useDeferredValue(fleetSearch)
  const deferredAssignSearch = useDeferredValue(assignSearch)
  const deferredMatchSearch = useDeferredValue(matchSearch)

  useEffect(() => {
    if (!adminToken || adminTab !== 'visits') return
    let cancelled = false
    setVisitLoading(true)
    setVisitError(null)
    void fetchVisitAnalytics(adminToken, 14)
      .then((data) => {
        if (!cancelled) setVisitStats(data)
      })
      .catch((err) => {
        if (!cancelled) setVisitError(err instanceof Error ? err.message : 'Could not load visits')
      })
      .finally(() => {
        if (!cancelled) setVisitLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [adminToken, adminTab])

  const openLoadRows = useMemo(
    () => openLoads.filter((l) => l.status === 'open'),
    [openLoads],
  )
  const openLoadCount = openLoadRows.length
  const availableVehicleCount = vehicles.filter((v) => v.status === 'available').length
  const activeTripCount = assignments.filter((a) => a.status === 'assigned').length

  const filteredLoads = useMemo(
    () =>
      openLoads.filter((load) =>
        matchesQuery(
          [
            load.id,
            load.pickup,
            load.dropoff,
            load.cargo,
            load.requestor_name,
            load.requestor_phone,
            load.preferred_date,
            load.vehicle_preference,
            load.status,
          ],
          deferredLoadSearch,
        ),
      ),
    [openLoads, deferredLoadSearch],
  )
  const filteredVehicles = useMemo(
    () =>
      vehicles.filter((v) =>
        matchesQuery(
          [
            v.plate_number,
            v.owner_name,
            v.owner_phone,
            v.driver_name,
            v.driver_phone,
            v.current_location,
            v.vehicle_type,
            v.status,
          ],
          deferredFleetSearch,
        ),
      ),
    [vehicles, deferredFleetSearch],
  )
  const filteredAssignments = useMemo(
    () =>
      assignments.filter((a) =>
        matchesQuery(
          [
            a.id,
            a.load_id,
            a.status,
            a.match_reason,
            a.vehicle?.plate_number,
            a.load?.pickup,
            a.load?.dropoff,
            a.load?.requestor_name,
          ],
          deferredAssignSearch,
        ),
      ),
    [assignments, deferredAssignSearch],
  )
  const filteredSuggestions = useMemo(
    () =>
      suggestions.filter((s) =>
        matchesQuery(
          [
            s.vehicle.plate_number,
            s.vehicle.owner_name,
            s.vehicle.owner_phone,
            s.vehicle.driver_name,
            s.vehicle.driver_phone,
            s.vehicle.current_location,
            s.vehicle.vehicle_type,
            s.match_reason,
          ],
          deferredMatchSearch,
        ),
      ),
    [suggestions, deferredMatchSearch],
  )

  const pagedLoads = useMemo(() => paginateItems(filteredLoads, loadPage), [filteredLoads, loadPage])
  const pagedVehicles = useMemo(
    () => paginateItems(filteredVehicles, fleetPage),
    [filteredVehicles, fleetPage],
  )
  const pagedAssignments = useMemo(
    () => paginateItems(filteredAssignments, assignPage),
    [filteredAssignments, assignPage],
  )
  const pagedSuggestions = useMemo(
    () => paginateItems(filteredSuggestions, matchPage),
    [filteredSuggestions, matchPage],
  )

  useEffect(() => setLoadPage(1), [deferredLoadSearch])
  useEffect(() => setFleetPage(1), [deferredFleetSearch])
  useEffect(() => setAssignPage(1), [deferredAssignSearch])
  useEffect(() => setMatchPage(1), [deferredMatchSearch, selectedLoadId])

  function listMeta(total: number, page: number, totalPages: number) {
    return tx('listShowing')
      .replace('{total}', String(total))
      .replace('{page}', String(page))
      .replace('{pages}', String(totalPages))
  }

  function renderListControls(opts: {
    value: string
    onChange: (value: string) => void
    placeholder: string
    page: number
    totalPages: number
    total: number
    onPage: (page: number) => void
  }) {
    return (
      <div className="list-controls">
        <label className="list-search">
          <span className="sr-only">{tx('searchLabel')}</span>
          <input
            type="search"
            value={opts.value}
            placeholder={opts.placeholder}
            onChange={(e) => opts.onChange(e.target.value)}
          />
        </label>
        <div className="list-pager">
          <span>{listMeta(opts.total, opts.page, opts.totalPages)}</span>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={opts.page <= 1}
            onClick={() => opts.onPage(opts.page - 1)}
          >
            {tx('prevPage')}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={opts.page >= opts.totalPages}
            onClick={() => opts.onPage(opts.page + 1)}
          >
            {tx('nextPage')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="portal admin-portal">
      <div className="section-head">
        <h2>{tx('adminTitle')}</h2>
        <p>{tx('adminIntro')}</p>
        <p className="admin-staff-note">{tx('adminStaffNote')}</p>
      </div>

      {!adminToken ? (
        <form className="panel-form admin-login" onSubmit={onAdminLogin}>
          <label className="span-2">
            {tx('adminPin')}
            <input
              required
              type="password"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <div className="form-actions span-2">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? '…' : tx('unlockDesk')}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="admin-toolbar">
            <p>{tx('deskActive')}</p>
            <button type="button" className="btn btn-ghost" onClick={() => void refreshAdmin(adminToken)}>
              {tx('refresh')}
            </button>
            <button type="button" className="btn btn-ghost" onClick={logoutAdmin}>
              {tx('lockDesk')}
            </button>
          </div>

          <div className="admin-tabs" role="tablist" aria-label="Admin desk sections">
            {(
              [
                { id: 'snapshot' as const, label: tx('tabSnapshot'), count: null },
                { id: 'loads' as const, label: tx('tabLoads'), count: openLoadCount },
                { id: 'match' as const, label: tx('tabMatch'), count: selectedLoadId ? suggestions.length : null },
                { id: 'fleet' as const, label: tx('tabFleet'), count: vehicles.length },
                { id: 'assign' as const, label: tx('tabAssign'), count: assignments.length },
                { id: 'visits' as const, label: tx('tabVisits'), count: null },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={adminTab === tab.id}
                className={`admin-tab tab-${tab.id}${adminTab === tab.id ? ' active' : ''}`}
                onClick={() => setAdminTab(tab.id)}
              >
                <span>{tab.label}</span>
                {tab.count != null ? <em>{tab.count}</em> : null}
              </button>
            ))}
          </div>

          <div className={`admin-tab-panel theme-${adminTab}`} role="tabpanel">
            {adminTab === 'snapshot' && (
              <section className="admin-panel panel-snapshot">
                <header className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">{tx('tabSnapshot')}</p>
                    <h3>{tx('snapshotTitle')}</h3>
                    <p className="admin-panel-hint">{tx('snapHint')}</p>
                  </div>
                </header>
                <div className="admin-snapshot-grid">
                  <button type="button" className="snap-tile snap-loads" onClick={() => setAdminTab('loads')}>
                    <span className="snap-value">{openLoadCount}</span>
                    <span className="snap-label">{tx('snapOpen')}</span>
                  </button>
                  <button type="button" className="snap-tile snap-available" onClick={() => setAdminTab('fleet')}>
                    <span className="snap-value">{availableVehicleCount}</span>
                    <span className="snap-label">{tx('snapAvailable')}</span>
                  </button>
                  <button type="button" className="snap-tile snap-trips" onClick={() => setAdminTab('assign')}>
                    <span className="snap-value">{activeTripCount}</span>
                    <span className="snap-label">{tx('snapAssigned')}</span>
                  </button>
                  <button type="button" className="snap-tile snap-fleet" onClick={() => setAdminTab('fleet')}>
                    <span className="snap-value">{vehicles.length}</span>
                    <span className="snap-label">{tx('snapFleet')}</span>
                  </button>
                </div>
              </section>
            )}

            {adminTab === 'loads' && (
              <section className="admin-panel panel-loads">
                <header className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">{tx('allLoads')}</p>
                    <h3>{tx('allLoads')}</h3>
                    <p className="admin-panel-hint">{tx('panelLoadsHint')}</p>
                  </div>
                  <span className="admin-count">{openLoads.length}</span>
                </header>
                {renderListControls({
                  value: loadSearch,
                  onChange: setLoadSearch,
                  placeholder: tx('searchLoads'),
                  page: pagedLoads.page,
                  totalPages: pagedLoads.totalPages,
                  total: pagedLoads.total,
                  onPage: setLoadPage,
                })}
                <ul className="data-list">
                  {pagedLoads.items.map((load) => (
                    <li key={load.id} className="data-card static">
                      {editingLoadId === load.id ? (
                        <form
                          className="admin-edit-form"
                          onSubmit={(e) => {
                            e.preventDefault()
                            void onUpdateLoad(load.id, {
                              requestor_name: loadEdit.requestor_name,
                              requestor_phone: loadEdit.requestor_phone,
                              pickup: loadEdit.pickup,
                              dropoff: loadEdit.dropoff,
                              cargo: loadEdit.cargo,
                              weight_tons: Number(loadEdit.weight_tons) || 1,
                              vehicle_preference: loadEdit.vehicle_preference,
                              preferred_date: loadEdit.preferred_date,
                              notes: loadEdit.notes,
                              status: loadEdit.status,
                            }).then(() => setEditingLoadId(null))
                          }}
                        >
                          <div className="admin-edit-grid">
                            <label>
                              {tx('pickup')}
                              <input
                                value={loadEdit.pickup ?? ''}
                                onChange={(e) => setLoadEdit((p) => ({ ...p, pickup: e.target.value }))}
                                required
                              />
                            </label>
                            <label>
                              {tx('dropoff')}
                              <input
                                value={loadEdit.dropoff ?? ''}
                                onChange={(e) => setLoadEdit((p) => ({ ...p, dropoff: e.target.value }))}
                                required
                              />
                            </label>
                            <label>
                              {tx('cargo')}
                              <input
                                value={loadEdit.cargo ?? ''}
                                onChange={(e) => setLoadEdit((p) => ({ ...p, cargo: e.target.value }))}
                                required
                              />
                            </label>
                            <label>
                              {tx('weight')}
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={loadEdit.weight_tons ?? ''}
                                onChange={(e) =>
                                  setLoadEdit((p) => ({ ...p, weight_tons: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label>
                              {tx('requestor')}
                              <input
                                value={loadEdit.requestor_name ?? ''}
                                onChange={(e) =>
                                  setLoadEdit((p) => ({ ...p, requestor_name: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label>
                              {tx('phone')}
                              <input
                                value={loadEdit.requestor_phone ?? ''}
                                onChange={(e) =>
                                  setLoadEdit((p) => ({ ...p, requestor_phone: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label>
                              {tx('loadDate')}
                              <input
                                type="date"
                                value={loadEdit.preferred_date ?? ''}
                                onChange={(e) =>
                                  setLoadEdit((p) => ({ ...p, preferred_date: e.target.value }))
                                }
                              />
                            </label>
                            <label>
                              {tx('statusLabel')}
                              <select
                                value={loadEdit.status ?? 'open'}
                                onChange={(e) => setLoadEdit((p) => ({ ...p, status: e.target.value }))}
                              >
                                <option value="open">open</option>
                                <option value="assigned">assigned</option>
                                <option value="in_transit">in_transit</option>
                                <option value="delivered">delivered</option>
                                <option value="cancelled">cancelled</option>
                              </select>
                            </label>
                            <label className="span-2">
                              {tx('notes')}
                              <input
                                value={loadEdit.notes ?? ''}
                                onChange={(e) => setLoadEdit((p) => ({ ...p, notes: e.target.value }))}
                              />
                            </label>
                          </div>
                          <div className="admin-card-actions">
                            <button type="submit" className="btn btn-primary" disabled={busy}>
                              {tx('saveBtn')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setEditingLoadId(null)}
                            >
                              {tx('cancelEditBtn')}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="card-top">
                            <strong>
                              #{load.id} · {load.pickup} → {load.dropoff}
                            </strong>
                            <span
                              className={
                                load.status === 'open' ? 'badge badge-open' : 'badge badge-assigned'
                              }
                            >
                              {statusBadge(load.status, {
                                open: tx('openBadge'),
                                available: tx('availableBadge'),
                                assigned: tx('assignedBadge'),
                              })}
                            </span>
                          </div>
                          <span>
                            {load.cargo} · {load.weight_tons}t · {load.vehicle_preference}
                          </span>
                          <span>
                            {tx('requestor')}: {load.requestor_name} · {load.requestor_phone}
                          </span>
                          {load.preferred_date ? (
                            <span>
                              {tx('loadDate')}: {load.preferred_date}
                            </span>
                          ) : null}
                          <div className="admin-card-actions">
                            {load.status === 'open' ? (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => {
                                  setSelectedLoadId(load.id)
                                  setAdminTab('match')
                                }}
                              >
                                {tx('pickLoad')} → {tx('tabMatch')}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => {
                                setEditingLoadId(load.id)
                                setLoadEdit({
                                  requestor_name: load.requestor_name,
                                  requestor_phone: load.requestor_phone,
                                  pickup: load.pickup,
                                  dropoff: load.dropoff,
                                  cargo: load.cargo,
                                  weight_tons: String(load.weight_tons),
                                  vehicle_preference: load.vehicle_preference,
                                  preferred_date: load.preferred_date,
                                  notes: load.notes,
                                  status: load.status,
                                })
                              }}
                            >
                              {tx('editBtn')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm(tx('confirmDeleteLoad'))) {
                                  void onDeleteLoad(load.id)
                                }
                              }}
                            >
                              {tx('deleteBtn')}
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                  {pagedLoads.total === 0 && (
                    <li className="empty">{loadSearch.trim() ? tx('noSearchResults') : tx('noOpen')}</li>
                  )}
                </ul>
              </section>
            )}

            {adminTab === 'match' && (
              <section className="admin-panel panel-match">
                <header className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">
                      {selectedLoadId ? `#${selectedLoadId}` : '—'}
                    </p>
                    <h3>
                      {tx('suggested')}
                      {selectedLoadId ? ` · #${selectedLoadId}` : ''}
                    </h3>
                    <p className="admin-panel-hint">{tx('panelMatchHint')}</p>
                  </div>
                  <span className="admin-count">{suggestions.length}</span>
                </header>
                {!selectedLoadId ? (
                  <p className="empty select-hint">{tx('selectLoad')}</p>
                ) : (
                  <>
                    {renderListControls({
                      value: matchSearch,
                      onChange: setMatchSearch,
                      placeholder: tx('searchFleet'),
                      page: pagedSuggestions.page,
                      totalPages: pagedSuggestions.totalPages,
                      total: pagedSuggestions.total,
                      onPage: setMatchPage,
                    })}
                    <ul className="data-list">
                      {pagedSuggestions.items.map((s) => (
                        <li key={s.vehicle.id} className="data-card suggest">
                          <div className="card-top">
                            <strong>
                              {s.vehicle.plate_number} · {Math.round(s.match_score * 100)}%
                            </strong>
                            <span className="badge badge-available">{tx('availableBadge')}</span>
                          </div>
                          <span>
                            {s.vehicle.current_location} · {s.vehicle.capacity_tons}t ·{' '}
                            {s.vehicle.vehicle_type}
                          </span>
                          <span>{s.match_reason}</span>
                          <span>
                            {tx('ownerName')}: {s.vehicle.owner_name} · {s.vehicle.owner_phone}
                          </span>
                          <span>
                            {tx('driverName')}: {s.vehicle.driver_name || '—'} ·{' '}
                            {s.vehicle.driver_phone || '—'}
                          </span>
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={busy}
                            onClick={() => void onAssign(s.vehicle.id)}
                          >
                            {tx('assignBtn')}
                          </button>
                        </li>
                      ))}
                      {pagedSuggestions.total === 0 && (
                        <li className="empty">
                          {matchSearch.trim() ? tx('noSearchResults') : tx('noSuggest')}
                        </li>
                      )}
                    </ul>
                  </>
                )}
              </section>
            )}

            {adminTab === 'fleet' && (
              <section className="admin-panel panel-fleet">
                <header className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">{tx('fleetSnap')}</p>
                    <h3>{tx('fleetSnap')}</h3>
                    <p className="admin-panel-hint">{tx('panelFleetHint')}</p>
                  </div>
                  <span className="admin-count">{vehicles.length}</span>
                </header>
                {renderListControls({
                  value: fleetSearch,
                  onChange: setFleetSearch,
                  placeholder: tx('searchFleet'),
                  page: pagedVehicles.page,
                  totalPages: pagedVehicles.totalPages,
                  total: pagedVehicles.total,
                  onPage: setFleetPage,
                })}
                <ul className="data-list compact">
                  {pagedVehicles.items.map((v) => (
                    <li key={v.id} className="data-card static">
                      {editingVehicleId === v.id ? (
                        <form
                          className="admin-edit-form"
                          onSubmit={(e) => {
                            e.preventDefault()
                            void onUpdateVehicle(v.id, {
                              owner_name: vehicleEdit.owner_name,
                              owner_phone: vehicleEdit.owner_phone,
                              driver_name: vehicleEdit.driver_name,
                              driver_phone: vehicleEdit.driver_phone,
                              plate_number: vehicleEdit.plate_number,
                              vehicle_type: vehicleEdit.vehicle_type,
                              capacity_tons: Number(vehicleEdit.capacity_tons) || 1,
                              current_location: vehicleEdit.current_location,
                              status: vehicleEdit.status,
                              notes: vehicleEdit.notes,
                            }).then(() => setEditingVehicleId(null))
                          }}
                        >
                          <div className="admin-edit-grid">
                            <label>
                              {tx('plate')}
                              <input
                                value={vehicleEdit.plate_number ?? ''}
                                onChange={(e) =>
                                  setVehicleEdit((p) => ({ ...p, plate_number: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label>
                              {tx('statusLabel')}
                              <select
                                value={vehicleEdit.status ?? 'available'}
                                onChange={(e) =>
                                  setVehicleEdit((p) => ({ ...p, status: e.target.value }))
                                }
                              >
                                <option value="available">available</option>
                                <option value="assigned">assigned</option>
                                <option value="in_transit">in_transit</option>
                                <option value="offline">offline</option>
                                <option value="pending_approval">pending_approval</option>
                              </select>
                            </label>
                            <label>
                              {tx('ownerName')}
                              <input
                                value={vehicleEdit.owner_name ?? ''}
                                onChange={(e) =>
                                  setVehicleEdit((p) => ({ ...p, owner_name: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label>
                              {tx('phone')}
                              <input
                                value={vehicleEdit.owner_phone ?? ''}
                                onChange={(e) =>
                                  setVehicleEdit((p) => ({ ...p, owner_phone: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label>
                              {tx('driverName')}
                              <input
                                value={vehicleEdit.driver_name ?? ''}
                                onChange={(e) =>
                                  setVehicleEdit((p) => ({ ...p, driver_name: e.target.value }))
                                }
                              />
                            </label>
                            <label>
                              {tx('driverPhone')}
                              <input
                                value={vehicleEdit.driver_phone ?? ''}
                                onChange={(e) =>
                                  setVehicleEdit((p) => ({ ...p, driver_phone: e.target.value }))
                                }
                              />
                            </label>
                            <label>
                              {tx('currentLoc')}
                              <input
                                value={vehicleEdit.current_location ?? ''}
                                onChange={(e) =>
                                  setVehicleEdit((p) => ({ ...p, current_location: e.target.value }))
                                }
                                required
                              />
                            </label>
                            <label>
                              {tx('capacity')}
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={vehicleEdit.capacity_tons ?? ''}
                                onChange={(e) =>
                                  setVehicleEdit((p) => ({ ...p, capacity_tons: e.target.value }))
                                }
                                required
                              />
                            </label>
                          </div>
                          <div className="admin-card-actions">
                            <button type="submit" className="btn btn-primary" disabled={busy}>
                              {tx('saveBtn')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => setEditingVehicleId(null)}
                            >
                              {tx('cancelEditBtn')}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="card-top">
                            <strong>{v.plate_number}</strong>
                            <span
                              className={
                                v.status === 'available'
                                  ? 'badge badge-available'
                                  : 'badge badge-assigned'
                              }
                            >
                              {statusBadge(v.status, {
                                open: tx('openBadge'),
                                available: tx('availableBadge'),
                                assigned: tx('assignedBadge'),
                              })}
                            </span>
                          </div>
                          <span>
                            {v.current_location} · {v.capacity_tons}t · {v.vehicle_type}
                          </span>
                          <span>
                            {tx('ownerName')}: {v.owner_name} · {v.owner_phone}
                          </span>
                          <span>
                            {tx('driverName')}: {v.driver_name || '—'} · {v.driver_phone || '—'}
                          </span>
                          <div className="admin-card-actions">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              onClick={() => {
                                setEditingVehicleId(v.id)
                                setVehicleEdit({
                                  owner_name: v.owner_name,
                                  owner_phone: v.owner_phone,
                                  driver_name: v.driver_name,
                                  driver_phone: v.driver_phone,
                                  plate_number: v.plate_number,
                                  vehicle_type: v.vehicle_type,
                                  capacity_tons: String(v.capacity_tons),
                                  current_location: v.current_location,
                                  status: v.status,
                                  notes: v.notes,
                                })
                              }}
                            >
                              {tx('editBtn')}
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger"
                              disabled={busy}
                              onClick={() => {
                                if (window.confirm(tx('confirmDeleteVehicle'))) {
                                  void onDeleteVehicle(v.id)
                                }
                              }}
                            >
                              {tx('deleteBtn')}
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                  {pagedVehicles.total === 0 && (
                    <li className="empty">
                      {fleetSearch.trim() ? tx('noSearchResults') : tx('noVehicles')}
                    </li>
                  )}
                </ul>
              </section>
            )}

            {adminTab === 'assign' && (
              <section className="admin-panel panel-assign">
                <header className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">{tx('assignments')}</p>
                    <h3>{tx('assignments')}</h3>
                    <p className="admin-panel-hint">{tx('panelAssignHint')}</p>
                  </div>
                  <span className="admin-count">{assignments.length}</span>
                </header>
                {renderListControls({
                  value: assignSearch,
                  onChange: setAssignSearch,
                  placeholder: tx('searchAssign'),
                  page: pagedAssignments.page,
                  totalPages: pagedAssignments.totalPages,
                  total: pagedAssignments.total,
                  onPage: setAssignPage,
                })}
                <ul className="data-list">
                  {pagedAssignments.items.map((a) => (
                    <li key={a.id} className="data-card static">
                      <div className="card-top">
                        <strong>
                          #{a.id} · {a.vehicle?.plate_number ?? '—'} → Load #{a.load_id}
                        </strong>
                        <span
                          className={
                            a.status === 'assigned' ? 'badge badge-assigned' : 'badge badge-done'
                          }
                        >
                          {a.status}
                        </span>
                      </div>
                      <span>
                        {a.load?.pickup} → {a.load?.dropoff}
                      </span>
                      <span>{a.match_reason}</span>
                      {a.status === 'assigned' && (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          disabled={busy}
                          onClick={() => void onComplete(a.id)}
                        >
                          {tx('markDelivered')}
                        </button>
                      )}
                    </li>
                  ))}
                  {pagedAssignments.total === 0 && (
                    <li className="empty">
                      {assignSearch.trim() ? tx('noSearchResults') : tx('noAssign')}
                    </li>
                  )}
                </ul>
              </section>
            )}

            {adminTab === 'visits' && (
              <section className="admin-panel panel-visits">
                <header className="admin-panel-head">
                  <div>
                    <p className="admin-panel-kicker">{tx('tabVisits')}</p>
                    <h3>{tx('visitsTitle')}</h3>
                    <p className="admin-panel-hint">{tx('visitsHint')}</p>
                  </div>
                </header>

                {visitLoading && <p className="admin-panel-hint">{tx('refresh')}…</p>}
                {visitError && <p className="flash flash-error">{visitError}</p>}

                {!visitLoading && !visitError && visitStats && (
                  <>
                    <div className="visit-summary-grid">
                      <div className="visit-stat">
                        <strong>{visitStats.today.hits}</strong>
                        <span>
                          {tx('visitsToday')} · {tx('visitsHits')}
                        </span>
                      </div>
                      <div className="visit-stat">
                        <strong>{visitStats.today.uniques}</strong>
                        <span>
                          {tx('visitsToday')} · {tx('visitsUniques')}
                        </span>
                      </div>
                      <div className="visit-stat">
                        <strong>{visitStats.totals.hits}</strong>
                        <span>
                          {tx('visitsPeriod')} · {tx('visitsHits')}
                        </span>
                      </div>
                      <div className="visit-stat">
                        <strong>{visitStats.totals.uniques}</strong>
                        <span>
                          {tx('visitsPeriod')} · {tx('visitsUniques')}
                        </span>
                      </div>
                    </div>

                    <div className="visit-block">
                      <h4>{tx('visitsDaily')}</h4>
                      {visitStats.totals.hits === 0 ? (
                        <p className="empty">{tx('visitsEmpty')}</p>
                      ) : (
                        <ul className="visit-day-list">
                          {[...visitStats.daily].reverse().map((row) => {
                            const maxHits = Math.max(1, ...visitStats.daily.map((d) => d.hits))
                            const width = Math.round((row.hits / maxHits) * 100)
                            return (
                              <li key={row.day}>
                                <span className="visit-day-label">{row.day}</span>
                                <span className="visit-day-bar" aria-hidden="true">
                                  <i style={{ width: `${width}%` }} />
                                </span>
                                <span className="visit-day-counts">
                                  {row.hits} / {row.uniques}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>

                    <div className="visit-block">
                      <h4>{tx('visitsGeo')}</h4>
                      {visitStats.geo.length === 0 ? (
                        <p className="empty">{tx('visitsEmpty')}</p>
                      ) : (
                        <div className="visit-geo-table" role="table" aria-label={tx('visitsGeo')}>
                          <div className="visit-geo-head" role="row">
                            <span role="columnheader">{tx('visitsCountry')}</span>
                            <span role="columnheader">{tx('visitsCity')}</span>
                            <span role="columnheader">{tx('visitsHits')}</span>
                          </div>
                          {visitStats.geo.map((row) => (
                            <div
                              className="visit-geo-row"
                              role="row"
                              key={`${row.country}-${row.city ?? ''}-${row.hits}`}
                            >
                              <span role="cell">{countryLabel(row.country, tx('visitsUnknown'))}</span>
                              <span role="cell">{row.city || '—'}</span>
                              <span role="cell">{row.hits}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="admin-panel-hint">{tx('visitsPrivacyNote')}</p>
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </section>
  )
}

function countryLabel(code: string, unknownLabel: string): string {
  if (!code || code === 'ZZ' || code === 'XX') return unknownLabel
  try {
    const name = new Intl.DisplayNames(['en'], { type: 'region' }).of(code)
    return name ? `${name} (${code})` : code
  } catch {
    return code
  }
}
