import { useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Assignment, Load, Vehicle, VehicleSuggestion } from '../api'
import type { DictKey } from '../content'
import { matchesQuery, paginateItems, statusBadge } from '../lib/format'

export type AdminTab = 'snapshot' | 'loads' | 'match' | 'fleet' | 'assign'

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

  const deferredLoadSearch = useDeferredValue(loadSearch)
  const deferredFleetSearch = useDeferredValue(fleetSearch)
  const deferredAssignSearch = useDeferredValue(assignSearch)
  const deferredMatchSearch = useDeferredValue(matchSearch)

  const openLoadRows = useMemo(
    () => openLoads.filter((l) => l.status === 'open'),
    [openLoads],
  )
  const openLoadCount = openLoadRows.length
  const availableVehicleCount = vehicles.filter((v) => v.status === 'available').length
  const activeTripCount = assignments.filter((a) => a.status === 'assigned').length

  const filteredLoads = useMemo(
    () =>
      openLoadRows.filter((load) =>
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
          ],
          deferredLoadSearch,
        ),
      ),
    [openLoadRows, deferredLoadSearch],
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
                    <p className="admin-panel-kicker">{tx('openBadge')}</p>
                    <h3>{tx('openLoads')}</h3>
                    <p className="admin-panel-hint">{tx('panelLoadsHint')}</p>
                  </div>
                  <span className="admin-count">{openLoadCount}</span>
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
                    <li key={load.id}>
                      <button
                        type="button"
                        className={selectedLoadId === load.id ? 'data-card active' : 'data-card'}
                        onClick={() => {
                          setSelectedLoadId(load.id)
                          setAdminTab('match')
                        }}
                      >
                        <div className="card-top">
                          <strong>
                            #{load.id} · {load.pickup} → {load.dropoff}
                          </strong>
                          <span className="badge badge-open">{tx('openBadge')}</span>
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
                        <span className="card-action">{tx('pickLoad')} → {tx('tabMatch')}</span>
                      </button>
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
                      <div className="card-top">
                        <strong>{v.plate_number}</strong>
                        <span
                          className={
                            v.status === 'available' ? 'badge badge-available' : 'badge badge-assigned'
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
          </div>
        </>
      )}
    </section>
  )
}
