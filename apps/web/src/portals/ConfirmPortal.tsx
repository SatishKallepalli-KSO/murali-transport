import { PayPhonePe } from '../components/PayPhonePe'
import type { DictKey } from '../content'

type ConfirmPortalProps = {
  title: string
  message: string
  primaryLabel: string
  secondaryLabel: string
  onPrimary: () => void
  onSecondary: () => void
  callLabel: string
  callHref: string
  tx: (key: DictKey) => string
  payNote?: string
}

export function ConfirmPortal({
  title,
  message,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  callLabel,
  callHref,
  tx,
  payNote,
}: ConfirmPortalProps) {
  return (
    <section className="confirm-page" aria-live="polite">
      <div className="confirm-card">
        <p className="confirm-kicker" aria-hidden="true">
          ✓
        </p>
        <h1>{title}</h1>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="btn btn-primary" onClick={onPrimary}>
            {primaryLabel}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onSecondary}>
            {secondaryLabel}
          </button>
          <a className="btn btn-ghost" href={callHref}>
            {callLabel}
          </a>
        </div>
        <PayPhonePe tx={tx} note={payNote} />
      </div>
    </section>
  )
}
