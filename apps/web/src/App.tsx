import { useEffect, useState, type FormEvent } from 'react'
import {
  adminLogin,
  adminLogout,
  assignLoad,
  completeAssignment,
  createLoad,
  deleteLoad,
  deleteVehicle,
  fetchAssignments,
  fetchLoads,
  fetchStats,
  fetchSuggestions,
  fetchVehicles,
  registerVehicle,
  updateLoad,
  updateVehicle,
  type Assignment,
  type Load,
  type Stats,
  type Vehicle,
  type VehicleSuggestion,
} from './api'
import { PhoneLinks } from './components/PhoneLinks'
import { PortalBack } from './components/PortalBack'
import { address, business, t, type Lang } from './content'
import { AdminPortal, type AdminTab } from './portals/AdminPortal'
import { AboutPortal } from './portals/AboutPortal'
import { ConfirmPortal } from './portals/ConfirmPortal'
import { HomePortal } from './portals/HomePortal'
import { OwnerPortal } from './portals/OwnerPortal'
import { RequestPortal } from './portals/RequestPortal'

type Portal = 'home' | 'request' | 'owner' | 'admin' | 'about' | 'confirm'
type ConfirmKind = 'load' | 'vehicle'

const PORTALS = new Set<Portal>(['home', 'request', 'owner', 'admin', 'about', 'confirm'])

function portalFromHash(): Portal {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home'
  return PORTALS.has(raw as Portal) ? (raw as Portal) : 'home'
}

function hashForPortal(portal: Portal) {
  return portal === 'home' ? '#/' : `#/${portal}`
}

const ADMIN_TOKEN_KEY = 'murali_admin_token'

function readAdminToken(): string {
  const fromSession = sessionStorage.getItem(ADMIN_TOKEN_KEY)
  if (fromSession) return fromSession
  const fromLocal = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (fromLocal) {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, fromLocal)
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    return fromLocal
  }
  return ''
}

function writeAdminToken(token: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

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
  driver_name: '',
  driver_phone: '',
  plate_number: '',
  vehicle_type: 'mini_lorry',
  capacity_tons: '2',
  current_location: 'Dommeru',
  notes: '',
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('murali_lang')
    return saved === 'te' ? 'te' : 'en'
  })
  const [portal, setPortal] = useState<Portal>(() =>
    typeof window !== 'undefined' ? portalFromHash() : 'home',
  )
  const [stats, setStats] = useState<Stats | null>(null)
  const [publicVehicles, setPublicVehicles] = useState<Vehicle[]>([])
  const [publicLoads, setPublicLoads] = useState<Load[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmKind, setConfirmKind] = useState<ConfirmKind | null>(null)
  const [confirmMessage, setConfirmMessage] = useState('')

  const [loadForm, setLoadForm] = useState(emptyLoad)
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle)
  const [findPickup, setFindPickup] = useState('')
  const [findType, setFindType] = useState('any')

  const [adminPin, setAdminPin] = useState('')
  const [adminToken, setAdminToken] = useState(readAdminToken)
  const [openLoads, setOpenLoads] = useState<Load[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedLoadId, setSelectedLoadId] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<VehicleSuggestion[]>([])
  const [busy, setBusy] = useState(false)
  const [adminTab, setAdminTab] = useState<AdminTab>('snapshot')

  const tx = (key: Parameters<typeof t>[1]) => t(lang, key)

  function switchLang(next: Lang) {
    setLang(next)
    localStorage.setItem('murali_lang', next)
    document.documentElement.lang = next === 'te' ? 'te' : 'en'
  }

  useEffect(() => {
    document.documentElement.lang = lang === 'te' ? 'te' : 'en'
  }, [lang])

  useEffect(() => {
    const syncFromHash = () => {
      const next = portalFromHash()
      setPortal((prev) => {
        if (prev === next) return prev
        if (next !== 'confirm') {
          setConfirmKind(null)
          setConfirmMessage('')
        }
        return next
      })
    }
    window.addEventListener('hashchange', syncFromHash)
    if (!window.location.hash) {
      window.history.replaceState(null, '', '#/')
    }
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  async function refreshPublic() {
    try {
      const [nextStats, available, opens] = await Promise.all([
        fetchStats(),
        fetchVehicles('available', 24),
        fetchLoads('open', 24),
      ])
      setStats(nextStats)
      setPublicVehicles(available)
      setPublicLoads(opens.filter((l) => l.status === 'open'))
    } catch {
      /* ignore */
    }
  }

  async function refreshAdmin(token: string) {
    const [loads, fleet, assigns] = await Promise.all([
      fetchLoads(undefined, 500, token),
      fetchVehicles(undefined, 500, token),
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
      clearAdminToken()
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

  function goPortal(next: Portal, mode: 'push' | 'replace' = 'push') {
    if (next !== 'confirm') {
      setConfirmKind(null)
      setConfirmMessage('')
    }
    setPortal(next)
    const hash = hashForPortal(next)
    if (mode === 'replace') {
      window.history.replaceState(null, '', hash)
    } else if (window.location.hash !== hash) {
      window.location.hash = hash
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goBack() {
    if (window.history.length > 1) {
      window.history.back()
      return
    }
    goPortal('home', 'replace')
  }

  function showConfirm(kind: ConfirmKind, text: string) {
    clearFlash()
    setConfirmKind(kind)
    setConfirmMessage(text)
    goPortal('confirm')
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
      setLoadForm(emptyLoad)
      void refreshPublic()
      showConfirm(
        'load',
        lang === 'te'
          ? `లోడ్ #${created.id} నమోదు అయింది. ఆఫీస్ ${created.pickup} సమీప లారీని కేటాయిస్తుంది.`
          : `Load #${created.id} posted. Office will assign a lorry near ${created.pickup}.`,
      )
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
      setVehicleForm(emptyVehicle)
      void refreshPublic()
      showConfirm(
        'vehicle',
        lang === 'te'
          ? `వాహనం ${created.plate_number} ${created.current_location} వద్ద నమోదు అయింది.`
          : `Vehicle ${created.plate_number} registered at ${created.current_location}. Ready for loads.`,
      )
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
      writeAdminToken(access_token)
      setAdminPin('')
      setMessage(lang === 'te' ? 'అడ్మిన్ డెస్క్ అన్‌లాక్ అయింది.' : 'Admin desk unlocked.')
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
        lang === 'te'
          ? `${row.vehicle?.plate_number} ను లోడ్ #${row.load_id} కు అసైన్ చేశారు (${Math.round(row.match_score * 100)}% మ్యాచ్).`
          : `Assigned ${row.vehicle?.plate_number} to load #${row.load_id} (${Math.round(row.match_score * 100)}% location match).`,
      )
      setSelectedLoadId(null)
      setAdminTab('assign')
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
      setMessage(
        lang === 'te'
          ? `అసైన్‌మెంట్ #${id} పూర్తయింది. వాహనం మళ్లీ అందుబాటులో ఉంది.`
          : `Assignment #${id} completed. Vehicle is available again.`,
      )
      await refreshAdmin(adminToken)
      void refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Complete failed')
    } finally {
      setBusy(false)
    }
  }

  async function onUpdateLoad(id: number, body: Record<string, unknown>) {
    if (!adminToken) return
    clearFlash()
    setBusy(true)
    try {
      await updateLoad(adminToken, id, body)
      setMessage(tx('loadUpdated'))
      await refreshAdmin(adminToken)
      void refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update load failed')
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function onDeleteLoad(id: number) {
    if (!adminToken) return
    clearFlash()
    setBusy(true)
    try {
      await deleteLoad(adminToken, id)
      if (selectedLoadId === id) setSelectedLoadId(null)
      setMessage(tx('loadDeleted'))
      await refreshAdmin(adminToken)
      void refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete load failed')
    } finally {
      setBusy(false)
    }
  }

  async function onUpdateVehicle(id: number, body: Record<string, unknown>) {
    if (!adminToken) return
    clearFlash()
    setBusy(true)
    try {
      await updateVehicle(adminToken, id, body)
      setMessage(tx('vehicleUpdated'))
      await refreshAdmin(adminToken)
      void refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update vehicle failed')
      throw err
    } finally {
      setBusy(false)
    }
  }

  async function onDeleteVehicle(id: number) {
    if (!adminToken) return
    clearFlash()
    setBusy(true)
    try {
      await deleteVehicle(adminToken, id)
      setMessage(tx('vehicleDeleted'))
      await refreshAdmin(adminToken)
      void refreshPublic()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete vehicle failed')
    } finally {
      setBusy(false)
    }
  }

  function logoutAdmin() {
    if (adminToken) {
      void adminLogout(adminToken).catch(() => {
        /* fire-and-forget */
      })
    }
    setAdminToken('')
    clearAdminToken()
    setSelectedLoadId(null)
    setSuggestions([])
    setAdminTab('snapshot')
  }

  return (
    <div className={`site lang-${lang}`}>
      <div className="topbar">
        <span className="topbar-banner">
          Murali Transport Office, Dommeru · ph: <PhoneLinks />
        </span>
      </div>

      <header className="nav">
        <a
          className="nav-brand"
          href="#top"
          onClick={(e) => {
            e.preventDefault()
            goPortal('home')
          }}
        >
          <span className="nav-mark" aria-hidden="true" />
          <span>
            <strong>Murali Transport</strong>
            <small>Dommeru</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <button type="button" className={portal === 'home' ? 'active' : ''} onClick={() => goPortal('home')}>
            {tx('navHome')}
          </button>
          <button type="button" className={portal === 'about' ? 'active' : ''} onClick={() => goPortal('about')}>
            {tx('navAbout')}
          </button>
          <button type="button" className={portal === 'request' ? 'active' : ''} onClick={() => goPortal('request')}>
            {tx('navRequest')}
          </button>
          <button type="button" className={portal === 'owner' ? 'active' : ''} onClick={() => goPortal('owner')}>
            {tx('navOwner')}
          </button>
          <button type="button" className={portal === 'admin' ? 'active' : ''} onClick={() => goPortal('admin')}>
            {tx('navAdmin')}
          </button>
        </nav>
        <div className="nav-end">
          <div className="lang-switch" role="group" aria-label="Language">
            <button
              type="button"
              className={lang === 'en' ? 'active' : ''}
              onClick={() => switchLang('en')}
            >
              {tx('langEn')}
            </button>
            <button
              type="button"
              className={lang === 'te' ? 'active' : ''}
              onClick={() => switchLang('te')}
            >
              {tx('langTe')}
            </button>
          </div>
          <a className="nav-cta" href={`tel:${business.phone}`}>
            {tx('callNow')}
          </a>
        </div>
      </header>

      <main id="top">
        {error && (
          <div className="flash flash-error" role="status">
            {error}
            <button type="button" onClick={clearFlash} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
        {message && portal !== 'confirm' && (
          <div className="flash flash-ok" role="status">
            {message}
            <button type="button" onClick={clearFlash} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}

        {portal === 'confirm' && confirmKind && (
          <>
            <PortalBack tx={tx} onBack={goBack} labelKey="backHome" />
            <ConfirmPortal
              title={tx(confirmKind === 'load' ? 'confirmLoadTitle' : 'confirmVehicleTitle')}
              message={confirmMessage}
              primaryLabel={tx('confirmBackHome')}
              secondaryLabel={tx(
                confirmKind === 'load' ? 'confirmAnotherLoad' : 'confirmAnotherVehicle',
              )}
              onPrimary={() => goPortal('home')}
              onSecondary={() => goPortal(confirmKind === 'load' ? 'request' : 'owner')}
              callLabel={tx('callNow')}
              callHref={`tel:${business.phone}`}
            />
          </>
        )}

        {portal === 'home' && (
          <HomePortal
            lang={lang}
            tx={tx}
            stats={stats}
            publicVehicles={publicVehicles}
            publicLoads={publicLoads}
            findPickup={findPickup}
            setFindPickup={setFindPickup}
            findType={findType}
            setFindType={setFindType}
            setLoadForm={setLoadForm}
            setPortal={goPortal}
          />
        )}

        {portal === 'about' && (
          <>
            <PortalBack tx={tx} onBack={goBack} />
            <AboutPortal lang={lang} tx={tx} />
          </>
        )}

        {portal === 'request' && (
          <>
            <PortalBack tx={tx} onBack={goBack} />
            <RequestPortal
              tx={tx}
              loadForm={loadForm}
              setLoadForm={setLoadForm}
              busy={busy}
              onCreateLoad={onCreateLoad}
            />
          </>
        )}

        {portal === 'owner' && (
          <>
            <PortalBack tx={tx} onBack={goBack} />
            <OwnerPortal
              tx={tx}
              vehicleForm={vehicleForm}
              setVehicleForm={setVehicleForm}
              busy={busy}
              onRegisterVehicle={onRegisterVehicle}
            />
          </>
        )}

        {portal === 'admin' && (
          <>
            <PortalBack tx={tx} onBack={goBack} />
            <AdminPortal
            tx={tx}
            adminToken={adminToken}
            adminPin={adminPin}
            setAdminPin={setAdminPin}
            busy={busy}
            openLoads={openLoads}
            vehicles={vehicles}
            assignments={assignments}
            suggestions={suggestions}
            selectedLoadId={selectedLoadId}
            setSelectedLoadId={setSelectedLoadId}
            adminTab={adminTab}
            setAdminTab={setAdminTab}
            onAdminLogin={onAdminLogin}
            onAssign={onAssign}
            onComplete={onComplete}
            onUpdateLoad={onUpdateLoad}
            onDeleteLoad={onDeleteLoad}
            onUpdateVehicle={onUpdateVehicle}
            onDeleteVehicle={onDeleteVehicle}
            logoutAdmin={logoutAdmin}
            refreshAdmin={refreshAdmin}
          />
          </>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>{business.name}</strong>
            <p>{business.owner}</p>
            <p>
              <PhoneLinks />
            </p>
            <p>{address.line}</p>
          </div>
          <p>{tx('footerRoles')}</p>
        </div>
      </footer>
    </div>
  )
}
