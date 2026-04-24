import type { SaveScorePayload, TournamentData } from './types'

let callbackCounter = 0

/**
 * JSONP fetch — injects a <script> tag and waits for a named callback.
 * Bypasses CORS entirely since <script> tags aren't subject to CORS.
 * Used for both reads and writes to avoid Apps Script's cross-origin issues.
 */
function jsonp<T>(url: string, params: Record<string, string | number>): Promise<T> {
  return new Promise((resolve, reject) => {
    const callbackName = `__ferda_cb_${Date.now()}_${callbackCounter++}`
    const script = document.createElement('script')

    const cleanup = () => {
      delete (window as unknown as Record<string, unknown>)[callbackName]
      script.remove()
    }

    ;(window as unknown as Record<string, unknown>)[callbackName] = (data: T) => {
      resolve(data)
      cleanup()
    }

    const qs = new URLSearchParams({
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
      callback: callbackName,
    }).toString()

    script.src = `${url}?${qs}`
    script.onerror = () => {
      cleanup()
      reject(new Error('JSONP request failed'))
    }
    document.body.appendChild(script)

    // Timeout after 15s
    setTimeout(() => {
      if ((window as unknown as Record<string, unknown>)[callbackName]) {
        cleanup()
        reject(new Error('Request timed out'))
      }
    }, 15_000)
  })
}

export async function fetchTournament(apiUrl: string): Promise<TournamentData> {
  return jsonp<TournamentData>(apiUrl, { action: 'getTournament' })
}

/**
 * Fire-and-forget save. Uses JSONP GET instead of POST to avoid CORS preflight.
 * The server side accepts saveScore via query params for this reason.
 */
export function saveScore(apiUrl: string, payload: SaveScorePayload): void {
  jsonp(apiUrl, {
    action: 'saveScore',
    matchId: payload.matchId,
    hole: payload.hole,
    side: payload.side,
    player: payload.player,
    grossScore: payload.grossScore,
  }).catch((err) => {
    console.warn('saveScore failed:', err)
  })
}
