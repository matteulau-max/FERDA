import { useEffect, useId, useMemo, useRef, useState, type MouseEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import mapData from '../../data/gps-map.json'
import aerialData from '../../data/gps-aerial.json'
import { distanceYards, type Coordinate } from '../../lib/golfGps'
import { holeMapProjection } from '../../lib/holeMap'

type Layer = { kind: string; polygons: Coordinate[][][] }
type MapData = { lines: Record<string, Coordinate[]>; layers: Layer[] }
type Props = { courseId: string; courseName: string; hole: { number: number; center: Coordinate; outline: Coordinate[] }; position: { longitude: number; latitude: number; accuracy: number } | null }
const fills: Record<string, string> = { fairway: '#b8cf99', green: '#84af77', tee: '#a7bf8b', bunker: '#edd7a6', water_hazard: '#a1ccd2' }

export function HoleMap({ courseId, courseName, hole, position }: Props) {
  const data = (mapData as Record<string, MapData>)[courseId]
  const line = data.lines[String(hole.number)]
  const [target, setTarget] = useState<Coordinate | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [greenView, setGreenView] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const uniqueId = useId().replace(/:/g, '')
  const aerial = aerialData[courseId as keyof typeof aerialData]
  const dialog = useRef<HTMLDialogElement>(null)
  const user = position ? [position.longitude, position.latitude] : null
  // Frame follows the golfer, but tapping a target does not change the scale under their finger.
  const projection = useMemo(() => holeMapProjection(line, hole.outline, !greenView && user ? [user] : [], greenView ? [hole.center] : undefined), [line, hole.outline, position?.longitude, position?.latitude, greenView])
  const project = projection.project
  const selected = target ?? hole.center
  const selectedPoint = project(selected), greenPoint = project(hole.center), teePoint = project(line[0])
  const userPoint = user ? project(user) : null
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
  function pick(event: MouseEvent<SVGSVGElement>) {
    const svg = event.currentTarget, matrix = svg.getScreenCTM()
    if (!matrix) return
    const p = svg.createSVGPoint(); p.x = event.clientX; p.y = event.clientY
    const q = p.matrixTransform(matrix.inverse())
    setTarget(projection.unproject([Math.max(0, Math.min(360, q.x)), Math.max(0, Math.min(460, q.y))]))
  }
  function key(event: KeyboardEvent<SVGSVGElement>) {
    const offsets: Record<string, number[]> = { ArrowLeft: [-5, 0], ArrowRight: [5, 0], ArrowUp: [0, -5], ArrowDown: [0, 5] }
    const delta = offsets[event.key]
    if (delta) { event.preventDefault(); setTarget(projection.unproject([Math.max(0, Math.min(360, selectedPoint[0] + delta[0])), Math.max(0, Math.min(460, selectedPoint[1] + delta[1]))])) }
    if (event.key === 'Escape') setTarget(null)
  }
  function map(large = false) {
    const id = uniqueId + (large ? '-large' : '-small')
    const e = aerial.extent
    const tl = project([e.xmin, e.ymax]), tr = project([e.xmax, e.ymax]), bl = project([e.xmin, e.ymin])
    const transform = `matrix(${tr[0]-tl[0]} ${tr[1]-tl[1]} ${bl[0]-tl[0]} ${bl[1]-tl[1]} ${tl[0]} ${tl[1]})`
    const route = line.map(p => project(p).join(',')).join(' ')
    const visibleTee = teePoint[1] > 20 && teePoint[1] < 435

    return <svg className="rf-hole-svg" viewBox="0 0 360 460" role="img" aria-label={`${courseName}, hole ${hole.number}. Tap a target or use arrow keys to measure distance.`} tabIndex={0} onClick={pick} onKeyDown={key}>
      <title>{courseName} · Hole {hole.number}</title>
      <defs>
        <mask id={`${id}-focus`} maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="460">
          <rect width="360" height="460" fill="white" />
          <polyline points={route} fill="none" stroke="black" strokeWidth={Math.max(50, 90 * projection.scale)} strokeLinecap="round" strokeLinejoin="round" />
          <path d={path(hole.outline)} fill="black" stroke="black" strokeWidth={35 * projection.scale} />
        </mask>
        <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#071710" stopOpacity=".42" /><stop offset=".3" stopColor="#071710" stopOpacity="0" /><stop offset=".85" stopColor="#071710" stopOpacity="0" /><stop offset="1" stopColor="#071710" stopOpacity=".5" /></linearGradient>
      </defs>
      <rect width="360" height="460" fill="#354c32" />
      {imageFailed && nearbyLayers.map((layer, i) => <g key={i} fill={fills[layer.kind]} stroke="#44603c" strokeWidth="0.5">{layer.polygons.map((poly, j) => <path key={j} d={poly.map(path).join(' ')} fillRule="evenodd" />)}</g>)}
      {!imageFailed && <image href={aerial.image} x="0" y="0" width="1" height="1" preserveAspectRatio="none" transform={transform} onError={() => setImageFailed(true)} />}
      <rect width="360" height="460" fill="#071710" opacity=".7" mask={`url(#${id}-focus)`} pointerEvents="none" />
      <rect width="360" height="460" fill={`url(#${id}-shade)`} pointerEvents="none" />
      <polyline points={route} stroke="white" strokeWidth="1.2" strokeDasharray="3 6" fill="none" opacity=".65" />
      <path d={path(hole.outline)} fill="#b8d86c" fillOpacity=".12" stroke="#d7ed9a" strokeWidth="1.1" />
      {visibleTee && <><circle cx={teePoint[0]} cy={teePoint[1]} r="5" fill="#14231d" stroke="white" strokeWidth="2" /><text x={teePoint[0]} y={teePoint[1] + 19} textAnchor="middle" className="rf-map-label">TEE</text></>}
      <g transform={`translate(${greenPoint[0]},${greenPoint[1]})`}><circle r="5" fill="#122b20" stroke="white" strokeWidth="1.5" /><path d="M0,0 V-21 L13,-17 L0,-13" fill="#d2ed77" stroke="#d2ed77" strokeWidth="1.4" /></g>
      {userPoint && <>
        <line x1={userPoint[0]} y1={userPoint[1]} x2={selectedPoint[0]} y2={selectedPoint[1]} stroke="white" strokeWidth="2" />
        <circle cx={userPoint[0]} cy={userPoint[1]} r={position!.accuracy * projection.scale} fill="#3185d9" fillOpacity=".13" stroke="#3185d9" strokeOpacity=".35" />
        <circle cx={userPoint[0]} cy={userPoint[1]} r="6" fill="#267aca" stroke="white" strokeWidth="2.5" />
        <text x={userPoint[0]} y={userPoint[1] + 21} textAnchor="middle" className="rf-map-label">YOU</text>
      </>}
      {target && <g stroke="white" strokeWidth="1.5"><circle cx={selectedPoint[0]} cy={selectedPoint[1]} r="11" fill="#0e241b" fillOpacity=".55" /><path d={`M${selectedPoint[0]-11},${selectedPoint[1]}h22 M${selectedPoint[0]},${selectedPoint[1]-11}v22`} /></g>}
      <g transform="translate(332 27)" stroke="white" fill="white"><line x2={projection.north[0] * 13} y2={projection.north[1] * 13} strokeWidth="2" /><circle r="2" /><text x={projection.north[0] * 22} y={projection.north[1] * 22 + 3} textAnchor="middle" stroke="none" fontSize="10">N</text></g>
      {userPoint && yardage !== null && <g transform={`translate(${Math.max(35, Math.min(325,(userPoint[0]+selectedPoint[0])/2))},${Math.max(30,Math.min(425,(userPoint[1]+selectedPoint[1])/2))})`}><rect x="-29" y="-14" width="58" height="28" rx="14" fill="#11221c" stroke="white" /><text textAnchor="middle" y="5" fill="white" fontSize="15" fontWeight="700">{yardage}</text></g>}
      <text x="14" y="442" fontSize="10" fill="white">{imageFailed ? 'Terrain' : 'Aerial'} · {greenView ? 'Green view' : 'Selected hole'} · Hole {hole.number}</text>
    </svg>
  }
  function summary() {
    return <div className="rf-map-distance"><span>{target ? 'Selected target' : 'Middle of green'}</span><strong>{yardage === null ? 'Enable GPS to measure' : `${yardage} yd`}</strong>{target && <button onClick={() => setTarget(null)}>Reset</button>}</div>
  }
  return <section className="rf-hole-map" aria-label="Hole map">
    <div className="rf-map-heading"><span>HOLE {hole.number} <small>GPS MAP</small></span><button onClick={() => setExpanded(true)} aria-label="Expand hole map">Expand ↗</button></div>
    <div className="rf-map-stage">{map()}<button className="rf-map-view-toggle" onClick={() => setGreenView(!greenView)}>{greenView ? 'Whole hole' : 'Focus green'}</button></div>{summary()}
    <p className="rf-map-hint">Tap a landing spot to measure{!position ? ' · Course overview' : ' · Blue circle shows GPS uncertainty'}</p>
    <p className="rf-map-credit"><a href="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer" target="_blank" rel="noopener noreferrer">Aerial: USDA / USGS</a> · Historical imagery</p>
    {expanded && createPortal(<dialog ref={dialog} className="rf-map-dialog" onCancel={e => { e.preventDefault(); setExpanded(false) }}>
      <div className="rf-map-heading"><span>{courseName} · Hole {hole.number}</span><button autoFocus onClick={() => setExpanded(false)}>Close map</button></div>
      <div className="rf-map-stage">{map(true)}<button className="rf-map-view-toggle" onClick={() => setGreenView(!greenView)}>{greenView ? 'Whole hole' : 'Focus green'}</button></div>{summary()}
      <p className="rf-map-hint">Tap a landing spot · Camera slope remains aimed at the green’s middle.</p>
      <p className="rf-map-hint">Historical aerial imagery: USDA / USGS · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · OpenGolfAPI</p>
    </dialog>, document.body)}
  </section>
}
