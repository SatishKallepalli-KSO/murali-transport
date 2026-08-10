import { useEffect, useState, type FormEvent } from 'react'
import {
  adminLogin,
  adminLogout,
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
import { PhoneLinks } from './components/PhoneLinks'
import { address, business, t, type Lang } from './content'
import { AdminPortal, type AdminTab } from './portals/AdminPortal'
import { AboutPortal } from './portals/AboutPortal'
import { HomePortal } from './portals/HomePortal'
import { OwnerPortal } from './portals/OwnerPortal'
import { RequestPortal } from './portals/RequestPortal'

type Portal = 'home' | 'request' | 'owner' | 'admin' | 'about'

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
  const [portal, setPortal] = useState<Portal>('home')
  const [stats, setStats] = useState<Stats | null>(null)
  const [publicVehicles, setPublicVehicles] = useState<Vehicle[]>([])
  const [publicLoads, setPublicLoads] = useState<Load[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  async function onCreateLoad(event: FormEvent) {
    event.preventDefault()
    clearFlash()
    setBusy(true)
    try {
      const created = await createLoad({
        ...loadForm,
        weight_tons: Number(loadForm.weight_tons) || 1,
      })
      setMessage(
        lang === 'te'
          ? `లోడ్ #${created.id} నమోదు అయింది. ఆఫీస్ ${created.pickup} సమీప లారీని కేటాయిస్తుంది.`
          : `Load #${created.id} posted. Office will assign a lorry near ${created.pickup}.`,
      )
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
        lang === 'te'
          ? `వాహనం ${created.plate_number} ${created.current_location} వద్ద నమోదు అయింది.`
          : `Vehicle ${created.plate_number} registered at ${created.current_location}. Ready for loads.`,
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
            setPortal('home')
          }}
        >
          <span className="nav-mark" aria-hidden="true" />
          <span>
            <strong>Murali Transport</strong>
            <small>Dommeru</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <button type="button" className={portal === 'home' ? 'active' : ''} onClick={() => setPortal('home')}>
            {tx('navHome')}
          </button>
          <button type="button" className={portal === 'about' ? 'active' : ''} onClick={() => setPortal('about')}>
            {tx('navAbout')}
          </button>
          <button type="button" className={portal === 'request' ? 'active' : ''} onClick={() => setPortal('request')}>
            {tx('navRequest')}
          </button>
          <button type="button" className={portal === 'owner' ? 'active' : ''} onClick={() => setPortal('owner')}>
            {tx('navOwner')}
          </button>
          <button type="button" className={portal === 'admin' ? 'active' : ''} onClick={() => setPortal('admin')}>
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
        {(message || error) && (
          <div className={`flash ${error ? 'flash-error' : 'flash-ok'}`} role="status">
            {error ?? message}
            <button type="button" onClick={clearFlash} aria-label="Dismiss">
              ×
            </button>
          </div>
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
            setPortal={setPortal}
          />
        )}

        {portal === 'about' && <AboutPortal lang={lang} tx={tx} />}

        {portal === 'request' && (
          <RequestPortal
            tx={tx}
            loadForm={loadForm}
            setLoadForm={setLoadForm}
            busy={busy}
            onCreateLoad={onCreateLoad}
          />
        )}

        {portal === 'owner' && (
          <OwnerPortal
            tx={tx}
            vehicleForm={vehicleForm}
            setVehicleForm={setVehicleForm}
            busy={busy}
            onRegisterVehicle={onRegisterVehicle}
          />
        )}

        {portal === 'admin' && (
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
            logoutAdmin={logoutAdmin}
            refreshAdmin={refreshAdmin}
          />
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
