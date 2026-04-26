import type { SaveScorePayload, TournamentData } from './types'

export async function fetchTournament(apiUrl: string): Promise<TournamentData> {
  const res = await fetch(`${apiUrl}?action=getTournament`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<TournamentData>
}

export async function saveScore(apiUrl: string, payload: SaveScorePayload): Promise<void> {
  const params = new URLSearchParams({
    action:     'saveScore',
    matchId:    payload.matchId,
    hole:       String(payload.hole),
    side:       payload.side,
    player:     payload.player,
    grossScore: String(payload.grossScore),
  })
  const res = await fetch(`${apiUrl}?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { success: boolean; error?: string }
  if (!data.success) throw new Error(data.error ?? 'Save failed')
}
