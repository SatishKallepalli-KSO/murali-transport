import { useState } from 'react'
import type { DictKey } from '../content'
import {
  buildPhonePePayUrl,
  buildUpiPayUrl,
  qrImageUrl,
  resolveUpiId,
} from '../lib/phonepe'

type Props = {
  tx: (key: DictKey) => string
  note?: string
  compact?: boolean
}

export function PayPhonePe({ tx, note, compact }: Props) {
  const [amount, setAmount] = useState('')
  const [copied, setCopied] = useState(false)
  const upiId = resolveUpiId()

  if (!upiId) return null

  const upiUrl = buildUpiPayUrl({ amount, note })
  const phonePeUrl = buildPhonePePayUrl({ amount, note })

  function openPay() {
    // Prefer PhonePe scheme on mobile; UPI intent works across apps.
    const target = /Android|iPhone|iPad/i.test(navigator.userAgent) ? phonePeUrl : upiUrl
    window.location.href = target
    // Desktop fallback: also try generic UPI after a beat if needed
    window.setTimeout(() => {
      if (target !== upiUrl) window.location.href = upiUrl
    }, 800)
  }

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(upiId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={`pay-phonepe${compact ? ' is-compact' : ''}`}>
      <div className="pay-phonepe-copy">
        <p className="pay-phonepe-kicker">{tx('payPhonePeKicker')}</p>
        <h3>{tx('payPhonePeTitle')}</h3>
        <p>{tx('payPhonePeBody')}</p>
        <label className="pay-phonepe-amount">
          {tx('payAmountLabel')}
          <input
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            placeholder={tx('payAmountPh')}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <div className="pay-phonepe-actions">
          <button type="button" className="btn btn-phonepe" onClick={openPay}>
            {tx('payPhonePeBtn')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => void copyUpi()}>
            {copied ? tx('payCopied') : tx('payCopyUpi')}
          </button>
        </div>
        <p className="pay-phonepe-id">
          UPI: <strong>{upiId}</strong>
        </p>
      </div>
      <figure className="pay-phonepe-qr">
        <img src={qrImageUrl(upiUrl)} alt={tx('payQrAlt')} width={200} height={200} loading="lazy" />
        <figcaption>{tx('payQrHint')}</figcaption>
      </figure>
    </div>
  )
}
