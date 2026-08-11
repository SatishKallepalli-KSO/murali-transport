import type { DictKey } from '../content'

type Props = {
  tx: (key: DictKey) => string
  onBack: () => void
  labelKey?: DictKey
}

export function PortalBack({ tx, onBack, labelKey = 'backLabel' }: Props) {
  return (
    <div className="portal-back">
      <button type="button" className="portal-back-btn" onClick={onBack}>
        {tx(labelKey)}
      </button>
    </div>
  )
}
