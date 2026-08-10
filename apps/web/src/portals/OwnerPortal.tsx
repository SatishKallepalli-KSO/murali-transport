import type { FormEvent } from 'react'
import type { DictKey } from '../content'

export type VehicleFormState = {
  owner_name: string
  owner_phone: string
  driver_name: string
  driver_phone: string
  plate_number: string
  vehicle_type: string
  capacity_tons: string
  current_location: string
  notes: string
}

type Props = {
  tx: (key: DictKey) => string
  vehicleForm: VehicleFormState
  setVehicleForm: (next: VehicleFormState) => void
  busy: boolean
  onRegisterVehicle: (event: FormEvent) => void
}

export function OwnerPortal({ tx, vehicleForm, setVehicleForm, busy, onRegisterVehicle }: Props) {
  return (
    <section className="portal">
      <div className="section-head">
        <h2>{tx('ownerTitle')}</h2>
        <p>{tx('ownerIntro')}</p>
      </div>
      <form className="panel-form" onSubmit={onRegisterVehicle}>
        <label>
          {tx('ownerName')}
          <input
            required
            value={vehicleForm.owner_name}
            onChange={(e) => setVehicleForm({ ...vehicleForm, owner_name: e.target.value })}
          />
        </label>
        <label>
          {tx('ownerPhone')}
          <input
            required
            value={vehicleForm.owner_phone}
            onChange={(e) => setVehicleForm({ ...vehicleForm, owner_phone: e.target.value })}
          />
        </label>
        <label>
          {tx('driverName')}
          <input
            required
            value={vehicleForm.driver_name}
            onChange={(e) => setVehicleForm({ ...vehicleForm, driver_name: e.target.value })}
          />
        </label>
        <label>
          {tx('driverPhone')}
          <input
            required
            value={vehicleForm.driver_phone}
            onChange={(e) => setVehicleForm({ ...vehicleForm, driver_phone: e.target.value })}
          />
        </label>
        <label>
          {tx('plate')}
          <input
            required
            value={vehicleForm.plate_number}
            onChange={(e) => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })}
            placeholder="AP39XX1234"
          />
        </label>
        <label>
          {tx('vehicleType')}
          <select
            value={vehicleForm.vehicle_type}
            onChange={(e) => setVehicleForm({ ...vehicleForm, vehicle_type: e.target.value })}
          >
            <option value="mini_lorry">{tx('mini')}</option>
            <option value="truck">{tx('truck')}</option>
            <option value="trailer">{tx('trailer')}</option>
          </select>
        </label>
        <label>
          {tx('capacity')}
          <input
            required
            type="number"
            min="0.5"
            step="0.5"
            value={vehicleForm.capacity_tons}
            onChange={(e) => setVehicleForm({ ...vehicleForm, capacity_tons: e.target.value })}
          />
        </label>
        <label>
          {tx('currentLoc')}
          <input
            required
            value={vehicleForm.current_location}
            onChange={(e) => setVehicleForm({ ...vehicleForm, current_location: e.target.value })}
          />
        </label>
        <label className="span-2">
          {tx('notes')}
          <textarea
            rows={3}
            value={vehicleForm.notes}
            onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
          />
        </label>
        <div className="form-actions span-2">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? tx('saving') : tx('registerBtn')}
          </button>
        </div>
      </form>
    </section>
  )
}
