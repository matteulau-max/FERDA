export type Coordinate = number[] // longitude, latitude
export function distanceYards(a: Coordinate, b: Coordinate): number {
  const rad = Math.PI / 180
  const dlat = (b[1] - a[1]) * rad, dlon = (b[0] - a[0]) * rad
  const h = Math.sin(dlat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dlon / 2) ** 2
  return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h))) / 0.9144
}
/** Green edges along the approach line through the mapped target, rather than nearest/farthest vertices. */
export function greenDistances(position: Coordinate, center: Coordinate, outline: Coordinate[]) {
  const yards = distanceYards(position, center)
  if (yards < 1) return { center: yards, front: null, back: null }
  const scale = Math.cos(center[1] * Math.PI / 180)
  const dx = (center[0] - position[0]) * scale, dy = center[1] - position[1]
  const hits: number[] = []
  for (let i = 0; i < outline.length - 1; i++) {
    const a = outline[i], b = outline[i + 1]
    const ax = (a[0] - position[0]) * scale, ay = a[1] - position[1]
    const ex = (b[0] - a[0]) * scale, ey = b[1] - a[1]
    const cross = dx * ey - dy * ex
    if (Math.abs(cross) < 1e-15) continue
    const t = (ax * ey - ay * ex) / cross, u = (ax * dy - ay * dx) / cross
    if (u >= 0 && u <= 1) hits.push(t)
  }
  // Use the entry/exit surrounding the mapped center; reject distances when on/inside the green.
  const entry = Math.max(...hits.filter(t => t <= 1)), exit = Math.min(...hits.filter(t => t >= 1))
  return { center: yards, front: Number.isFinite(entry) && entry > 0 ? entry * yards : null, back: Number.isFinite(exit) && entry > 0 ? exit * yards : null }
}
