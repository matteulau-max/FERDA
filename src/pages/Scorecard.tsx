import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTournament } from '../hooks/useTournament'
import { useScoreSave } from '../hooks/useScoreSave'
import { StatusBanner } from '../components/StatusBanner'
import { ScoreTable } from '../components/ScoreTable'
import { HandicapInfo } from '../components/HandicapInfo'
import { calcMatchStatus } from '../lib/matchPlay'
import type { Match, MatchScores } from '../lib/types'

const API_URL = import.meta.env.VITE_API_URL as string
export function Scorecard() {
  const { matchId } = useParams<{ matchId: string }>()
  const navigate = useNavigate()
  const { data, loading } = useTournament(API_URL)
  const { save } = useScoreSave(API_URL)

  // Local optimistic scores state
  const [localScores, setLocalScores] = useState<MatchScores>({})

  // Save status indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const inFlightRef = useRef(0)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Find the match + session
  const session = data?.sessions.find((s) => s.matches.some((m) => m.id === matchId))
  const match = session?.matches.find((m) => m.id === matchId)

  // Sync local scores with fetched scores (merge — local optimistic wins if same hole)
  useEffect(() => {
    if (match) {
      setLocalScores((prev) => mergeScores(match.scores, prev))
    }
  }, [match?.scores]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleScoreChange = useCallback(
    async (hole: number, side: 'team1' | 'team2', player: string, gross: number | '') => {
      if (gross === '' || gross === 0) return

      // Optimistic update
      setLocalScores((prev) => {
        const updated = { ...prev }
        if (!updated[hole]) updated[hole] = { team1: {}, team2: {} }
        updated[hole] = {
          ...updated[hole],
          [side]: { ...updated[hole][side], [player]: gross },
        }
        return updated
      })

      inFlightRef.current++
      setSaveStatus('saving')
      clearTimeout(savedTimerRef.current)

      try {
        await save({ matchId: matchId!, hole, side, player, grossScore: gross as number })
      } catch {
        inFlightRef.current--
        setSaveStatus('error')
        return
      }

      inFlightRef.current--
      if (inFlightRef.current === 0) {
        setSaveStatus('saved')
        savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
      }
    },
    [matchId, save],
  )

  if (loading) return <ScorecardSkeleton />

  if (!data || !match || !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: '#FDF8E8' }}>
        <p className="font-serif text-lg text-gray-600">Match not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm font-body underline" style={{ color: '#006747' }}>
          Back to leaderboard
        </button>
      </div>
    )
  }

  const course = data.courses.find((c) => c.name === session.courseName) ?? data.courses[0]

  const status = calcMatchStatus(
    { ...match, scores: localScores },
    session.format,
    data.players,
    course,
  )

  const matchWithLocal: Match = { ...match, scores: localScores }

  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      {/* Back nav */}
      <div style={{ background: '#006747' }} className="px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="text-white opacity-75 active:opacity-50 text-lg leading-none">
          ←
        </button>
        <div>
          <p className="text-white font-serif font-semibold text-sm leading-tight">
            {match.team1Players.join(' / ')} vs {match.team2Players.join(' / ')}
          </p>
          <p className="text-white/60 font-body text-xs">{session.name} · {session.format}</p>
        </div>
      </div>

      {saveStatus !== 'idle' && (
        <div
          className="px-4 py-1.5 text-xs font-body flex items-center gap-1.5"
          style={{
            background: saveStatus === 'error' ? '#fef3f2' : '#e8f5ef',
            color: saveStatus === 'error' ? '#c41e3a' : '#006747',
            borderBottom: '1px solid',
            borderColor: saveStatus === 'error' ? '#fcd5d0' : '#c3e6d5',
          }}
        >
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'error' && 'Save failed — check your connection'}
        </div>
      )}

      <StatusBanner status={status} team1={data.teams.team1} team2={data.teams.team2} />

      {/* Score tables */}
      <div className="px-0 py-3 flex flex-col gap-4">
        <div className="bg-white rounded-xl mx-3 overflow-hidden shadow-sm" style={{ border: '1px solid #e8e5d8' }}>
          <ScoreTable
            match={matchWithLocal}
            format={session.format}
            players={data.players}
            course={course}
            side="front"
            localScores={localScores}
            onScoreChange={handleScoreChange}
          />
        </div>
        <div className="bg-white rounded-xl mx-3 overflow-hidden shadow-sm" style={{ border: '1px solid #e8e5d8' }}>
          <ScoreTable
            match={matchWithLocal}
            format={session.format}
            players={data.players}
            course={course}
            side="back"
            localScores={localScores}
            onScoreChange={handleScoreChange}
          />
        </div>
      </div>

      <div className="mx-3">
        <HandicapInfo
          match={match}
          format={session.format}
          players={data.players}
          course={course}
        />
      </div>

      <footer className="text-center text-xs font-body text-gray-400 py-6">
        Scores auto-saved · Updates every 10s
      </footer>
    </div>
  )
}

/** Merge fetched scores with local optimistic scores. Local wins on conflict. */
function mergeScores(fetched: MatchScores, local: MatchScores): MatchScores {
  const result: MatchScores = { ...fetched }
  for (const [holeStr, holeScores] of Object.entries(local)) {
    const hole = Number(holeStr)
    if (!result[hole]) {
      result[hole] = holeScores
    } else {
      result[hole] = {
        team1: { ...result[hole].team1, ...holeScores.team1 },
        team2: { ...result[hole].team2, ...holeScores.team2 },
      }
    }
  }
  return result
}

function ScorecardSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: '#FDF8E8' }}>
      <div className="h-14 animate-pulse" style={{ background: '#006747' }} />
      <div className="h-10 animate-pulse" style={{ background: '#e8f5ef' }} />
      <div className="mx-3 mt-3 h-64 rounded-xl animate-pulse" style={{ background: '#f0ece0' }} />
      <div className="mx-3 mt-3 h-64 rounded-xl animate-pulse" style={{ background: '#f0ece0' }} />
    </div>
  )
}
