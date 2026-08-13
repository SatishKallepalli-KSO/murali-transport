import { useEffect, useState } from 'react'
import type { DictKey, Lang } from '../content'
import { fetchDommeruWeather, formatDommeruTime, type WeatherSnapshot } from '../lib/weather'

type Props = {
  lang: Lang
  tx: (key: DictKey) => string
}

export function LocalNow({ lang, tx }: Props) {
  const [clock, setClock] = useState(() => formatDommeruTime(lang))
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null)

  useEffect(() => {
    setClock(formatDommeruTime(lang))
    const timer = window.setInterval(() => setClock(formatDommeruTime(lang)), 30_000)
    return () => window.clearInterval(timer)
  }, [lang])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const next = await fetchDommeruWeather()
        if (!cancelled && next) setWeather(next)
      } catch {
        /* time still shows */
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 15 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return (
    <span className="local-now" aria-label={tx('localNow')}>
      <span className="local-now-place">{tx('trustHub')}</span>
      {weather ? (
        <span className="local-now-wx">
          {weather.tempC}° · {tx(weather.labelKey)}
        </span>
      ) : null}
      <span className="local-now-time">{clock}</span>
    </span>
  )
}
