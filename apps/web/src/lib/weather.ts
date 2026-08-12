import { business, type DictKey } from '../content'

export type WeatherSnapshot = {
  tempC: number
  labelKey: DictKey
}

type OpenMeteoCurrent = {
  current?: {
    temperature_2m?: number
    weather_code?: number
  }
}

export function weatherLabelKey(code: number): DictKey {
  if (code === 0) return 'wxClear'
  if (code <= 3) return 'wxCloud'
  if (code <= 48) return 'wxFog'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'wxRain'
  if (code >= 71 && code <= 77) return 'wxFog'
  if (code >= 95) return 'wxStorm'
  return 'wxCloud'
}

export async function fetchDommeruWeather(): Promise<WeatherSnapshot | null> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${business.lat}` +
    `&longitude=${business.lng}&current=temperature_2m,weather_code&timezone=Asia%2FKolkata`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = (await res.json()) as OpenMeteoCurrent
  const temp = data.current?.temperature_2m
  const code = data.current?.weather_code
  if (typeof temp !== 'number' || typeof code !== 'number') return null
  return { tempC: Math.round(temp), labelKey: weatherLabelKey(code) }
}

export function formatDommeruTime(lang: 'en' | 'te') {
  return new Intl.DateTimeFormat(lang === 'te' ? 'te-IN' : 'en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date())
}
