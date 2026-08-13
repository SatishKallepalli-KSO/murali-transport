import type { Dispatch, SetStateAction } from 'react'
import type { Load, Stats, Vehicle } from '../api'
import {
  business,
  routeCities,
  routeLinks,
  testimonials,
  type DictKey,
  type Lang,
} from '../content'
import { waHref } from '../lib/whatsapp'
import type { LoadFormState } from './RequestPortal'

type Portal = 'home' | 'request' | 'owner' | 'admin' | 'about'

type Props = {
  lang: Lang
  tx: (key: DictKey) => string
  stats: Stats | null
  publicVehicles: Vehicle[]
  publicLoads: Load[]
  findPickup: string
  setFindPickup: (value: string) => void
  findType: string
  setFindType: (value: string) => void
  setLoadForm: Dispatch<SetStateAction<LoadFormState>>
  setPortal: (portal: Portal) => void
}

export function HomePortal({
  lang,
  tx,
  stats,
  publicVehicles,
  publicLoads,
  findPickup,
  setFindPickup,
  findType,
  setFindType,
  setLoadForm,
  setPortal,
}: Props) {
  const whyItems = [
    { title: tx('why1Title'), body: tx('why1Body') },
    { title: tx('why2Title'), body: tx('why2Body') },
    { title: tx('why3Title'), body: tx('why3Body') },
    { title: tx('why4Title'), body: tx('why4Body') },
  ]

  const cityById = Object.fromEntries(routeCities.map((c) => [c.id, c]))
  const majorCities = routeCities.filter((c) => c.major)

  return (
    <>
      <section className="hero hero-scenic" aria-label="Murali Transport Office">
        <div className="hero-scenic-bg" aria-hidden="true">
          <img
            src="/hero-scenic.jpg"
            alt=""
            fetchPriority="high"
            decoding="async"
          />
        </div>
        <div className="hero-scenic-shade" aria-hidden="true" />
        <div className="hero-copy hero-copy-on-media">
          <p className="hero-kicker">{tx('heroKicker')}</p>
          <h1 className="hero-name">{tx('heroBrand')}</h1>
          <p className="hero-sub">{tx('heroSub')}</p>
          <p className="hero-tagline">{tx('heroTagline')}</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => setPortal('request')}>
              {tx('ctaQuote')}
            </button>
            <a className="btn btn-light" href={`tel:${business.phone}`}>
              {tx('callNow')}
            </a>
            <a className="btn btn-ghost-light" href={waHref(lang)} target="_blank" rel="noreferrer">
              {tx('whatsapp')}
            </a>
          </div>
        </div>
      </section>

      <section className="trust-live" aria-label={tx('trustStripTitle')}>
        <div className="trust-live-trust">
          <p className="trust-strip-label">{tx('trustStripTitle')}</p>
          <div className="trust-strip-grid trust-live-grid">
            <div>
              <strong>{tx('trustYears')}</strong>
              <span>{tx('trustYearsDetail')}</span>
            </div>
            <div>
              <strong>{tx('trustRating')}</strong>
              <span>{tx('trustReviews')}</span>
            </div>
            <div>
              <strong>{tx('trustHours')}</strong>
              <span>{tx('trustHub')}</span>
            </div>
          </div>
        </div>
        <div className="trust-live-pulse">
          <p className="market-pulse-label">
            <span className="pulse-dot" aria-hidden="true" />
            {tx('trustLiveLabel')}
          </p>
          <div className="market-pulse-grid trust-live-pulse-grid">
            <div>
              <strong>{stats?.available_vehicles ?? publicVehicles.length}</strong>
              <span>{tx('snapAvailable')}</span>
            </div>
            <div>
              <strong>{stats?.open_loads ?? publicLoads.length}</strong>
              <span>{tx('snapOpen')}</span>
            </div>
            <div>
              <strong>{stats?.assignments ?? 0}</strong>
              <span>{tx('snapAssigned')}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="find-bar" aria-label="Quick find">
        <h2>{tx('findTitle')}</h2>
        <form
          className="find-form"
          onSubmit={(e) => {
            e.preventDefault()
            setLoadForm((prev) => ({
              ...prev,
              pickup: findPickup || prev.pickup,
              vehicle_preference: findType,
            }))
            setPortal('request')
          }}
        >
          <label>
            {tx('findPickupLabel')}
            <input
              value={findPickup}
              placeholder={tx('findPickupPh')}
              onChange={(e) => setFindPickup(e.target.value)}
            />
          </label>
          <label>
            {tx('findEquipLabel')}
            <select value={findType} onChange={(e) => setFindType(e.target.value)}>
              <option value="any">{tx('any')}</option>
              <option value="mini_lorry">{tx('mini')}</option>
              <option value="truck">{tx('truck')}</option>
              <option value="part_load">{tx('partLoad')}</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit">
            {tx('findBtn')}
          </button>
        </form>
      </section>

      <section className="live-board" id="live" aria-label="Live availability">
        <div className="section-head live-board-head">
          <h2>{tx('liveBoardTitle')}</h2>
          <p>{tx('liveBoardIntro')}</p>
        </div>
        <div className="live-board-grid">
          <div className="live-column live-lorries">
            <header className="live-column-head">
              <div>
                <p className="live-kicker">{tx('availableBadge')}</p>
                <h3>{tx('liveLorriesTitle')}</h3>
              </div>
              <span className="live-count">{publicVehicles.length}</span>
            </header>
            <div className="board-table" role="table" aria-label={tx('liveLorriesTitle')}>
              <div className="board-head" role="row">
                <span role="columnheader">{tx('liveColPlate')}</span>
                <span role="columnheader">{tx('liveColLoc')}</span>
                <span role="columnheader">{tx('liveColCap')}</span>
                <span role="columnheader">{tx('liveColType')}</span>
              </div>
              {publicVehicles.slice(0, 6).map((v, index) => (
                <div
                  className="board-row"
                  role="row"
                  key={v.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <strong role="cell">{v.plate_number}</strong>
                  <span role="cell">{v.current_location}</span>
                  <span role="cell">{v.capacity_tons}t</span>
                  <span role="cell">{v.vehicle_type.replace(/_/g, ' ')}</span>
                </div>
              ))}
              {publicVehicles.length === 0 && (
                <p className="live-empty">{tx('liveEmptyLorries')}</p>
              )}
            </div>
            <div className="live-cta">
              <p>{tx('liveHaveLorry')}</p>
              <button type="button" className="btn btn-dark" onClick={() => setPortal('owner')}>
                {tx('ctaRegister')}
              </button>
            </div>
          </div>

          <div className="live-column live-loads">
            <header className="live-column-head">
              <div>
                <p className="live-kicker">{tx('openBadge')}</p>
                <h3>{tx('liveLoadsTitle')}</h3>
              </div>
              <span className="live-count">{publicLoads.length}</span>
            </header>
            <div className="board-table board-cols-3" role="table" aria-label={tx('liveLoadsTitle')}>
              <div className="board-head" role="row">
                <span role="columnheader">{tx('liveColRoute')}</span>
                <span role="columnheader">{tx('liveColCargo')}</span>
                <span role="columnheader">{tx('liveColCap')}</span>
              </div>
              {publicLoads.slice(0, 6).map((load, index) => (
                <div
                  className="board-row"
                  role="row"
                  key={load.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <strong role="cell">
                    {load.pickup} → {load.dropoff}
                  </strong>
                  <span role="cell">{load.cargo}</span>
                  <span role="cell">{load.weight_tons}t</span>
                </div>
              ))}
              {publicLoads.length === 0 && (
                <p className="live-empty">{tx('liveEmptyLoads')}</p>
              )}
            </div>
            <div className="live-cta">
              <p>{tx('liveWantLorry')}</p>
              <button type="button" className="btn btn-primary" onClick={() => setPortal('request')}>
                {tx('ctaPostLoad')}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="section why-section" aria-label={tx('whyTitle')}>
        <div className="section-head">
          <h2>{tx('whyTitle')}</h2>
          <p>{tx('whyIntro')}</p>
        </div>
        <div className="why-grid">
          {whyItems.map((item, index) => (
            <article key={item.title} className="why-item">
              <span className="why-mark" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="fleet-band" aria-label="Fleet highlight">
          <img src="/fleet-eicher.jpg" alt="Orange Eicher Pro with green coconut load" loading="lazy" />
          <div>
            <p className="fleet-kicker">Eicher Pro · Mini lorry & truck</p>
          <h2>{tx('fleetTitle')}</h2>
          <p>{tx('fleetBody')}</p>
        </div>
      </section>

      <section className="routes-map" id="routes" aria-label="Service routes">
        <div className="routes-map-layout">
          <div className="routes-copy">
            <div className="section-head">
              <h2>{tx('routesTitle')}</h2>
              <p>{tx('routesIntro')}</p>
            </div>
            <p className="routes-hub-label">{tx('routesHub')}</p>
            <p className="routes-hub-name">Dommeru</p>
            <p className="routes-cover-label">{tx('routesCover')}</p>
            <ul className="routes-city-list">
              {majorCities.map((city) => (
                <li key={city.id}>{lang === 'te' ? city.te : city.en}</li>
              ))}
            </ul>
            <p className="routes-note">{tx('routesNote')}</p>
            <div className="location-actions">
              <a className="btn btn-primary" href={business.mapsShareUrl} target="_blank" rel="noreferrer">
                {tx('ctaDirections')}
              </a>
              <a className="btn btn-ghost" href={`tel:${business.phone}`}>
                {tx('callNow')}
              </a>
            </div>
          </div>

          <div className="routes-canvas" role="img" aria-label={tx('routesTitle')}>
            <svg viewBox="0 0 860 560" className="routes-svg">
              <defs>
                <linearGradient id="routeRoad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ef8b2e" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#1f6feb" stopOpacity="0.85" />
                </linearGradient>
                <radialGradient id="routeGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffc57a" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0b2a4a" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="860" height="560" rx="0" fill="#0b2a4a" />
              <circle cx="500" cy="220" r="150" fill="url(#routeGlow)" />
              <path
                className="routes-river"
                d="M 120 90 C 260 140, 360 100, 500 150 S 700 130, 820 170"
                fill="none"
                stroke="rgba(125, 211, 252, 0.28)"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {routeLinks.map(([fromId, toId]) => {
                const from = cityById[fromId]
                const to = cityById[toId]
                if (!from || !to) return null
                return (
                  <line
                    key={`${fromId}-${toId}`}
                    className="routes-link"
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="url(#routeRoad)"
                    strokeWidth="3"
                    strokeDasharray="8 10"
                  />
                )
              })}
              {routeCities.map((city) => (
                <g
                  key={city.id}
                  className={[
                    'routes-node',
                    city.hub ? 'hub' : '',
                    city.major ? 'major' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={city.hub ? 16 : city.major ? 11 : 7}
                    fill={city.hub ? '#ef8b2e' : city.major ? '#ffc57a' : '#9ec5ff'}
                    stroke="#fff"
                    strokeWidth={city.hub || city.major ? 3 : 2}
                  />
                  {city.hub ? (
                    <circle
                      cx={city.x}
                      cy={city.y}
                      r="26"
                      fill="none"
                      stroke="#ef8b2e"
                      strokeOpacity="0.45"
                      strokeWidth="2"
                      className="routes-hub-ring"
                    />
                  ) : null}
                  <text
                    x={city.x}
                    y={city.y + (city.hub ? 36 : city.major ? 30 : 22)}
                    textAnchor="middle"
                    className="routes-label"
                  >
                    {lang === 'te' ? city.te : city.en}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>
      </section>

      <section className="testimonials" aria-label="Customer testimonials">
        <div className="testimonials-head">
          <h2>{tx('testimonialsTitle')}</h2>
        </div>
        <div className="testimonial-marquee" aria-live="off">
          <div className="testimonial-track">
            {[...testimonials[lang], ...testimonials[lang], ...testimonials[lang]].map((item, index) => (
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

      <section className="final-cta" aria-label={tx('finalCtaTitle')}>
        <div className="final-cta-inner">
          <h2>{tx('finalCtaTitle')}</h2>
          <p>{tx('finalCtaBody')}</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => setPortal('request')}>
              {tx('ctaPostLoad')}
            </button>
            <a className="btn btn-light" href={`tel:${business.phone}`}>
              {tx('callNow')}
            </a>
            <a className="btn btn-ghost-light" href={waHref(lang)} target="_blank" rel="noreferrer">
              {tx('whatsapp')}
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
