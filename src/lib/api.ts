import type { Course, Format, HoleSet, Player, SaveScorePayload, Scoring, TournamentData } from './types'

/** Append ?t=<slug> when a specific tournament is being addressed. */
function withSlug(apiUrl: string, params: Record<string, string>, slug?: string): string {
  const search = new URLSearchParams(params)
  if (slug) search.set('t', slug)
  return `${apiUrl}?${search}`
}

export async function fetchTournament(apiUrl: string, slug?: string): Promise<TournamentData> {
  // The response carries s-maxage for Vercel's edge, but the browser must not
  // hold its own copy: setup refetches immediately after a write, and a cached
  // body would show the organiser their old data until the next poll.
  const res = await fetch(withSlug(apiUrl, { action: 'getTournament' }, slug), { cache: 'no-store' })
  if (!res.ok) {
    // The API puts a real message in the body — a missing tournament, an
    // unconfigured DATABASE_URL, a column the database doesn't have yet.
    // Showing "HTTP 500" instead means having to go and fetch this by hand.
    const body = await res.json().catch(() => null) as { error?: string } | null
    if (body?.error) throw new Error(body.error)
    throw new Error(
      res.status === 404
        ? 'That tournament no longer exists.'
        : `The server returned ${res.status}.`,
    )
  }
  return res.json() as Promise<TournamentData>
}

export interface TournamentSummary {
  slug: string
  name: string
  team1Name: string
  team2Name: string
  playerCount: number
  sessionCount: number
  matchCount: number
  createdAt: string
}

export async function fetchTournaments(apiUrl: string): Promise<TournamentSummary[]> {
  if (!apiUrl) throw new Error('No API URL configured — set VITE_API_URL and redeploy.')
  const res = await fetch(`${apiUrl}?action=listTournaments`, { cache: 'no-store' })
  const data = await res.json().catch(() => null) as
    { tournaments?: TournamentSummary[]; error?: string } | null
  // Same reasoning as fetchTournament: the server's message is the useful one.
  if (!res.ok || !data?.tournaments) {
    throw new Error(data?.error ?? `The server returned ${res.status}.`)
  }
  return data.tournaments
}

export async function saveScore(apiUrl: string, payload: SaveScorePayload, slug?: string): Promise<void> {
  const res = await fetch(withSlug(apiUrl, {
    action:     'saveScore',
    matchId:    payload.matchId,
    hole:       String(payload.hole),
    side:       payload.side,
    player:     payload.player,
    grossScore: String(payload.grossScore),
  }, slug))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { success: boolean; error?: string }
  if (!data.success) throw new Error(data.error ?? 'Save failed')
}

/**
 * Setup writes all POST a JSON body to the same endpoint. The server returns
 * { success, error? }; a validation failure arrives as a 400 with a message
 * written for the organiser, so it's surfaced verbatim.
 */
async function post<T>(apiUrl: string, body: Record<string, unknown>, slug?: string): Promise<T> {
  if (!apiUrl) {
    throw new Error('No API URL configured — set VITE_API_URL and redeploy.')
  }
  const url = slug ? `${apiUrl}?t=${encodeURIComponent(slug)}` : apiUrl

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // Browsers report every network-level failure with an opaque message
    // ("Load failed", "Failed to fetch"). The usual cause here is opening a
    // protected Vercel preview URL, where the request is redirected to an
    // SSO origin the fetch can't follow.
    throw new Error(
      `Couldn't reach ${url}. If this is a preview deployment URL, try the main site URL instead.`,
    )
  }

  const text = await res.text()
  let data: { success?: boolean; error?: string } = {}
  try {
    data = JSON.parse(text) as typeof data
  } catch {
    // An HTML body means the request was answered by something other than
    // the API — a login page, or the SPA fallback.
    if (!res.ok) throw new Error(`Server returned ${res.status} for ${url}`)
    throw new Error(`Unexpected non-JSON response from ${url}`)
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.error ?? `Server returned ${res.status}`)
  }
  return data as T
}

export function createTournament(apiUrl: string, name: string) {
  return post<{ slug: string; name: string }>(apiUrl, { action: 'createTournament', name })
}

export function updateTournament(
  apiUrl: string,
  slug: string,
  fields: { name?: string; team1Name?: string; team2Name?: string },
) {
  return post(apiUrl, { action: 'updateTournament', ...fields }, slug)
}

/**
 * Irreversible: takes the courses, players, sessions, matches and scores with
 * it. `confirmName` must match the tournament's name exactly — the server
 * checks it too, so this isn't only a UI guard.
 */
export function deleteTournament(apiUrl: string, slug: string, confirmName: string) {
  return post<{ slug: string }>(apiUrl, { action: 'deleteTournament', confirmName }, slug)
}

export function saveCourse(apiUrl: string, slug: string, course: Course, originalName?: string) {
  return post<{ name: string }>(apiUrl, { action: 'saveCourse', ...course, originalName }, slug)
}

export function deleteCourse(apiUrl: string, slug: string, name: string) {
  return post(apiUrl, { action: 'deleteCourse', name }, slug)
}

export function savePlayer(apiUrl: string, slug: string, player: Player, originalName?: string) {
  return post<{ name: string }>(apiUrl, { action: 'savePlayer', ...player, originalName }, slug)
}

export function deletePlayer(apiUrl: string, slug: string, name: string) {
  return post(apiUrl, { action: 'deletePlayer', name }, slug)
}

export interface SessionFields {
  name: string
  format: Format
  scoring: Scoring
  courseName: string
  holeSet: HoleSet
  useHandicap: boolean
  /** Only read by Total Stroke Play, but always stored. */
  pointsPerStroke: number
}

export function saveSession(apiUrl: string, slug: string, session: SessionFields, originalName?: string) {
  return post<{ name: string }>(apiUrl, { action: 'saveSession', ...session, originalName }, slug)
}

export function deleteSession(apiUrl: string, slug: string, name: string) {
  return post(apiUrl, { action: 'deleteSession', name }, slug)
}

export function saveMatch(
  apiUrl: string,
  slug: string,
  match: { id?: string; sessionName: string; team1Players: string[]; team2Players: string[] },
) {
  return post<{ id: string }>(apiUrl, { action: 'saveMatch', ...match }, slug)
}

export function deleteMatch(apiUrl: string, slug: string, id: string) {
  return post(apiUrl, { action: 'deleteMatch', id }, slug)
}
