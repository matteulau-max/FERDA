export type Conditions = { time: number; temperature: number; speed: number; direction: number; gusts: number; elevation: number }
export function bearing(a: number[], b: number[]) {
  const r = Math.PI / 180, d = (b[0] - a[0]) * r
  return (Math.atan2(Math.sin(d) * Math.cos(b[1] * r), Math.cos(a[1] * r) * Math.sin(b[1] * r) - Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos(d)) / r + 360) % 360
}
// Meteorological direction is FROM; positive crosswind blows toward the shot's right.
export function windComponents(speed: number, from: number, heading: number) {
  const radians = (from - heading) * Math.PI / 180
  return { head: speed * Math.cos(radians), right: -speed * Math.sin(radians) }
}
export function parseConditions(raw: unknown): Conditions {
  const data = raw as { elevation?: number; current?: Record<string, unknown> }
  const c = data?.current
  const values = [c?.time, c?.temperature_2m, c?.wind_speed_10m, c?.wind_direction_10m, c?.wind_gusts_10m, data?.elevation]
  if (!values.every(v => typeof v === 'number' && Number.isFinite(v))) throw new Error('Weather data is incomplete.')
  const [time, temperature, speed, direction, gusts, elevation] = values as number[]
  if (speed < 0 || gusts < 0 || direction < 0 || direction > 360) throw new Error('Weather data is invalid.')
  return { time: time * 1000, temperature, speed, direction, gusts, elevation: elevation * 3.28084 }
}
