import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_lib/db'
import { resolveTournament } from './_lib/tournament'

type AuthUser = { id?: string; email?: string; email_confirmed_at?: string }
async function verifiedUser(req: VercelRequest): Promise<AuthUser | null> {
  const auth = req.headers.authorization
  const token = typeof auth === 'string' ? /^Bearer\s+(.+)$/i.exec(auth)?.[1] : undefined
  if (!token) return null
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_ANON_KEY
  if (!base || !key) throw new Error('Auth configuration unavailable')
  const result = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  })
  if (!result.ok) return null
  const user = await result.json() as AuthUser
  return user.id && user.email && user.email_confirmed_at ? user : null
}

/** One account can RSVP independently to many events. Never trusts email or user_id from the browser. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const slug = typeof req.query.t === 'string' ? req.query.t : ''
    if (!slug) return res.status(400).json({ error: 'Tournament required' })
    const user = await verifiedUser(req)
    if (!user?.id || !user.email) return res.status(401).json({ error: 'Sign in with a verified email to RSVP' })
    const pool = getPool()
    const tournament = await resolveTournament(pool, slug)
    if (req.method === 'GET') {
      const result = await pool.query(
        'select full_name, email, phone, handicap_index, rsvp_status from public.event_registrations where tournament_id=$1 and user_id=$2',
        [tournament.id, user.id],
      )
      return res.status(200).json({ tournament: { name: tournament.name, slug: tournament.slug }, email: user.email, registration: result.rows[0] || null })
    }

    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
    const name = typeof body.fullName === 'string' ? body.fullName.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const handicap = typeof body.handicap === 'number' ? body.handicap : NaN
    const status = body.status
    if (name.length < 1 || name.length > 120 || phone.length < 5 || phone.length > 30 ||
      !/^\+?[\d\s().-]+$/.test(phone) || !Number.isFinite(handicap) || handicap < -10 || handicap > 54 ||
      Math.round(handicap * 10) !== handicap * 10 || !['yes', 'maybe', 'no'].includes(String(status))) {
      return res.status(400).json({ error: 'Provide a name, phone, handicap index (-10 to 54), and RSVP status' })
    }
    const result = await pool.query(
      `insert into public.event_registrations(tournament_id,user_id,full_name,email,phone,handicap_index,rsvp_status)
       values($1,$2,$3,$4,$5,$6,$7)
       on conflict (tournament_id,user_id) do update set
         full_name=excluded.full_name,email=excluded.email,phone=excluded.phone,
         handicap_index=excluded.handicap_index,rsvp_status=excluded.rsvp_status,updated_at=now()
       returning full_name,email,phone,handicap_index,rsvp_status`,
      [tournament.id, user.id, name, user.email.toLowerCase(), phone, handicap, status],
    )
    return res.status(200).json({ registration: result.rows[0], saved: true })
  } catch (error) {
    if (error instanceof Error && error.name === 'NotFoundError') return res.status(404).json({ error: 'Tournament not found' })
    console.error('Registration failed', error instanceof Error ? error.name : 'Unknown')
    return res.status(503).json({ error: 'Registration unavailable' })
  }
}
