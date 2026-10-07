import { useEffect, useState } from 'react'
import { parseConditions, type Conditions } from '../lib/weather'
const cache = new Map<string, { data: Conditions; fetched: number }>()
export function useCourseWeather(courseId: string, location: number[]) {
  const [data, setData] = useState<Conditions | null>(null)
  const [message, setMessage] = useState('Loading course weather…')
  const [refresh, setRefresh] = useState(0)
  const [now, setNow] = useState(Date.now())
  const lon = location[0].toFixed(3), lat = location[1].toFixed(3)
  useEffect(() => {
    const timer = window.setInterval(() => { setNow(Date.now()); setRefresh(n => n + 1) }, 600000)
    const tick = window.setInterval(() => setNow(Date.now()), 30000)
    return () => { clearInterval(timer); clearInterval(tick) }
  }, [])
  useEffect(() => {
    const saved = cache.get(courseId)
    setData(saved?.data ?? null)
    if (saved && Date.now() - saved.fetched < 600000) { setMessage(''); return }
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    let active = true
    setMessage('Updating course weather…')
    const params = new URLSearchParams({ latitude: lat, longitude: lon, current: 'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m', temperature_unit: 'fahrenheit', wind_speed_unit: 'mph', timeformat: 'unixtime' })
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal }).then(r => {
      if (!r.ok) throw new Error('Weather service unavailable.')
      return r.json()
    }).then(raw => {
      const parsed = parseConditions(raw)
      if (!active) return
      cache.set(courseId, { data: parsed, fetched: Date.now() }); setData(parsed); setNow(Date.now()); setMessage('')
    }).catch(() => { if (active) setMessage('Weather unavailable. Retry or enter wind manually.') }).finally(() => clearTimeout(timeout))
    return () => { active = false; controller.abort(); clearTimeout(timeout) }
  }, [courseId, lat, lon, refresh])
  const fresh = !!data && now - data.time < 90 * 60000 && data.time - now < 15 * 60000
  return { data, fresh, message, retry: () => { cache.delete(courseId); setRefresh(n => n + 1) } }
}
