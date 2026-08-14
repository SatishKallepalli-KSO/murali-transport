import { business } from '../content'

export function resolveUpiId(): string {
  const fromEnv = (import.meta.env.VITE_UPI_ID as string | undefined)?.trim()
  return fromEnv || business.upiId
}

export function resolveUpiName(): string {
  const fromEnv = (import.meta.env.VITE_UPI_NAME as string | undefined)?.trim()
  return fromEnv || business.upiName
}

export function buildUpiPayUrl(opts: {
  amount?: string
  note?: string
}): string {
  const pa = resolveUpiId()
  const pn = resolveUpiName()
  const params = new URLSearchParams({
    pa,
    pn,
    cu: 'INR',
  })
  const amount = (opts.amount || '').trim()
  if (amount && Number(amount) > 0) {
    params.set('am', Number(amount).toFixed(2))
  }
  const note = (opts.note || 'Murali Transport Dommeru').trim()
  if (note) params.set('tn', note.slice(0, 80))
  return `upi://pay?${params.toString()}`
}

/** PhonePe app deep link; falls back gracefully if app missing. */
export function buildPhonePePayUrl(opts: { amount?: string; note?: string }): string {
  const upi = buildUpiPayUrl(opts)
  return upi.replace(/^upi:\/\//, 'phonepe://')
}

export function qrImageUrl(upiUrl: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(upiUrl)}`
}
