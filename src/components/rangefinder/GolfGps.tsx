import { useEffect, useRef, useState } from 'react'
import courses from '../../data/gps-courses.json'
import { greenDistances } from '../../lib/golfGps'

type Fix = { longitude: number; latitude: number; accuracy: number; timestamp: number }
export function GolfGps() {
  const [courseId, setCourseId] = useState('dyker')
  const [holeNumber, setHoleNumber] = useState(1)
  const [fix, setFix] = useState<Fix | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('Choose your course and hole, then enable GPS.')
  const [now, setNow] = useState(Date.now())
  const watch = useRef<number | null>(null)
  const generation = useRef(0)
  const course = courses.find(c => c.id === courseId)!
  const hole = course.holes.find(h => h.number === holeNumber)!
  const age = fix ? Math.max(0, now - fix.timestamp) : Infinity
  const fresh = age <= 15000
  const usable = !!fix && fresh && fix.accuracy <= 30
  const distances = usable ? greenDistances([fix.longitude, fix.latitude], hole.center, hole.outline) : null
  const onCourse = distances !== null && distances.center <= 1500
  function stop() {
    generation.current++
    if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
    watch.current = null; setEnabled(false); setFix(null)
  }
  function start() {
    stop()
    if (!navigator.geolocation || !window.isSecureContext) { setMessage('GPS needs Safari over HTTPS and location access.'); return }
    const request = generation.current
    setEnabled(true); setMessage('Waiting for a location fix…')
    watch.current = navigator.geolocation.watchPosition(p => {
      if (request !== generation.current) return
      setFix({ longitude: p.coords.longitude, latitude: p.coords.latitude, accuracy: p.coords.accuracy, timestamp: p.timestamp })
      setNow(Date.now()); setMessage('GPS connected. Yardages update as you move.')
    }, error => {
      if (request !== generation.current) return
      if (error.code === 1) { stop(); setMessage('Location denied. Allow location for Ferda in Safari’s website settings, then retry.') }
      else { setFix(null); setMessage(error.code === 3 ? 'Location timed out. Try outdoors with a clear view of the sky.' : 'Location unavailable. Try outdoors, then retry.') }
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 })
  }
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    const pause = () => { if (document.hidden) { stop(); setMessage('GPS paused. Enable GPS when you return.') } }
    document.addEventListener('visibilitychange', pause)
    return () => {
      generation.current++
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current)
      window.clearInterval(timer); document.removeEventListener('visibilitychange', pause)
    }
  }, [])
  const display = (value: number | null | undefined) => onCourse && value != null ? Math.round(value) : '—'
  return <section className="rf-gps" aria-label="Automatic golf GPS">
    <h2>Automatic GPS <span className="rf-manual">Field test</span></h2>
    <div className="rf-gps-selects">
      <label>Course<select value={courseId} onChange={e => setCourseId(e.target.value)}>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Hole<select value={holeNumber} onChange={e => setHoleNumber(Number(e.target.value))}>{course.holes.map(h => <option key={h.number} value={h.number}>{h.number}</option>)}</select></label>
    </div>
    <button onClick={enabled ? () => { stop(); setMessage('GPS stopped.') } : start}>{enabled ? 'Stop GPS' : 'Enable GPS'}</button>
    <p role="status">{message}</p>
    {fix && <p className="rf-subtle">Reported accuracy ±{Math.ceil(fix.accuracy / 0.9144)} yd · {Math.floor(age / 1000)}s old{!fresh ? ' · Stale reading' : fix.accuracy > 30 ? ' · Weak location signal' : ''}</p>}
    {usable && !onCourse && <p>You appear far from this hole. Check the selected course and hole.</p>}
    <div className="rf-gps-distances" aria-live="off">
      <div>Front<strong>{display(distances?.front)}</strong></div><div>Center<strong>{display(distances?.center)}</strong></div><div>Back<strong>{display(distances?.back)}</strong></div>
    </div>
    <p className="rf-subtle">Yards to the mapped green, not today’s flag. Front/back follow your approach through its center. Select each hole manually. Keep Ferda open for updates.</p>
    <p className="rf-subtle">For tomorrow’s test, compare center yardage from the same spot in TheGrint or 18Birdies. GPS positions stay on this phone.</p>
    <details><summary>Map source and accuracy</summary><p>OpenStreetMap green outlines via OpenGolfAPI, checked October 4, 2026. All 18 hole paths match distinct greens on each course. Mapping and phone accuracy need on-course verification. Missing or weak GPS readings show dashes.</p><p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a> · <a href={course.source} target="_blank" rel="noopener noreferrer">Source data via OpenGolfAPI</a></p></details>
  </section>
}
