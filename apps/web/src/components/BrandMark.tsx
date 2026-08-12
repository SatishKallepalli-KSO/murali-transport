import { useId } from 'react'

type Props = {
  className?: string
  title?: string
}

export function BrandMark({ className, title = 'Murali Transport' }: Props) {
  const raw = useId().replace(/:/g, '')
  const bg = `mt-bg-${raw}`
  const gold = `mt-gold-${raw}`

  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label={title}>
      <defs>
        <linearGradient id={bg} x1="10" y1="6" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a4a78" />
          <stop offset="100%" stopColor="#0b2a4a" />
        </linearGradient>
        <linearGradient id={gold} x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffd089" />
          <stop offset="55%" stopColor="#ef8b2e" />
          <stop offset="100%" stopColor="#c45e0c" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${bg})`} />
      <path
        d="M13.5 46.5V17.5h8.1L32 39.2 42.4 17.5h8.1v29H43.8V30.2L33.9 48.2h-3.8L20.2 30.2v16.3H13.5z"
        fill={`url(#${gold})`}
      />
      <path d="M12 51.5h40" stroke="#ef8b2e" strokeWidth="2.6" strokeLinecap="round" />
      <path
        d="M36.5 56.2h12.2v-3.1h-3.4l-1.7-2.3H36.5v5.4z"
        fill="#ffc57a"
      />
      <circle cx="39.2" cy="56.2" r="1.15" fill="#0b2a4a" />
      <circle cx="45.6" cy="56.2" r="1.15" fill="#0b2a4a" />
    </svg>
  )
}
