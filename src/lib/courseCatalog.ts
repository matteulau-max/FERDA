export type Course = { id: string; name: string; source: string; holes: { number: number; center: number[]; outline: number[][]; osmGreen?: string }[] }
export type CourseMap = { lines: Record<string, number[][]>; layers: { kind: string; polygons: number[][][][] }[] }
type Feature = { feature_type?: string; hole_number?: number; osm_id?: string; geometry?: { type: string; coordinates: unknown } }
const point = (p: unknown): p is number[] => Array.isArray(p) && p.length >= 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90
const ring = (p: unknown): p is number[][] => Array.isArray(p) && p.length >= 4 && p.every(point) && p[0][0] === p[p.length - 1][0] && p[0][1] === p[p.length - 1][1]
function inside(p: number[], r: number[][]) {
  let hit = false
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i], b = r[j]
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) hit = !hit
  }
  return hit
}
export function parseCourse(id: string, name: string, raw: unknown): { course: Course; map: CourseMap } {
  const features = (raw as { features?: Feature[] })?.features
  if (!Array.isArray(features)) throw new Error('Course map is unavailable.')
  const layers: CourseMap['layers'] = []
  const greens: { polygon: number[][][]; id?: string }[] = []
  for (const f of features) {
    if (!f || !['green', 'fairway', 'tee', 'bunker', 'water_hazard'].includes(f.feature_type ?? '')) continue
    const g = f.geometry
    const polygons = g?.type === 'Polygon' ? [g.coordinates] : g?.type === 'MultiPolygon' ? g.coordinates : []
    if (!Array.isArray(polygons)) continue
    const valid = polygons.filter((p): p is number[][][] => Array.isArray(p) && p.length > 0 && p.every(ring))
    layers.push({ kind: f.feature_type!, polygons: valid })
    if (f.feature_type === 'green') valid.forEach(polygon => greens.push({ polygon, id: f.osm_id }))
  }
  const holes: Course['holes'] = [], lines: CourseMap['lines'] = {}, used = new Set<number>()
  for (const f of features) {
    if (f?.feature_type !== 'hole_line') continue
    const n = f.hole_number, coords = f.geometry?.coordinates
    if (!Number.isInteger(n) || n! < 1 || n! > 36 || f.geometry?.type !== 'LineString' || !Array.isArray(coords) || coords.length < 2 || !coords.every(point) || lines[String(n)]) throw new Error('Course has incomplete or ambiguous hole routes.')
    const center = coords[coords.length - 1]
    const matches = greens.map((g, i) => ({ g, i })).filter(({ g }) => inside(center, g.polygon[0]) && !g.polygon.slice(1).some(r => inside(center, r)))
    if (matches.length !== 1 || used.has(matches[0].i)) throw new Error('Course is listed, but its green mapping is incomplete. GPS cannot be loaded safely yet.')
    const { g, i } = matches[0]; used.add(i)
    holes.push({ number: n!, center, outline: g.polygon[0], osmGreen: g.id }); lines[String(n)] = coords
  }
  holes.sort((a, b) => a.number - b.number)
  if (![9, 18, 27, 36].includes(holes.length) || holes.some((h, i) => h.number !== i + 1)) throw new Error('This course does not yet have a complete numbered GPS map.')
  return { course: { id, name, source: `https://api.opengolfapi.org/api/v1/features?course=${encodeURIComponent(id)}`, holes }, map: { lines, layers } }
}
export async function readCourseApi(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(`https://api.opengolfapi.org/${path}`, { signal })
  if (!response.ok) throw new Error(response.status === 429 ? 'Course search limit reached. Try again later; saved courses still work.' : 'Course service unavailable. Please try again.')
  return response.json()
}
