import type { VercelRequest } from '@vercel/node'
export type VerifiedFerdaUser = { id: string; email: string }
export async function verifiedFerdaUser(req: VercelRequest): Promise<VerifiedFerdaUser | null> {
  const header = req.headers.authorization
  const token = typeof header === 'string' ? /^Bearer\s+(.+)$/i.exec(header)?.[1] : undefined
  if (!token) return null
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_ANON_KEY
  if (!base || !key) throw new Error('Supabase auth not configured')
  const response = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) return null
  const user = await response.json() as { id?: unknown; email?: unknown; email_confirmed_at?: unknown }
  if (typeof user.id !== 'string' || typeof user.email !== 'string' || !user.email_confirmed_at) return null
  return { id: user.id, email: user.email.toLowerCase() }
}
export type ProfileInput = { name: string; phone: string; handicap: number }
export function validateProfileInput(body: Record<string, unknown>): ProfileInput | null {
  const name = typeof body.fullName === 'string' ? body.fullName.trim() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
  const handicap = typeof body.handicap === 'number' ? body.handicap : NaN
  if (!name || name.length > 120 || phone.length < 5 || phone.length > 30 ||
    !/^\+?[\d\s().-]+$/.test(phone) || !Number.isFinite(handicap) ||
    handicap < -10 || handicap > 54 || Math.round(handicap * 10) !== handicap * 10) return null
  return { name, phone, handicap }
}
