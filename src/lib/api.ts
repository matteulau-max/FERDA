import type { SaveScorePayload, TournamentData } from './types'

export async function fetchTournament(apiUrl: string): Promise<TournamentData> {
  const res = await fetch(`${apiUrl}?action=getTournament`, { credentials: 'omit' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<TournamentData>
}

/**
 * Fire-and-forget POST. Uses no-cors because Apps Script doPost returns
 * an opaque response to cross-origin requests. The next poll will confirm persistence.
 */
export function saveScore(apiUrl: string, payload: SaveScorePayload): void {
  fetch(apiUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((err) => {
    console.warn('saveScore fire-and-forget failed:', err)
  })
}
