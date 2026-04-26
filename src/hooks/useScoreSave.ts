import { useCallback } from 'react'
import { saveScore as apiSaveScore } from '../lib/api'
import type { SaveScorePayload } from '../lib/types'

export function useScoreSave(apiUrl: string) {
  const save = useCallback(
    (payload: Omit<SaveScorePayload, 'action'>): Promise<void> => {
      if (!apiUrl) return Promise.resolve()
      return apiSaveScore(apiUrl, { ...payload, action: 'saveScore' })
    },
    [apiUrl],
  )

  return { save }
}
