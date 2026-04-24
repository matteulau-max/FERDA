import type { SaveScorePayload, TournamentData } from './types'

let callbackCounter = 0

/**
 * JSONP fetch. Apps Script's /exec endpoint doesn't return usable CORS headers,
 * so we inject a <script> tag and wait for a named callback. The server
 * prepends `/**<!---->/` to the response body so Chrome's CORB content sniffer
 * doesn't mistake the JSONP payload for JSON and block it.
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
