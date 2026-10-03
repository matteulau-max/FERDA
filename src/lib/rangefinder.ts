export interface ElevationReading { yards: number; angle: number; height: number; feet: number }
export interface AngleSample { time: number; angle: number }

/** W3C Z-X-Y rotation, with the rear camera along device −Z. */
export function cameraAngle(beta: number | null, gamma: number | null): number | null {
  if (beta === null || gamma === null || !Number.isFinite(beta) || !Number.isFinite(gamma)
    || Math.abs(beta) > 180 || Math.abs(gamma) > 90) return null
  return Math.asin(Math.max(-1, Math.min(1,
    -Math.cos(beta * Math.PI / 180) * Math.cos(gamma * Math.PI / 180)))) * 180 / Math.PI
}

export function elevation(yards: number, angle: number, height: number): ElevationReading | null {
  if (![yards, angle, height].every(Number.isFinite) || yards < 1 || yards > 400
    || Math.abs(angle) > 35 || height < 0 || height > 10) return null
  return { yards, angle, height, feet: yards * 3 * Math.tan(angle * Math.PI / 180) + height }
}

export function windowStats(samples: AngleSample[], now: number) {
  const recent = samples.filter(s => now - s.time <= 700 && now >= s.time)
  if (!recent.length) return { mean: null, stable: false, fresh: false }
  const mean = recent.reduce((sum, s) => sum + s.angle, 0) / recent.length
  const spread = Math.sqrt(recent.reduce((sum, s) => sum + (s.angle - mean) ** 2, 0) / recent.length)
  const fresh = now - recent[recent.length - 1].time < 500
  const span = recent[recent.length - 1].time - recent[0].time
  return { mean, fresh, stable: fresh && recent.length >= 10 && span >= 500 && spread < 0.2 }
}

/** Accept one number or one yardage with units; reject ambiguous multi-distance text. */
export function parseYardage(text: string): number | null {
  const match = text.trim().match(/^(\d{1,3}(?:\.\d+)?)\s*(?:yd|yds|yards?)?$/i)
  if (!match) return null
  const yards = Number(match[1])
  return yards >= 1 && yards <= 400 ? yards : null
}
