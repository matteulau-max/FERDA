import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import mapData from '../../data/gps-map.json'
import aerialData from '../../data/gps-aerial.json'
import { greenDistances, distanceYards, type Coordinate } from '../../lib/golfGps'
import { holeMapProjection } from '../../lib/holeMap'

import { useCourseWeather } from '../../hooks/useCourseWeather'
import { bearing } from '../../lib/weather'
import { CourseWeather, type ManualWind } from './CourseWeather'

type Layer = { kind: string; polygons: Coordinate[][][] }
type MapData = { lines: Record<string, Coordinate[]>; layers: Layer[] }
type Props = { mapOverride?: MapData; lastHole: number; teeLabel: string; scorecardYards: number | null; onHoleChange: (delta: number) => void; teePreview?: { name: string; yards: number }; courseId: string; courseName: string; hole: { number: number; center: Coordinate; outline: Coordinate[] }; position: { longitude: number; latitude: number; accuracy: number } | null }
const fills: Record<string, string> = { fairway: '#70a453', green: '#9cc76c', tee: '#88b75e', bunker: '#eeddb2', water_hazard: '#579cac' }

export function HoleMap({ mapOverride, lastHole, courseId, courseName, hole, position, teePreview, teeLabel, scorecardYards, onHoleChange }: Props) {
  const data = mapOverride ?? (mapData as Record<string, MapData>)[courseId]
  const line = data.lines[String(hole.number)]
  const weather = useCourseWeather(courseId, data.lines['1'][0])
  const [weatherOpen, setWeatherOpen] = useState(false)
  const [manual, setManual] = useState<ManualWind>({ enabled: false, speed: '10', direction: '0' })
  const manualValid = manual.speed.trim() !== '' && manual.direction.trim() !== '' && Number.isFinite(Number(manual.speed)) && Number(manual.speed) >= 0 && Number(manual.speed) <= 100 && Number.isFinite(Number(manual.direction)) && Number(manual.direction) >= 0 && Number(manual.direction) <= 360
  const wind = manual.enabled ? manualValid ? { speed: Number(manual.speed), direction: Number(manual.direction) } : null : weather.fresh ? weather.data : null
  const [target, setTarget] = useState<Coordinate | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [greenView, setGreenView] = useState(false)
  const [terrain, setTerrain] = useState(true)
  const [rings, setRings] = useState(true)
  const [carry, setCarry] = useState(175)
  const [imageFailed, setImageFailed] = useState(false)
  const uniqueId = useId().replace(/:/g, '')
  const aerial = aerialData[courseId as keyof typeof aerialData]
  const dialog = useRef<HTMLDialogElement>(null)
  const user = position ? [position.longitude, position.latitude] : null
  // Frame follows the golfer, but tapping a target does not change the scale under their finger.
  const projection = useMemo(() => holeMapProjection(line, hole.outline, !greenView && user ? [user] : [], greenView ? [hole.center] : undefined), [line, hole.outline, position?.longitude, position?.latitude, greenView])
  const project = projection.project
  const selected = target ?? hole.center
  const shotOrigin = user ?? line[0]
  const heading = distanceYards(shotOrigin, selected) >= 1 ? bearing(shotOrigin, selected) : null
  const mapWindRotation = wind ? wind.direction + 180 - bearing(line[0], line[line.length - 1]) : 0
  const conditions = (large = false) => weatherOpen && <div id={`${uniqueId}-weather-${large ? 'large' : 'small'}`} onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); setWeatherOpen(false) } }}>
    <button className="rf-weather-close" onClick={() => setWeatherOpen(false)}>Close weather settings</button>
    <CourseWeather {...weather} manual={manual} setManual={setManual} heading={heading} hasPosition={!!user} />
  </div>
  const selectedPoint = project(selected), greenPoint = project(hole.center), teePoint = project(line[0])
  const userPoint = user ? project(user) : null
  const greenYards = user ? greenDistances(user, hole.center, hole.outline) : null
  const yardage = user ? Math.round(distanceYards(user, selected)) : null
  const path = (ring: Coordinate[]) => ring.map((p, i) => `${i ? 'L' : 'M'}${project(p).map(v => v.toFixed(2)).join(',')}`).join(' ') + ' Z'
  const nearbyLayers = useMemo(() => data.layers.filter(layer => layer.polygons.some(poly => poly[0].some(p => {
    const q = project(p); return q[0] > -150 && q[0] < 510 && q[1] > -150 && q[1] < 610
  }))), [data, projection])
  useEffect(() => {
    if (!expanded) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    return () => { document.body.style.overflow = previous }
  }, [expanded])
  useEffect(() => { setTarget(null); setGreenView(false) }, [hole.number])
  function pick(event: MouseEvent<SVGSVGElement>) {
    if (teePreview) return
    const svg = event.currentTarget, matrix = svg.getScreenCTM()
    if (!matrix) return
    const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY
    const q = p.matrixTransform(matrix.inverse())
    setTarget(projection.unproject([Math.max(0, Math.min(360, q.x)), Math.max(0, Math.min(460, q.y))]))
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    if (teePreview) return
    const offsets: Record<string, number[]> = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }
    const delta = offsets[event.key]
    if (delta) { event.preventDefault(); setTarget(projection.unproject([Math.max(0, Math.min(360, selectedPoint[0] + delta[0])), Math.max(0, Math.min(460, selectedPoint[1] + delta[1]))])) }
    if (event.key === 'Escape') setTarget(null)
  }
  function map(large = false) {
    const id = uniqueId + (large ? '-large' : '-small')
    const e = aerial?.extent ?? { xmin: 0, xmax: 0, ymin: 0, ymax: 0 }
    const tl = project([e.xmin, e.ymax]), tr = project([e.xmax, e.ymax]), bl = project([e.xmin, e.ymin])
    const transform = `matrix(${tr[0]-tl[0]} ${tr[1]-tl[1]} ${bl[0]-tl[0]} ${bl[1]-tl[1]} ${tl[0]} ${tl[1]})`
    const route = line.map(p => project(p).join(',')).join(' ')
    const visibleTee = teePoint[1] > 20 && teePoint[1] < 435

    return <svg className="rf-hole-svg" viewBox="0 0 360 460" role="img" aria-label={`${courseName}, hole ${hole.number}. Tap a target or use arrow keys to measure distance.`} tabIndex={0} onClick={pick} onKeyDown={key}>
      <title>{courseName} · Hole {hole.number}</title>
      <defs>
        <pattern id={`${id}-grass`} width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#476d40" /><path d="M1 2l1-1 M4 5l1-1" stroke="#72945b" strokeWidth=".4" opacity=".45" /></pattern>
        <pattern id={`${id}-mown`} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="12" height="24" fill="white" opacity=".09" /></pattern>
        <filter id={`${id}-relief`} x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1.5" dy="2.5" stdDeviation="1.5" floodColor="#172d18" floodOpacity=".5" /></filter>
        <mask id={`${id}-focus`} maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="460">
          <rect width="360" height="460" fill="white" />
          <polyline points={route} fill="none" stroke="black" strokeWidth={Math.max(50, 90 * projection.scale)} strokeLinecap="round" strokeLinejoin="round" />
          <path d={path(hole.outline)} fill="black" stroke="black" strokeWidth={35 * projection.scale} />
        </mask>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#071710" stopOpacity=".42" /><stop offset=".3" stopColor="#071710" stopOpacity="0" /><stop offset=".85" stopColor="#071710" stopOpacity="0" /><stop offset="1" stopColor="#071710" stopOpacity=".5" /></linearGradient>
      </defs>
      <g>
      <rect x="-1000" y="-1000" width="2360" height="2460" fill={terrain || imageFailed ? `url(#${id}-grass)` : '#354c32'} />
      {(terrain || imageFailed) && nearbyLayers.map((layer, i) => <g key={i} fill={fills[layer.kind]} stroke="#304b2b" strokeWidth="0.7" filter={`url(#${id}-relief)`}>{layer.polygons.map((poly, j) => <path key={j} d={poly.map(path).join(' ')} fillRule="evenodd" />)}{['fairway', 'green', 'tee'].includes(layer.kind) && layer.polygons.map((poly, j) => <path key={`stripe-${j}`} d={poly.map(path).join(' ')} fill={`url(#${id}-mown)`} stroke="none" fillRule="evenodd" />)}</g>)}
      {!terrain && aerial && !imageFailed && <image href={aerial.image} x="0" y="0" width="1" height="1" preserveAspectRatio="none" transform={transform} onError={() => setImageFailed(true)} />}
      <rect width="360" height="460" fill="#071710" opacity=".7" mask={`url(#${id}-focus)`} pointerEvents="none" />
      <rect width="360" height="460" fill={`url(#${id}-shade)`} pointerEvents="none" />
      {rings && !teePreview && !greenView && <g fill="none" stroke="#e5f3c5" strokeWidth="1" opacity=".8" pointerEvents="none">{[50, 100, 150, 200, 250].map(yards => {
        const origin = userPoint ?? teePoint, radius = yards * .9144 * projection.scale
        return <g key={yards}><circle cx={origin[0]} cy={origin[1]} r={radius} strokeDasharray="3 5" /><text x={origin[0] + 7} y={origin[1] - radius + 11} fill="white" stroke="#243b2b" strokeWidth="2.5" paintOrder="stroke" fontSize="10">{yards} yd</text></g>
      })}<circle cx={(userPoint ?? teePoint)[0]} cy={(userPoint ?? teePoint)[1]} r={carry * .9144 * projection.scale} stroke="#e4ed8d" strokeWidth="2" /><text x={(userPoint ?? teePoint)[0] - 7} y={(userPoint ?? teePoint)[1] - carry * .9144 * projection.scale - 5} textAnchor="end" fill="#f5ffc4" stroke="#243b2b" strokeWidth="3" paintOrder="stroke" fontSize="11">Carry {carry}</text></g>}
      <polyline points={route} stroke="white" strokeWidth="1.2" strokeDasharray="3 6" fill="none" opacity=".65" />
      <path d={path(hole.outline)} fill="#b8d86c" fillOpacity=".12" stroke="#d7ed9a" strokeWidth="1.1" />
      {visibleTee && <><circle cx={teePoint[0]} cy={teePoint[1]} r="5" fill="#14231d" stroke="white" strokeWidth="2" /><text x={teePoint[0]} y={teePoint[1] + 19} textAnchor="middle" className="rf-map-label">{teePreview ? 'MAPPED TEE' : 'TEE'}</text></>}
      <g transform={`translate(${greenPoint[0]},${greenPoint[1]})`}><circle r="5" fill="#122b20" stroke="white" strokeWidth="1.5" /><path d="M0,0 V-21 L13,-17 L0,-13" fill="#d2ed77" stroke="#d2ed77" strokeWidth="1.4" /></g>
      {userPoint && <>
        <line x1={userPoint[0]} y1={userPoint[1]} x2={selectedPoint[0]} y2={selectedPoint[1]} stroke="white" strokeWidth="2" />
        <circle cx={userPoint[0]} cy={userPoint[1]} r={position!.accuracy * projection.scale} fill="#3185d9" fillOpacity=".13" stroke="#3185d9" strokeOpacity=".35" />
        <circle cx={userPoint[0]} cy={userPoint[1]} r="6" fill="#267aca" stroke="white" strokeWidth="2.5" />
        <text x={userPoint[0]} y={userPoint[1] + 21} textAnchor="middle" className="rf-map-label">YOU</text>
      </>}
      {target && <g stroke="white" strokeWidth="1.5"><circle cx={selectedPoint[0]} cy={selectedPoint[1]} r="11" fill="#0e241b" fillOpacity=".55" /><path d={`M${selectedPoint[0]-11},${selectedPoint[1]}h22 M${selectedPoint[0]},${selectedPoint[1]-11}v22`} /></g>}
      </g>
      <g transform="translate(332 27)" stroke="white" fill="white"><line x2={projection.north[0] * 13} y2={projection.north[1] * 13} strokeWidth="2" /><circle r="2" /><text x={projection.north[0] * 22} y={projection.north[1] * 22 + 3} textAnchor="middle" stroke="none" fontSize="10">N</text></g>
      {userPoint && yardage !== null && <g transform={`translate(${Math.max(35, Math.min(325,(userPoint[0]+selectedPoint[0])/2))},${Math.max(30,Math.min(425,(userPoint[1]+selectedPoint[1])/2))})`}><rect x="-29" y="-14" width="58" height="28" rx="14" fill="#11221c" stroke="white" /><text textAnchor="middle" y="5" fill="white" fontSize="15" fontWeight="700">{yardage}</text></g>}
      <text x="14" y="442" opacity="0" fontSize="10" fill="white">{terrain || imageFailed ? 'Illustrated · mapped features' : 'Aerial'} · {greenView ? 'Green view' : 'Selected hole'} · Hole {hole.number}</text>
    </svg>
  }
  function overlay(large = false) {
    return <>
      <button type="button" className="rf-wind-arrow" aria-label="Weather and wind settings" aria-expanded={weatherOpen} aria-controls={`${uniqueId}-weather-${large ? 'large' : 'small'}`} onClick={() => setWeatherOpen(open => !open)}>
        <span aria-hidden="true" style={{ transform: `rotate(${mapWindRotation}deg)` }}>{wind ? wind.speed < 0.5 ? '○' : '↑' : '—'}</span>
        <b>{wind ? `${Math.round(wind.speed)} mph` : 'Wind —'} · {weather.fresh && weather.data ? `${Math.round(weather.data.temperature)}°F` : '—°F'}</b>
        <small>{manual.enabled ? 'Manual wind' : weather.data && !weather.fresh ? 'Weather stale' : 'Forecast wind'}</small>
      </button>
      <div className="rf-map-hole-banner"><div><button aria-label="Previous hole" disabled={hole.number === 1} onClick={() => onHoleChange(-1)}>‹</button><span><small>{courseName}</small><strong>⚑ Hole {hole.number}</strong></span><button aria-label="Next hole" disabled={hole.number === lastHole} onClick={() => onHoleChange(1)}>›</button></div><p>{scorecardYards === null ? "GPS map · tee scorecard unavailable" : <>{teeLabel} tees <b>· {scorecardYards} yd</b></>}</p></div>
      <div className="rf-map-yardage-hud" aria-label={teePreview ? 'Selected tee yardage' : 'GPS green yardages'}>
        <small>{teePreview ? `${teePreview.name} tees` : 'GPS · yards'}</small>
        {teePreview ? <><strong>{teePreview.yards}<em> yd</em></strong><small>Scorecard</small></> : <>{(['back', 'center', 'front'] as const).map(k => <div key={k} className={k === 'center' ? 'rf-hud-middle' : ''}><span>{k === 'center' ? 'Middle' : k === 'back' ? 'Back' : 'Front'}</span><b>{greenYards?.[k] != null ? Math.round(greenYards[k]!) : '—'}</b></div>)}{!greenYards && <small>Waiting for GPS</small>}</>}
      </div>
      {!teePreview && target && <div className="rf-map-target-hud"><small>To target</small><strong>{yardage ?? '—'} yd</strong><small>Then {Math.round(distanceYards(target, hole.center))} yd to middle</small><button onClick={() => setTarget(null)}>Reset target</button></div>}
    </>
  }
  function controls() {
    return <div className="rf-map-tools">
      <button disabled={!aerial} onClick={() => setTerrain(!terrain)}>{!aerial ? 'No aerial imagery' : terrain ? 'Aerial view' : 'Illustrated view'}</button>
      <button disabled={!!teePreview} aria-pressed={rings && !teePreview} onClick={() => setRings(!rings)}>Rings {rings && !teePreview ? 'on' : 'off'}</button>
      {rings && !teePreview && <label>Carry <input aria-label="Carry distance in yards" type="number" min="25" max="350" step="5" value={carry} onChange={e => setCarry(Math.max(25, Math.min(350, Number(e.target.value) || 25)))} /> yd</label>}
      <small>{teePreview ? 'Map tee is a reference point; tee-color positions are not surveyed. Use GPS for rings and target distances.' : rings ? `Rings from ${user ? 'your GPS position' : 'tee · enable GPS for your position'}` : 'Tap the map to choose a target'}</small>
    </div>
  }
  return <section className="rf-hole-map" aria-label="Hole map">
    <div className="rf-map-heading"><span>HOLE {hole.number} <small>GPS MAP</small></span><button onClick={() => setExpanded(true)} aria-label="Expand hole map">Expand ↗</button></div>
    <div className="rf-map-stage">{map()}{overlay()}<button className="rf-map-view-toggle" onClick={() => { setGreenView(!greenView) }}>{greenView ? 'Whole hole' : 'Focus green'}</button></div>{conditions()}{controls()}
    <p className="rf-map-hint">{teePreview ? 'Selected tee yardage shown above' : 'Tap a landing spot to measure'}{!position ? ' · Course overview' : ' · Blue circle shows GPS uncertainty'}</p>
    {aerial && <p className="rf-map-credit"><a href="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer" target="_blank" rel="noopener noreferrer">Aerial: USDA / USGS</a> · Historical imagery</p>}
    {expanded && createPortal(<dialog ref={dialog} className="rf-map-dialog" onCancel={e => { e.preventDefault(); setExpanded(false) }}>
      <div className="rf-map-heading"><span>{courseName} · Hole {hole.number}</span><button autoFocus onClick={() => setExpanded(false)}>Close map</button></div>
        <div className="rf-map-stage">{map(true)}{overlay(true)}<button className="rf-map-view-toggle" onClick={() => { setGreenView(!greenView) }}>{greenView ? 'Whole hole' : 'Focus green'}</button></div>{conditions(true)}{controls()}
      <p className="rf-map-hint">{teePreview ? 'Course overview · Enable GPS for target distances' : 'Tap a landing spot'} · Camera slope remains aimed at the green’s middle.</p>
      <p className="rf-map-hint">{aerial ? 'Historical aerial imagery: USDA / USGS · ' : ''}<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · OpenGolfAPI</p>
    </dialog>, document.body)}
  </section>
}
