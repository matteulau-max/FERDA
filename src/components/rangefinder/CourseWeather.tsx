import type { Conditions } from '../../lib/weather'
import { windComponents } from '../../lib/weather'
export type ManualWind = { enabled: boolean; speed: string; direction: string }
export function CourseWeather({ data, fresh, message, retry, manual, setManual, heading, hasPosition }: {
  data: Conditions | null; fresh: boolean; message: string; retry: () => void; manual: ManualWind; setManual: (value: ManualWind) => void; heading: number | null; hasPosition: boolean
}) {
  const valid = manual.speed.trim() !== '' && manual.direction.trim() !== '' && Number.isFinite(Number(manual.speed)) && Number(manual.speed) >= 0 && Number(manual.speed) <= 100 && Number.isFinite(Number(manual.direction)) && Number(manual.direction) >= 0 && Number(manual.direction) <= 360
  const wind = manual.enabled ? valid ? { speed: Number(manual.speed), direction: Number(manual.direction) } : null : fresh ? data : null
  const parts = wind && heading !== null ? windComponents(wind.speed, wind.direction, heading) : null
  return <section className="rf-weather" aria-label="Course weather">
    <div className="rf-weather-summary"><strong>{data ? `${Math.round(data.temperature)}°F` : 'Weather'}</strong><span>{wind ? `${Math.round(wind.speed)} mph ${manual.enabled ? '· manual' : ''}` : 'Wind —'}</span><span>{fresh && !manual.enabled && data ? `Gusts ${Math.round(data.gusts)} mph` : ''}</span><span>{data ? `${Math.round(data.elevation).toLocaleString()} ft altitude` : ''}</span></div>
    <p>{parts ? `${Math.abs(parts.head).toFixed(1)} mph ${parts.head >= 0 ? 'headwind' : 'tailwind'} · ${Math.abs(parts.right).toFixed(1)} mph ${parts.right >= 0 ? 'left → right' : 'right → left'}` : 'Wind breakdown unavailable.'} {parts && (hasPosition ? 'To selected target.' : 'Reference tee → target (enable GPS for your shot).')}</p>
    <small>{data ? `${fresh ? 'Forecast' : 'Stale forecast'}: ${new Date(data.time).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}. ` : ''}Altitude is modeled ground elevation above sea level, not slope to the green.</small>
    {message && <p role="status">{message} <button onClick={retry}>Retry</button></p>}
    <details open><summary>Adjust wind</summary><label><input type="checkbox" checked={manual.enabled} onChange={e => setManual({ ...manual, enabled: e.target.checked })} /> Use my wind reading</label>
      {manual.enabled && <div className="rf-weather-inputs"><label>Speed (mph)<input type="number" min="0" max="100" step="1" value={manual.speed} onChange={e => setManual({ ...manual, speed: e.target.value })} /></label><label>Wind FROM (° true)<input type="number" min="0" max="360" step="1" value={manual.direction} onChange={e => setManual({ ...manual, direction: e.target.value })} /></label><small>0° north · 90° east · 180° south · 270° west. {!valid && 'Enter 0–100 mph and 0–360°.'}</small></div>}
    </details><small><a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather: Open-Meteo</a> · Modeled 10 m wind; trees and local gusts vary. Course coordinates are shared with the provider. Yardages are not weather-adjusted.</small>
  </section>
}
