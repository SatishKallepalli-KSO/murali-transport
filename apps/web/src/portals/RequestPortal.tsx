import type { FormEvent } from 'react'
import { business, type DictKey } from '../content'
import { todayISO } from '../lib/format'

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
  tx: (key: DictKey) => string
  loadForm: LoadFormState
  setLoadForm: (next: LoadFormState) => void
  busy: boolean
  onCreateLoad: (event: FormEvent) => void
}

export function RequestPortal({ tx, loadForm, setLoadForm, busy, onCreateLoad }: Props) {
  return (
    <section className="portal">
      <div className="section-head">
        <h2>{tx('postTitle')}</h2>
        <p>{tx('postIntro')}</p>
      </div>
      <form className="panel-form" onSubmit={onCreateLoad}>
        <label>
          {tx('name')}
          <input
            required
            value={loadForm.requestor_name}
            onChange={(e) => setLoadForm({ ...loadForm, requestor_name: e.target.value })}
          />
        </label>
        <label>
          {tx('phone')}
          <input
            required
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
            placeholder="Dommeru"
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
        </div>
      </form>
    </section>
  )
}
