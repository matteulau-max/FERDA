import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import teeData from '../../data/tee-yardages.json'
import courses from '../../data/gps-courses.json'
import { greenDistances } from '../../lib/golfGps'
const HoleMap = lazy(() => import('./HoleMap').then(module => ({ default: module.HoleMap })))

type Fix = { longitude: number; latitude: number; accuracy: number; timestamp: number }
export function GolfGps({ onDistanceChange }: { onDistanceChange: (yards: number | null, target: string) => void }) {
  const [courseId, setCourseId] = useState('dyker')
  const [teeName, setTeeName] = useState('White')
  const [distanceMode, setDistanceMode] = useState<'tee' | 'gps'>('tee')
  const [holeNumber, setHoleNumber] = useState(1)
  const [fix, setFix] = useState<Fix | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [message, setMessage] = useState('Choose your course and hole, then enable GPS.')
  const [now, setNow] = useState(Date.now())
  const watch = useRef<number | null>(null)
  const generation = useRef(0)
  const course = courses.find(c => c.id === courseId)!
  const hole = course.holes.find(h => h.number === holeNumber)!
  const card = (teeData as Record<string, { source: string; sourceLabel: string; tees: Record<string, number[]> }>)[courseId]
  const selectedTee = card.tees[teeName] ? teeName : 'White'
  const teeYards = card.tees[selectedTee][holeNumber - 1]
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
  useEffect(() => {
    onDistanceChange(distanceMode === 'gps' && onCourse ? distances!.center : null, `${courseId}:${holeNumber}`)
  }, [distanceMode, onCourse, distances?.center, courseId, holeNumber, onDistanceChange])
  const status = !enabled ? message : !fix ? message : !fresh ? 'GPS reading stale · waiting for update' : fix.accuracy > 30 ? 'Weak GPS signal · waiting for accuracy' : !onCourse ? 'Check course and hole · target is far away' : `GPS ±${Math.ceil(fix.accuracy / 0.9144)} yd`
  return <section className="rf-gps" aria-label="Automatic golf GPS">
    <div className="rf-gps-selects">
      <label>Course<select value={courseId} onChange={e => setCourseId(e.target.value)}>{courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label>Hole<select value={holeNumber} onChange={e => setHoleNumber(Number(e.target.value))}>{course.holes.map(h => <option key={h.number} value={h.number}>{h.number}</option>)}</select></label>
    </div>
    <div className="rf-gps-selects rf-tee-selects">
      <label>Tee<select value={selectedTee} onChange={e => setTeeName(e.target.value)}>{Object.entries(card.tees).map(([name, yards]) => <option key={name} value={name}>{name} · {yards.reduce((a,b) => a+b, 0).toLocaleString()} yd</option>)}</select></label>
      <label>Yardage from<select value={distanceMode} onChange={e => setDistanceMode(e.target.value as 'tee' | 'gps')}><option value="tee">Selected tee</option><option value="gps">My GPS location</option></select></label>
    </div>
    <Suspense fallback={<p className="rf-map-hint">Loading hole map…</p>}><HoleMap key={`${courseId}:${distanceMode}:${selectedTee}`} courseId={courseId} courseName={course.name} teeLabel={selectedTee} scorecardYards={teeYards} onHoleChange={delta => setHoleNumber(n => Math.max(1, Math.min(18, n + delta)))} hole={hole} position={distanceMode === 'gps' && onCourse ? fix : null} teePreview={distanceMode === 'tee' ? { name: selectedTee, yards: teeYards } : undefined} /></Suspense>
    <div className="rf-gps-status"><span role="status">{distanceMode === 'tee' ? 'Select My GPS location for live front / middle / back yardages.' : status}</span><button onClick={enabled ? () => { stop(); setMessage('GPS stopped.') } : () => { setDistanceMode('gps'); start() }}>{enabled ? 'Stop GPS' : 'Enable GPS'}</button></div>
    <p className="rf-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · <a href={course.source} target="_blank" rel="noopener noreferrer">OpenGolfAPI</a></p>
    <p className="rf-attribution"><a href={card.source} target="_blank" rel="noopener noreferrer">{card.sourceLabel}</a></p>
  </section>
}
