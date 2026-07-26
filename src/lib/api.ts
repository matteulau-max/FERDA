import type { Course, Format, Player, SaveScorePayload, Scoring, TournamentData } from './types'

/** Append ?t=<slug> when a specific tournament is being addressed. */
function withSlug(apiUrl: string, params: Record<string, string>, slug?: string): string {
  const search = new URLSearchParams(params)
  if (slug) search.set('t', slug)
  return `${apiUrl}?${search}`
}

export async function fetchTournament(apiUrl: string, slug?: string): Promise<TournamentData> {
  const res = await fetch(withSlug(apiUrl, { action: 'getTournament' }, slug))
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<TournamentData>
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
  const url = slug ? `${apiUrl}?t=${encodeURIComponent(slug)}` : apiUrl
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({})) as { success?: boolean; error?: string }
  if (!res.ok || data.success === false) {
    throw new Error(data.error ?? `HTTP ${res.status}`)
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
