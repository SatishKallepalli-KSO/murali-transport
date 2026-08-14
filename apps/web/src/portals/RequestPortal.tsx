import type { FormEvent } from 'react'
import { PayPhonePe } from '../components/PayPhonePe'
import { business, type DictKey, type Lang } from '../content'
import { todayISO } from '../lib/format'
import { waHref } from '../lib/whatsapp'

export type LoadFormState = {
  requestor_name: string
  requestor_phone: string
  pickup: string
  dropoff: string
  cargo: string
  weight_tons: string
  vehicle_preference: string
  preferred_date: string
  notes: string
}

type Props = {
  lang: Lang
  tx: (key: DictKey) => string
  loadForm: LoadFormState
  setLoadForm: (next: LoadFormState) => void
  busy: boolean
  onCreateLoad: (event: FormEvent) => void
}

export function RequestPortal({ lang, tx, loadForm, setLoadForm, busy, onCreateLoad }: Props) {
  return (
    <section className="portal">
      <div className="section-head">
        <h2>{tx('postTitle')}</h2>
        <p>{tx('postIntro')}</p>
      </div>
      <div className="form-shell">
        <form className="panel-form" onSubmit={onCreateLoad}>
          <label>
            {tx('name')}
            <input
              required
              autoComplete="name"
              value={loadForm.requestor_name}
              onChange={(e) => setLoadForm({ ...loadForm, requestor_name: e.target.value })}
            />
          </label>
          <label>
            {tx('phone')}
            <input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={loadForm.requestor_phone}
              onChange={(e) => setLoadForm({ ...loadForm, requestor_phone: e.target.value })}
            />
          </label>
          <label>
            {tx('pickup')}
            <input
              required
              value={loadForm.pickup}
              onChange={(e) => setLoadForm({ ...loadForm, pickup: e.target.value })}
              placeholder={tx('findPickupPh')}
            />
          </label>
          <label>
            {tx('dropoff')}
            <input
              required
              value={loadForm.dropoff}
              onChange={(e) => setLoadForm({ ...loadForm, dropoff: e.target.value })}
            />
          </label>
          <label>
            {tx('cargo')}
            <input
              required
              value={loadForm.cargo}
              onChange={(e) => setLoadForm({ ...loadForm, cargo: e.target.value })}
            />
          </label>
          <label>
            {tx('weight')}
            <input
              required
              type="number"
              min="0.1"
              step="0.1"
              value={loadForm.weight_tons}
              onChange={(e) => setLoadForm({ ...loadForm, weight_tons: e.target.value })}
            />
          </label>
          <label>
            {tx('vehiclePref')}
            <select
              value={loadForm.vehicle_preference}
              onChange={(e) => setLoadForm({ ...loadForm, vehicle_preference: e.target.value })}
            >
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
            <textarea
              rows={3}
              value={loadForm.notes}
              onChange={(e) => setLoadForm({ ...loadForm, notes: e.target.value })}
            />
          </label>
          <div className="form-actions span-2">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? tx('posting') : tx('submitLoad')}
            </button>
            <a className="btn btn-ghost" href={`tel:${business.phone}`}>
              {tx('callNow')}
            </a>
            <a className="btn btn-ghost" href={waHref(lang)} target="_blank" rel="noreferrer">
              {tx('whatsapp')}
            </a>
          </div>
        </form>
        <aside className="form-aside">
          <p className="form-aside-kicker">{tx('hours')}</p>
          <p>{tx('formOfficeNote')}</p>
          <PayPhonePe tx={tx} note="Murali Transport load booking" compact />
        </aside>
      </div>
    </section>
  )
}
