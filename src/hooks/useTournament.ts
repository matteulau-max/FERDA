import { useCallback, useEffect, useState } from 'react'
import { fetchTournament } from '../lib/api'
import type { TournamentData } from '../lib/types'
import { MOCK_TOURNAMENT } from '../lib/mockData'

const POLL_INTERVAL_MS = 15_000
const CACHE_KEY = 'ferda_tournament_v1'

function loadCache(): TournamentData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TournamentData
  } catch {
    return null
  }
}

function saveCache(data: TournamentData) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    // storage full or unavailable — ignore
  }
}

export function useTournament(apiUrl: string) {
  const [data, setData] = useState<TournamentData | null>(() => (apiUrl ? loadCache() : null))
  const [loading, setLoading] = useState(() => (apiUrl ? loadCache() === null : false))
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const json = await fetchTournament(apiUrl)
      setData(json)
      saveCache(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    if (!apiUrl) {
      setData(MOCK_TOURNAMENT)
      setLoading(false)
      return
    }
    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [apiUrl, fetchData])

  return { data, loading, error, refetch: fetchData }
}
