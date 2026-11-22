import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getPool } from './_lib/db'

/** Public projection: never include draft items, RSVP names, balances or organizer data. */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=30')
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const slug = typeof req.query.t === 'string' ? req.query.t : ''
  if (!slug || slug.length > 120) return res.status(400).json({ error: 'Tournament required' })
  try {
    const pool = getPool()
    const tournament = await pool.query('select id,name,slug from public.tournaments where slug=$1 limit 1', [slug])
    if (!tournament.rows[0]) return res.status(404).json({ error: 'Tournament not found' })
    const { id, name } = tournament.rows[0]
    const published = await pool.query('select section from public.event_publications where tournament_id=$1', [id])
    const sections = published.rows.map(row => row.section as string)
    const schedule = sections.includes('schedule') ? await pool.query(
      "select title,starts_at,ends_at,location from public.event_schedule where tournament_id=$1 and visibility='published' order by starts_at", [id],
    ) : { rows: [] }
    return res.status(200).json({ name, slug, publishedSections: sections.filter(section => section === 'schedule'), schedule: schedule.rows })
  } catch (error) {
    console.error('Attendee info failed', error instanceof Error ? error.name : 'Unknown error')
    return res.status(500).json({ error: 'Event information unavailable' })
  }
}
