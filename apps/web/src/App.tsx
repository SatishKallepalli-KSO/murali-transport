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
import { address, business, t, testimonials, type Lang } from './content'

type Portal = 'home' | 'request' | 'owner' | 'admin' | 'about'
type AdminTab = 'snapshot' | 'loads' | 'match' | 'fleet' | 'assign'

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

function PhoneLinks({ className }: { className?: string }) {
  return (
    <span className={className ? `phone-links ${className}` : 'phone-links'}>
      <a href={`tel:${business.phone}`}>{business.phoneDisplay}</a>
      <span aria-hidden="true"> · </span>
      <a href={`tel:${business.phoneAlt}`}>{business.phoneAltDisplay}</a>
    </span>
  )
}

function waHref(lang: Lang) {
  const text =
    lang === 'te'
      ? `నమస్కారం, ${business.shortName} (దొమ్మేరు) నుండి లారీ/ట్రక్ బుక్ చేయాలనుకుంటున్నాను.`
      : `Namaste, I want to book a mini lorry / truck from ${business.shortName} (Dommeru).`
  return `https://wa.me/${business.whatsapp}?text=${encodeURIComponent(text)}`
}

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function statusBadge(status: string, labels: { open: string; available: string; assigned: string }) {
  const key = status.toLowerCase()
  if (key === 'open') return labels.open
  if (key === 'available') return labels.available
  if (key === 'assigned') return labels.assigned
  return status
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('murali_lang')
    return saved === 'te' ? 'te' : 'en'
  })
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
  const [adminTab, setAdminTab] = useState<AdminTab>('snapshot')
  const [deskAccess, setDeskAccess] = useState(
    () => localStorage.getItem('murali_desk_access') === '1',
  )

  const openLoadCount = openLoads.filter((l) => l.status === 'open').length
  const availableVehicleCount = vehicles.filter((v) => v.status === 'available').length
  const activeTripCount = assignments.filter((a) => a.status === 'assigned').length
  const showAdminNav = deskAccess || Boolean(adminToken)

  const tx = (key: Parameters<typeof t>[1]) => t(lang, key)

  function openDeskGate() {
    setDeskAccess(true)
    localStorage.setItem('murali_desk_access', '1')
    setPortal('admin')
  }

  function closeDeskGate() {
    setDeskAccess(false)
    localStorage.removeItem('murali_desk_access')
  }

  function switchLang(next: Lang) {
    setLang(next)
    localStorage.setItem('murali_lang', next)
    document.documentElement.lang = next === 'te' ? 'te' : 'en'
  }

  useEffect(() => {
    document.documentElement.lang = lang === 'te' ? 'te' : 'en'
  }, [lang])

  useEffect(() => {
    function syncDeskHash() {
      const hash = window.location.hash.replace(/^#/, '').toLowerCase()
      if (hash === 'desk' || hash === 'admin-desk') {
        openDeskGate()
      }
    }
    syncDeskHash()
    window.addEventListener('hashchange', syncDeskHash)
    return () => window.removeEventListener('hashchange', syncDeskHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
      localStorage.setItem('murali_admin_token', access_token)
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
    setAdminToken('')
    localStorage.removeItem('murali_admin_token')
    setSelectedLoadId(null)
    setSuggestions([])
    setAdminTab('snapshot')
  }

  const services = [
    { title: tx('service1Title'), body: tx('service1Body') },
    { title: tx('service2Title'), body: tx('service2Body') },
    { title: tx('service3Title'), body: tx('service3Body') },
    { title: tx('service4Title'), body: tx('service4Body') },
  ]

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
          {showAdminNav && (
            <button type="button" className={portal === 'admin' ? 'active' : ''} onClick={() => setPortal('admin')}>
              {tx('navAdmin')}
            </button>
          )}
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
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="hero-kicker">{tx('heroKicker')}</p>
                <h1 className="hero-name">{tx('heroBrand')}</h1>
                <p className="hero-tagline">{tx('heroTagline')}</p>
                <div className="hero-actions">
                  <button type="button" className="btn btn-primary" onClick={() => setPortal('request')}>
                    {tx('ctaPostLoad')}
                  </button>
                  <button type="button" className="btn btn-dark" onClick={() => setPortal('owner')}>
                    {tx('ctaRegister')}
                  </button>
                  <a className="btn btn-ghost" href={`tel:${business.phone}`}>
                    {tx('callNow')}
                  </a>
                </div>
              </div>
              <div className="hero-media">
                <img src="/eicher-hero.jpg" alt="Eicher lorry — Murali Transport Office Dommeru" />
              </div>
            </section>

            <section className="stats-band trust" aria-label="Live platform stats">
              <div className="trust-item">
                <p className="trust-label">{tx('trustFleet')}</p>
                <p className="trust-value">{stats?.vehicles ?? '—'}</p>
                <p className="trust-detail">
                  {stats?.available_vehicles ?? 0} {tx('trustAvailable')}
                </p>
              </div>
              <div className="trust-item">
                <p className="trust-label">{tx('trustOpen')}</p>
                <p className="trust-value">{stats?.open_loads ?? '—'}</p>
                <p className="trust-detail">{tx('trustOpenDetail')}</p>
              </div>
              <div className="trust-item">
                <p className="trust-label">{tx('trustAssigned')}</p>
                <p className="trust-value">{stats?.assignments ?? '—'}</p>
                <p className="trust-detail">{tx('trustAssignedDetail')}</p>
              </div>
            </section>

            <section className="quick-actions" aria-label="Quick actions">
              <button type="button" className="quick-card" onClick={() => setPortal('request')}>
                <strong>{tx('ctaPostLoad')}</strong>
                <span>{tx('service2Body')}</span>
              </button>
              <button type="button" className="quick-card" onClick={() => setPortal('owner')}>
                <strong>{tx('ctaRegister')}</strong>
                <span>{tx('service3Body')}</span>
              </button>
              <a className="quick-card" href={waHref(lang)} target="_blank" rel="noreferrer">
                <strong>{tx('whatsapp')}</strong>
                <span>
                  {business.phoneDisplay} · {business.phoneAltDisplay}
                </span>
              </a>
            </section>

            <section className="section" id="services">
              <div className="section-head">
                <h2>{tx('servicesTitle')}</h2>
                <p>{tx('servicesIntro')}</p>
              </div>
              <div className="service-grid">
                {services.map((service) => (
                  <article key={service.title} className="service-item">
                    <h3>{service.title}</h3>
                    <p>{service.body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className="fleet-band" aria-label="Fleet highlight">
              <img src="/eicher-lorry.png" alt="Eicher lorry" />
              <div>
                <p className="fleet-kicker">Eicher · Mini lorry & truck</p>
                <h2>{tx('fleetTitle')}</h2>
                <p>{tx('fleetBody')}</p>
              </div>
            </section>

            <section className="section">
              <div className="section-head">
                <h2>{tx('howTitle')}</h2>
                <p>{tx('howIntro')}</p>
              </div>
              <ol className="steps">
                <li className="step">
                  <span className="step-num">01</span>
                  <div>
                    <h3>{tx('how1Title')}</h3>
                    <p>{tx('how1Body')}</p>
                  </div>
                </li>
                <li className="step">
                  <span className="step-num">02</span>
                  <div>
                    <h3>{tx('how2Title')}</h3>
                    <p>{tx('how2Body')}</p>
                  </div>
                </li>
                <li className="step">
                  <span className="step-num">03</span>
                  <div>
                    <h3>{tx('how3Title')}</h3>
                    <p>{tx('how3Body')}</p>
                  </div>
                </li>
              </ol>
            </section>

            <section className="section testimonials" aria-label="Customer testimonials">
              <div className="section-head">
                <h2>{tx('testimonialsTitle')}</h2>
                <p>{tx('testimonialsIntro')}</p>
              </div>
              <div className="testimonial-marquee" aria-live="off">
                <div className="testimonial-track">
                  {[...testimonials[lang], ...testimonials[lang]].map((item, index) => (
                    <figure className="testimonial-card" key={`${item.name}-${index}`}>
                      <blockquote>{item.quote}</blockquote>
                      <figcaption>
                        <strong>{item.name}</strong>
                        <span>
                          {item.role} · {item.place}
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            </section>

            <section className="section section-alt about-preview">
              <div className="section-head">
                <h2>{tx('aboutTitle')}</h2>
                <p>{tx('aboutIntro')}</p>
              </div>
              <dl className="about-facts">
                <div>
                  <dt>{tx('aboutOwnerLabel')}</dt>
                  <dd>{business.owner}</dd>
                </div>
                <div>
                  <dt>{tx('aboutPhoneLabel')}</dt>
                  <dd>
                    <PhoneLinks />
                  </dd>
                </div>
                <div>
                  <dt>{tx('aboutAddressLabel')}</dt>
                  <dd>{address.line}</dd>
                </div>
              </dl>
              <div className="location-actions">
                <button type="button" className="btn btn-primary" onClick={() => setPortal('about')}>
                  {tx('navAbout')}
                </button>
                <a className="btn btn-ghost" href={business.mapsShareUrl} target="_blank" rel="noreferrer">
                  {tx('ctaDirections')}
                </a>
              </div>
            </section>
          </>
        )}

        {portal === 'about' && (
          <section className="portal about-page">
            <div className="section-head">
              <h2>{tx('aboutTitle')}</h2>
              <p>{tx('aboutIntro')}</p>
            </div>
            <div className="about-layout">
              <div className="about-card">
                <dl className="about-facts">
                  <div>
                    <dt>{tx('aboutOwnerLabel')}</dt>
                    <dd>{business.owner}</dd>
                  </div>
                  <div>
                    <dt>{tx('aboutPhoneLabel')}</dt>
                    <dd>
                      <PhoneLinks />
                    </dd>
                  </div>
                  <div>
                    <dt>{tx('aboutAddressLabel')}</dt>
                    <dd>{address.line}</dd>
                  </div>
                  <div>
                    <dt>{tx('aboutHoursLabel')}</dt>
                    <dd>{tx('aboutHoursValue')}</dd>
                  </div>
                  <div>
                    <dt>Google</dt>
                    <dd>
                      {business.rating}★ · {business.reviewCount} reviews
                    </dd>
                  </div>
                </dl>
                <p className="about-body">{tx('aboutBody')}</p>
                <div className="location-actions">
                  <a className="btn btn-primary" href={`tel:${business.phone}`}>
                    {tx('callNow')}
                  </a>
                  <a className="btn btn-ghost" href={waHref(lang)} target="_blank" rel="noreferrer">
                    {tx('whatsapp')}
                  </a>
                  <a className="btn btn-ghost" href={business.mapsShareUrl} target="_blank" rel="noreferrer">
                    {tx('ctaDirections')}
                  </a>
                </div>
              </div>
              <img className="about-photo" src="/eicher-lorry.png" alt="Office fleet lorry" />
            </div>
          </section>
        )}

        {portal === 'request' && (
          <section className="portal">
            <div className="section-head">
              <h2>{tx('postTitle')}</h2>
              <p>{tx('postIntro')}</p>
            </div>
            <form className="panel-form" onSubmit={onCreateLoad}>
              <label>
                {tx('name')}
                <input required value={loadForm.requestor_name} onChange={(e) => setLoadForm({ ...loadForm, requestor_name: e.target.value })} />
              </label>
              <label>
                {tx('phone')}
                <input required value={loadForm.requestor_phone} onChange={(e) => setLoadForm({ ...loadForm, requestor_phone: e.target.value })} />
              </label>
              <label>
                {tx('pickup')}
                <input required value={loadForm.pickup} onChange={(e) => setLoadForm({ ...loadForm, pickup: e.target.value })} placeholder="Dommeru" />
              </label>
              <label>
                {tx('dropoff')}
                <input required value={loadForm.dropoff} onChange={(e) => setLoadForm({ ...loadForm, dropoff: e.target.value })} />
              </label>
              <label>
                {tx('cargo')}
                <input required value={loadForm.cargo} onChange={(e) => setLoadForm({ ...loadForm, cargo: e.target.value })} />
              </label>
              <label>
                {tx('weight')}
                <input required type="number" min="0.1" step="0.1" value={loadForm.weight_tons} onChange={(e) => setLoadForm({ ...loadForm, weight_tons: e.target.value })} />
              </label>
              <label>
                {tx('vehiclePref')}
                <select value={loadForm.vehicle_preference} onChange={(e) => setLoadForm({ ...loadForm, vehicle_preference: e.target.value })}>
                  <option value="any">{tx('any')}</option>
                  <option value="mini_lorry">{tx('mini')}</option>
                  <option value="truck">{tx('truck')}</option>
                  <option value="part_load">{tx('partLoad')}</option>
                </select>
              </label>
              <label>
                {tx('preferredDate')}
                <input
                  type="date"
                  min={todayISO()}
                  value={loadForm.preferred_date}
                  onChange={(e) => setLoadForm({ ...loadForm, preferred_date: e.target.value })}
                />
              </label>
              <label className="span-2">
                {tx('notes')}
                <textarea rows={3} value={loadForm.notes} onChange={(e) => setLoadForm({ ...loadForm, notes: e.target.value })} />
              </label>
              <div className="form-actions span-2">
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? tx('posting') : tx('submitLoad')}
                </button>
                <a className="btn btn-ghost" href={`tel:${business.phone}`}>
                  {tx('callNow')}
                </a>
              </div>
            </form>
          </section>
        )}

        {portal === 'owner' && (
          <section className="portal">
            <div className="section-head">
              <h2>{tx('ownerTitle')}</h2>
              <p>{tx('ownerIntro')}</p>
            </div>
            <form className="panel-form" onSubmit={onRegisterVehicle}>
              <label>
                {tx('ownerName')}
                <input required value={vehicleForm.owner_name} onChange={(e) => setVehicleForm({ ...vehicleForm, owner_name: e.target.value })} />
              </label>
              <label>
                {tx('ownerPhone')}
                <input required value={vehicleForm.owner_phone} onChange={(e) => setVehicleForm({ ...vehicleForm, owner_phone: e.target.value })} />
              </label>
              <label>
                {tx('driverName')}
                <input required value={vehicleForm.driver_name} onChange={(e) => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })} />
              </label>
              <label>
                {tx('driverPhone')}
                <input required value={vehicleForm.driver_phone} onChange={(e) => setVehicleForm({ ...vehicleForm, driver_phone: e.target.value })} />
              </label>
              <label>
                {tx('plate')}
                <input required value={vehicleForm.plate_number} onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })} placeholder="AP39XX1234" />
              </label>
              <label>
                {tx('vehicleType')}
                <select value={vehicleForm.vehicle_type} onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}>
                  <option value="mini_lorry">{tx('mini')}</option>
                  <option value="truck">{tx('truck')}</option>
                  <option value="trailer">{tx('trailer')}</option>
                </select>
              </label>
              <label>
                {tx('capacity')}
                <input required type="number" min="0.5" step="0.5" value={vehicleForm.capacity_tons} onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_tons: e.target.value })} />
              </label>
              <label>
                {tx('currentLoc')}
                <input required value={vehicleForm.current_location} onChange={(e) => setVehicleForm({ ...vehicleForm, current_location: e.target.value })} />
              </label>
              <label className="span-2">
                {tx('notes')}
                <textarea rows={3} value={vehicleForm.notes} onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })} />
              </label>
              <div className="form-actions span-2">
                <button className="btn btn-primary" type="submit" disabled={busy}>
                  {busy ? tx('saving') : tx('registerBtn')}
                </button>
              </div>
            </form>
          </section>
        )}

        {portal === 'admin' && showAdminNav && (
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
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      logoutAdmin()
                      closeDeskGate()
                      setPortal('home')
                      if (window.location.hash.toLowerCase().includes('desk')) {
                        window.history.replaceState(null, '', window.location.pathname)
                      }
                    }}
                  >
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
                      <ul className="data-list">
                        {openLoads.filter((l) => l.status === 'open').map((load) => (
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
                        {openLoadCount === 0 && <li className="empty">{tx('noOpen')}</li>}
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
                        <ul className="data-list">
                          {suggestions.map((s) => (
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
                          {suggestions.length === 0 && <li className="empty">{tx('noSuggest')}</li>}
                        </ul>
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
                      <ul className="data-list compact">
                        {vehicles.map((v) => (
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
                        {vehicles.length === 0 && <li className="empty">{tx('noVehicles')}</li>}
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
                      <ul className="data-list">
                        {assignments.map((a) => (
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
                        {assignments.length === 0 && <li className="empty">{tx('noAssign')}</li>}
                      </ul>
                    </section>
                  )}
                </div>
              </>
            )}
          </section>
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
