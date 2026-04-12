import { useCallback, useEffect, useState } from 'react'
import { fetchTournament } from '../lib/api'
import type { TournamentData } from '../lib/types'

const POLL_INTERVAL_MS = 15_000

export function useTournament(apiUrl: string) {
  const [data, setData] = useState<TournamentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const json = await fetchTournament(apiUrl)
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [apiUrl])

  useEffect(() => {
    if (!apiUrl) {
      setLoading(false)
      return
    }
    fetchData()
    const interval = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [apiUrl, fetchData])

  return { data, loading, error, refetch: fetchData }
}
