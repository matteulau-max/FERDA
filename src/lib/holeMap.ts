import type { Coordinate } from './golfGps'

/** Local metric projection, rotated so the tee is below the green. */
export function holeMapProjection(line: Coordinate[], outline: Coordinate[], extra: Coordinate[] = []) {
  const origin = line[line.length - 1]
  const k = 111195.08, lonScale = k * Math.cos(origin[1] * Math.PI / 180)
  const east = (origin[0] - line[0][0]) * lonScale, north = (origin[1] - line[0][1]) * k
  const length = Math.hypot(east, north) || 1, fx = east / length, fy = north / length
  const local = (p: Coordinate) => {
    const x = (p[0] - origin[0]) * lonScale, y = (p[1] - origin[1]) * k
    return [x * fy - y * fx, -(x * fx + y * fy)]
  }
  const points = [...line, ...outline, ...extra].map(local)
  const minX = Math.min(...points.map(p => p[0])) - 35, maxX = Math.max(...points.map(p => p[0])) + 35
  const minY = Math.min(...points.map(p => p[1])) - 40, maxY = Math.max(...points.map(p => p[1])) + 40
  const scale = Math.min(320 / (maxX - minX), 410 / (maxY - minY))
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2
  return {
    scale,
    north: [-fx, -fy],
    project(p: Coordinate) { const q = local(p); return [180 + (q[0] - cx) * scale, 230 + (q[1] - cy) * scale] },
    unproject(p: Coordinate) {
      const u = (p[0] - 180) / scale + cx, v = (p[1] - 230) / scale + cy
      return [origin[0] + (u * fy - v * fx) / lonScale, origin[1] + (-u * fx - v * fy) / k]
    }
  }
}
