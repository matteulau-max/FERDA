import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_lib/db'
import { verifiedFerdaUser, validateProfileInput } from './_lib/verified-ferda-user'

/** The global profile is private; avatars are intentionally shareable in Ferda draft boards. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Vary', 'Authorization')
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const user = await verifiedFerdaUser(req)
    if (!user) return res.status(401).json({ error: 'Verified sign-in required' })
    const pool = getPool()
    if (req.method === 'GET') {
      const result = await pool.query(
        'select full_name,phone,handicap_index,avatar_path from public.player_profiles where user_id=$1', [user.id],
      )
      return res.status(200).json({ email: user.email, userId: user.id, profile: result.rows[0] || null })
    }
    const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {}
    const input = validateProfileInput(body)
    if (!input) return res.status(400).json({ error: 'Enter valid name, phone and handicap index (-10 to 54)' })
    // Accept only a fixed file in the caller's own avatar folder.
    const avatar = body.avatarPath === null ? null : body.avatarPath
    const validPath = typeof avatar === 'string' && new RegExp(`^${user.id}/avatar\\.(jpg|png|webp)$`).test(avatar)
    if (avatar !== undefined && avatar !== null && !validPath) return res.status(400).json({ error: 'Invalid avatar path' })
    const result = await pool.query(
      `insert into public.player_profiles(user_id,full_name,phone,handicap_index,avatar_path)
       values($1,$2,$3,$4,$5) on conflict(user_id) do update
       set full_name=excluded.full_name,phone=excluded.phone,handicap_index=excluded.handicap_index,
           avatar_path=coalesce(excluded.avatar_path,public.player_profiles.avatar_path),updated_at=now()
       returning full_name,phone,handicap_index,avatar_path`,
      [user.id,input.name,input.phone,input.handicap,validPath ? avatar : null],
    )
    return res.status(200).json({ email: user.email, userId: user.id, profile: result.rows[0] })
  } catch (error) {
    console.error('Profile request failed', error instanceof Error ? error.name : 'Unknown')
    return res.status(503).json({ error: 'Profile service unavailable' })
  }
}
