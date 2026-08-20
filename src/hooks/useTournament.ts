import { useCallback, useEffect, useState } from 'react'
import { fetchTournament } from '../lib/api'
import type { TournamentData } from '../lib/types'
import { MOCK_TOURNAMENT } from '../lib/mockData'

const POLL_INTERVAL_MS = 15_000

/** Cached per tournament, so switching between events can't cross wires. */
function cacheKey(slug?: string): string {
  return slug ? `ferda_tournament_v1:${slug}` : 'ferda_tournament_v1'
}

function loadCache(slug?: string): TournamentData | null {
  try {
    const raw = localStorage.getItem(cacheKey(slug))
    if (!raw) return null
    return JSON.parse(raw) as TournamentData
  } catch {
    return null
  }
}

/** Called after a tournament is deleted, so its stale copy can't resurface. */
export function clearTournamentCache(slug?: string) {
  try {
    localStorage.removeItem(cacheKey(slug))
  } catch {
    // storage unavailable — nothing to clear
  }
}

function saveCache(data: TournamentData, slug?: string) {
  try {
    localStorage.setItem(cacheKey(slug), JSON.stringify(data))
  } catch {
    // storage full or unavailable — ignore
  }
}

export function useTournament(apiUrl: string, slug?: string) {
  const [data, setData] = useState<TournamentData | null>(() => (apiUrl ? loadCache(slug) : null))
  const [loading, setLoading] = useState(() => (apiUrl ? loadCache(slug) === null : false))
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const json = await fetchTournament(apiUrl, slug)
      setData(json)
      saveCache(json, slug)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [apiUrl, slug])

  useEffect(() => {
    if (!apiUrl) {
      setData(MOCK_TOURNAMENT)
      setLoading(false)
      return
    }
    // Show this tournament's cache immediately when the slug changes.
    const cached = loadCache(slug)
    setData(cached)
    setLoading(cached === null)

    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [apiUrl, slug, fetchData])

  return { data, loading, error, refetch: fetchData }
}
