import type { SaveScorePayload, TournamentData } from './types'

export async function fetchTournament(apiUrl: string): Promise<TournamentData> {
  const url = `${apiUrl}?action=getTournament`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<TournamentData>
}

export function saveScore(apiUrl: string, payload: SaveScorePayload): void {
  const params = new URLSearchParams({
    action: 'saveScore',
    matchId: payload.matchId,
    hole: String(payload.hole),
    side: payload.side,
    player: payload.player,
    grossScore: String(payload.grossScore),
  })
  fetch(`${apiUrl}?${params}`).catch((err) => {
    console.warn('saveScore failed:', err)
  })
}
