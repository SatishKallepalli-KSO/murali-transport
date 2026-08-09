import { useEffect, useState } from 'react'
import type { ActivityItem } from './api'
import { fetchActivity } from './api'

const FLEET = [
  { lane: 18, delay: 0, scale: 1, speed: 28 },
  { lane: 38, delay: 4, scale: 0.85, speed: 34 },
  { lane: 58, delay: 9, scale: 1.1, speed: 22 },
  { lane: 78, delay: 14, scale: 0.75, speed: 40 },
]

export function LorrySky() {
  const [feed, setFeed] = useState<ActivityItem[]>([])

  useEffect(() => {
    let alive = true
    const load = () => {
      fetchActivity()
        .then((items) => {
          if (alive) setFeed(items)
        })
        .catch(() => {
          /* offline ticker still runs with placeholders */
        })
    }
    load()
    const id = window.setInterval(load, 12000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  const ticker =
    feed.length > 0
      ? feed
      : [
          {
            kind: 'load' as const,
            id: 0,
            title: 'Dommeru → Kovvur',
            detail: 'Waiting for first booking…',
            at: '',
          },
        ]

  return (
    <div className="lorry-sky" aria-hidden="true">
      <div className="sky-haze" />
      <div className="sky-road sky-road-far" />
      <div className="sky-road sky-road-near" />

      {FLEET.map((truck) => (
        <div
          key={truck.lane}
          className="sky-truck"
          style={{
            top: `${truck.lane}%`,
            animationDuration: `${truck.speed}s`,
            animationDelay: `-${truck.delay}s`,
            transform: `scale(${truck.scale})`,
          }}
        >
          <span className="sky-cab" />
          <span className="sky-bed" />
          <span className="sky-wheel sky-wheel-a" />
          <span className="sky-wheel sky-wheel-b" />
          <span className="sky-dust" />
        </div>
      ))}

      <div className="booking-ticker">
        <div className="booking-ticker-track">
          {[...ticker, ...ticker].map((item, idx) => (
            <span key={`${item.kind}-${item.id}-${idx}`} className="ticker-chip">
              <em>{item.kind === 'load' ? 'LOAD' : 'LORRY'}</em>
              {item.title}
              <small>{item.detail}</small>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
