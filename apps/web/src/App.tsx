import { useState, type FormEvent } from 'react'
import {
  address,
  business,
  corridors,
  services,
  steps,
  trustPoints,
} from './content'

const mapEmbedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${business.lng - 0.03}%2C${business.lat - 0.02}%2C${business.lng + 0.03}%2C${business.lat + 0.02}&layer=mapnik&marker=${business.lat}%2C${business.lng}`

const apiBase = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

function telHref(phone: string) {
  return phone ? `tel:${phone.replace(/\s+/g, '')}` : undefined
}

function waHref(whatsapp: string) {
  if (!whatsapp) return undefined
  const text = encodeURIComponent(
    `Namaste, I want to book a mini lorry / truck from ${business.shortName} (Dommeru).`,
  )
  return `https://wa.me/${whatsapp}?text=${text}`
}

type BookingForm = {
  name: string
  phone: string
  pickup: string
  dropoff: string
  vehicle_type: string
  cargo: string
  preferred_date: string
  notes: string
}

const emptyForm: BookingForm = {
  name: '',
  phone: '',
  pickup: '',
  dropoff: '',
  vehicle_type: 'mini_lorry',
  cargo: '',
  preferred_date: '',
  notes: '',
}

export default function App() {
  const call = telHref(business.phone)
  const whatsapp = waHref(business.whatsapp)
  const [form, setForm] = useState<BookingForm>(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [bookingId, setBookingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setBookingId(null)
    try {
      const res = await fetch(`${apiBase}/v1/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const detail = await res.text()
        throw new Error(detail || `Booking failed (${res.status})`)
      }
      const data = (await res.json()) as { id: number }
      setBookingId(data.id)
      setForm(emptyForm)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit booking')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="site">
      <div className="atmosphere" aria-hidden="true" />

      <div className="topbar">
        <span className="topbar-rating">
          {business.rating}★ · {business.reviewCount} Google reviews
        </span>
        <span className="topbar-hours">{business.hours}</span>
      </div>

      <header className="nav">
        <a className="nav-brand" href="#top">
          <span className="nav-mark" aria-hidden="true" />
          <span>
            <strong>Murali Office</strong>
            <small>Miny Lorry Transport</small>
          </span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#services">Services</a>
          <a href="#booking">Booking</a>
          <a href="#routes">Routes</a>
          <a href="#location">Location</a>
          <a href="#contact">Contact</a>
        </nav>
        <a className="nav-cta" href="#contact">
          Book freight
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <p className="hero-kicker">Transportation service · Dommeru</p>
            <h1 className="hero-name">{business.name}</h1>
            <p className="hero-tagline">{business.tagline}</p>
            <p className="hero-summary">{business.summary}</p>
            <div className="hero-actions">
              <a className="btn btn-primary" href="#contact">
                Enquire / book
              </a>
              <a
                className="btn btn-ghost"
                href={business.mapsShareUrl}
                target="_blank"
                rel="noreferrer"
              >
                Get directions
              </a>
              {call ? (
                <a className="btn btn-ghost" href={call}>
                  Call office
                </a>
              ) : null}
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
            <p className="hero-visual-caption">Freight that moves on time</p>
          </div>
        </section>

        <section className="trust" aria-label="Why customers choose us">
          {trustPoints.map((point) => (
            <div key={point.label} className="trust-item">
              <p className="trust-label">{point.label}</p>
              <p className="trust-value">{point.value}</p>
              <p className="trust-detail">{point.detail}</p>
            </div>
          ))}
        </section>

        <section id="services" className="section">
          <div className="section-head">
            <h2>What this office handles</h2>
            <p>
              Commercial logistics booking for mini lorries and trucks — from
              local Dommeru loads to longer freight corridors.
            </p>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <article key={service.title} className="service">
                <h3>{service.title}</h3>
                <p>{service.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="booking" className="section section-alt">
          <div className="section-head">
            <h2>How booking works</h2>
            <p>Simple desk process — tell us the load, we arrange the vehicle.</p>
          </div>
          <ol className="steps">
            {steps.map((item) => (
              <li key={item.step} className="step">
                <span className="step-num">{item.step}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section id="routes" className="section">
          <div className="section-head">
            <h2>Coverage from Dommeru</h2>
            <p>
              Regular movement across the Godavari belt, with interstate trucks
              arranged on request.
            </p>
          </div>
          <ul className="corridor-list">
            {corridors.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>

        <section id="location" className="section section-alt">
          <div className="section-head">
            <h2>Office location</h2>
            <p>{address.line}</p>
          </div>
          <div className="location-layout">
            <div className="location-details">
              <dl>
                <div>
                  <dt>Plus code</dt>
                  <dd>{address.plusCode}</dd>
                </div>
                <div>
                  <dt>Village</dt>
                  <dd>{address.locality}</dd>
                </div>
                <div>
                  <dt>PIN</dt>
                  <dd>{address.pin}</dd>
                </div>
                <div>
                  <dt>State</dt>
                  <dd>{address.state}</dd>
                </div>
              </dl>
              <div className="location-actions">
                <a
                  className="btn btn-primary"
                  href={business.mapsShareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in Google Maps
                </a>
                <a
                  className="btn btn-ghost"
                  href={business.mapsSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Search listing
                </a>
              </div>
            </div>
            <div className="map-frame">
              <iframe
                title="Map of Dommeru office area"
                src={mapEmbedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

        <section id="contact" className="contact">
          <div className="contact-panel">
            <h2>Book a vehicle</h2>
            <p>
              Submit a freight enquiry online — it is saved to the office
              booking desk. Or visit Dommeru and share pickup, drop, and load
              details in person.
            </p>

            <form className="booking-form" onSubmit={onSubmit}>
              <label>
                Your name
                <input
                  required
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Full name"
                />
              </label>
              <label>
                Phone
                <input
                  required
                  name="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Mobile number"
                />
              </label>
              <label>
                Pickup
                <input
                  required
                  name="pickup"
                  value={form.pickup}
                  onChange={(e) => setForm({ ...form, pickup: e.target.value })}
                  placeholder="Village / town / godown"
                />
              </label>
              <label>
                Drop
                <input
                  required
                  name="dropoff"
                  value={form.dropoff}
                  onChange={(e) => setForm({ ...form, dropoff: e.target.value })}
                  placeholder="Destination"
                />
              </label>
              <label>
                Vehicle
                <select
                  name="vehicle_type"
                  value={form.vehicle_type}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_type: e.target.value })
                  }
                >
                  <option value="mini_lorry">Mini lorry</option>
                  <option value="truck">Truck / full load</option>
                  <option value="part_load">Part load</option>
                </select>
              </label>
              <label>
                Cargo
                <input
                  name="cargo"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  placeholder="What are you shipping?"
                />
              </label>
              <label>
                Preferred date
                <input
                  name="preferred_date"
                  value={form.preferred_date}
                  onChange={(e) =>
                    setForm({ ...form, preferred_date: e.target.value })
                  }
                  placeholder="e.g. tomorrow morning"
                />
              </label>
              <label className="span-2">
                Notes
                <textarea
                  name="notes"
                  rows={3}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Weight, timing, special handling…"
                />
              </label>
              <div className="form-actions span-2">
                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Submit booking enquiry'}
                </button>
                {call ? (
                  <a className="btn btn-ghost" href={call}>
                    Call now
                  </a>
                ) : null}
                {whatsapp ? (
                  <a
                    className="btn btn-ghost"
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                ) : null}
                <a
                  className="btn btn-ghost"
                  href={business.mapsShareUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              </div>
              {bookingId ? (
                <p className="form-success span-2" role="status">
                  Enquiry #{bookingId} received. The Dommeru office will follow
                  up on your phone number.
                </p>
              ) : null}
              {error ? (
                <p className="form-error span-2" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div>
          <strong>{business.name}</strong>
          <p>{address.line}</p>
        </div>
        <p className="footer-meta">
          Transportation service · Dommeru, Andhra Pradesh
        </p>
      </footer>
    </div>
  )
}
