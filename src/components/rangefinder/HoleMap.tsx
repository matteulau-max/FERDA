import { useEffect, useMemo, useRef, useState, type MouseEvent, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import mapData from '../../data/gps-map.json'
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
  const dialog = useRef<HTMLDialogElement>(null)
  const user = position ? [position.longitude, position.latitude] : null
  // Frame follows the golfer, but tapping a target does not change the scale under their finger.
  const projection = useMemo(() => holeMapProjection(line, hole.outline, user ? [user] : []), [line, hole.outline, position?.longitude, position?.latitude])
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
  function map() {
    return <svg className="rf-hole-svg" viewBox="0 0 360 460" role="img" aria-label={`${courseName}, hole ${hole.number}. Tap a target or use arrow keys to measure distance.`} tabIndex={0} onClick={pick} onKeyDown={key}>
      <title>{courseName} · Hole {hole.number}</title>
      <rect width="360" height="460" fill="#f2f0df" />
      {nearbyLayers.map((layer, i) => <g key={i} fill={fills[layer.kind]} stroke={layer.kind === 'bunker' ? '#d2b77f' : '#76956b'} strokeWidth="0.5" opacity={layer.kind === 'green' ? 0.65 : 1}>{layer.polygons.map((poly, j) => <path key={j} d={poly.map(path).join(' ')} fillRule="evenodd" />)}</g>)}
      <polyline points={line.map(p => project(p).join(',')).join(' ')} stroke="#406d4d" strokeWidth="1.3" strokeDasharray="4 5" fill="none" opacity=".6" />
      <path d={path(hole.outline)} fill="#548f64" stroke="#235e40" strokeWidth="1.5" />
      <circle cx={teePoint[0]} cy={teePoint[1]} r="5" fill="#fffaf0" stroke="#406d4d" strokeWidth="2" />
      <text x={teePoint[0]} y={teePoint[1] + 18} textAnchor="middle" className="rf-map-label">TEE</text>
      <circle cx={greenPoint[0]} cy={greenPoint[1]} r="3" fill="white" />
      {userPoint && <>
        <line x1={userPoint[0]} y1={userPoint[1]} x2={selectedPoint[0]} y2={selectedPoint[1]} stroke="#2471bf" strokeWidth="2" strokeDasharray="5 4" />
        <circle cx={userPoint[0]} cy={userPoint[1]} r={position!.accuracy * projection.scale} fill="#3185d9" fillOpacity=".13" stroke="#3185d9" strokeOpacity=".35" />
        <circle cx={userPoint[0]} cy={userPoint[1]} r="6" fill="#267aca" stroke="white" strokeWidth="2.5" />
        <text x={userPoint[0]} y={userPoint[1] + 21} textAnchor="middle" className="rf-map-label">YOU</text>
      </>}
      {target && <g stroke="#be632c" strokeWidth="2"><circle cx={selectedPoint[0]} cy={selectedPoint[1]} r="7" fill="#fff9ef" /><path d={`M${selectedPoint[0]-11},${selectedPoint[1]}h22 M${selectedPoint[0]},${selectedPoint[1]-11}v22`} /></g>}
      <g transform="translate(332 27)" stroke="#406d4d" fill="#406d4d"><line x2={projection.north[0] * 13} y2={projection.north[1] * 13} strokeWidth="2" /><circle r="2" /><text x={projection.north[0] * 22} y={projection.north[1] * 22 + 3} textAnchor="middle" stroke="none" fontSize="10">N</text></g>
      <text x="14" y="442" fontSize="10" fill="#526b51">Hole {hole.number} · Green ahead</text>
    </svg>
  }
  function summary() {
    return <div className="rf-map-distance"><span>{target ? 'Selected target' : 'Middle of green'}</span><strong>{yardage === null ? 'Enable GPS to measure' : `${yardage} yd`}</strong>{target && <button onClick={() => setTarget(null)}>Reset</button>}</div>
  }
  return <section className="rf-hole-map" aria-label="Hole map">
    <div className="rf-map-heading"><span>Hole {hole.number} map</span><button onClick={() => setExpanded(true)} aria-label="Expand hole map">Expand ↗</button></div>
    {map()}{summary()}
    <p className="rf-map-hint">Tap a landing spot to measure{!position ? ' · Course overview' : ' · Blue circle shows GPS uncertainty'}</p>
    {expanded && createPortal(<dialog ref={dialog} className="rf-map-dialog" onCancel={e => { e.preventDefault(); setExpanded(false) }}>
      <div className="rf-map-heading"><span>{courseName} · Hole {hole.number}</span><button autoFocus onClick={() => setExpanded(false)}>Close map</button></div>
      {map()}{summary()}
      <p className="rf-map-hint">Tap a landing spot · Camera slope remains aimed at the green’s middle.</p>
      <p className="rf-map-hint"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a> · OpenGolfAPI</p>
    </dialog>, document.body)}
  </section>
}
