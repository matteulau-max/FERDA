import React from 'react'
import type { Course, Format, Match, Player } from '../lib/types'
import { ScoreInput } from './ScoreInput'
import { TEAM_COLORS } from '../lib/constants'
import {
  matchPlayingHandicaps,
  perPlayerHoleStrokes,
  scrambleSideHandicaps,
  strokesOnHole,
} from '../lib/handicap'
import { calcMatchStatus } from '../lib/matchPlay'

interface Props {
  match: Match
  format: Format
  players: Player[]
  course: Course
  side: 'front' | 'back'
  localScores: Match['scores']
  onScoreChange: (hole: number, side: 'team1' | 'team2', player: string, gross: number | '') => void
}

export function ScoreTable({ match, format, players, course, side, localScores, onScoreChange }: Props) {
  const holeNumbers = side === 'front' ? [1, 2, 3, 4, 5, 6, 7, 8, 9] : [10, 11, 12, 13, 14, 15, 16, 17, 18]
  const holes = course.holes.filter((h) => holeNumbers.includes(h.number))
    .sort((a, b) => a.number - b.number)

  // --- Compute strokes ---
  const { t1Phs, t2Phs } = format !== 'Scramble'
    ? matchPlayingHandicaps(match.team1Players, match.team2Players, players, course, format as 'Singles' | 'Best Ball')
    : { t1Phs: [], t2Phs: [] }

  const t1PlayerStrokes = format !== 'Scramble'
    ? perPlayerHoleStrokes(match.team1Players, t1Phs, course)
    : {}
  const t2PlayerStrokes = format !== 'Scramble'
    ? perPlayerHoleStrokes(match.team2Players, t2Phs, course)
    : {}

  let t1TeamStrokes: Record<number, number> = {}
  let t2TeamStrokes: Record<number, number> = {}
  if (format === 'Scramble') {
    const { team1Ph, team2Ph } = scrambleSideHandicaps(
      match.team1Players, match.team2Players, players, course
    )
    for (const h of course.holes) {
      t1TeamStrokes[h.number] = strokesOnHole(team1Ph, h.strokeIndex)
      t2TeamStrokes[h.number] = strokesOnHole(team2Ph, h.strokeIndex)
    }
  }

  // Running match status up to current hole (for status row)
  const statusByHole = computeRunningStatus(match, localScores, format, players, course)

  // Build rows to render
  // team1Players rows, then team2Players rows (for Singles/BestBall)
  // For Scramble: one row per team
  const rows: RowDef[] = []

  if (format === 'Scramble') {
    rows.push({
      label: match.team1Players[0] ?? 'Team 1',
      teamSide: 'team1',
      player: match.team1Players[0] ?? 'team1',
      strokes: t1TeamStrokes,
      color: TEAM_COLORS.team1,
    })
    rows.push({
      label: match.team2Players[0] ?? 'Team 2',
      teamSide: 'team2',
      player: match.team2Players[0] ?? 'team2',
      strokes: t2TeamStrokes,
      color: TEAM_COLORS.team2,
    })
  } else {
    match.team1Players.forEach((name, i) => {
      rows.push({
        label: format === 'Best Ball' ? `${name} (${t1Phs[i]})` : name,
        teamSide: 'team1',
        player: name,
        strokes: t1PlayerStrokes[name] ?? {},
        color: TEAM_COLORS.team1,
      })
    })
    match.team2Players.forEach((name, i) => {
      rows.push({
        label: format === 'Best Ball' ? `${name} (${t2Phs[i]})` : name,
        teamSide: 'team2',
        player: name,
        strokes: t2PlayerStrokes[name] ?? {},
        color: TEAM_COLORS.team2,
      })
    })
  }

  const thStyle = 'text-center text-xs font-body text-gray-500 py-1.5 px-1'
  const tdStyle = 'text-center text-xs font-body py-1 px-1'

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e8e5d8' }}>
            <th className={`${thStyle} text-left`} style={{ minWidth: 80 }}>
              {side === 'front' ? 'Front 9' : 'Back 9'}
            </th>
            {holes.map((h) => (
              <th key={h.number} className={thStyle} style={{ minWidth: 36 }}>
                {h.number}
              </th>
            ))}
            <th className={thStyle}>Tot</th>
          </tr>
          <tr style={{ borderBottom: '1px solid #e8e5d8', background: '#f9f7f1' }}>
            <td className={`${tdStyle} text-left text-gray-400`}>Par</td>
            {holes.map((h) => (
              <td key={h.number} className={tdStyle}>{h.par}</td>
            ))}
            <td className={tdStyle}>{holes.reduce((s, h) => s + h.par, 0)}</td>
          </tr>
          <tr style={{ borderBottom: '1px solid #e8e5d8', background: '#f9f7f1' }}>
            <td className={`${tdStyle} text-left text-gray-400`}>SI</td>
            {holes.map((h) => (
              <td key={h.number} className={tdStyle}>{h.strokeIndex}</td>
            ))}
            <td className={tdStyle} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowTotal = holes.reduce((sum, h) => {
              const gross = localScores[h.number]?.[row.teamSide]?.[row.player] ?? 0
              return gross > 0 ? sum + gross : sum
            }, 0)

            return (
              <React.Fragment key={`${row.teamSide}-${row.player}`}>
                <tr style={{ borderBottom: '1px solid #f0ece0' }}>
                  <td
                    className="font-body text-xs font-semibold py-2 px-2 text-left"
                    style={{ color: row.color, borderLeft: `3px solid ${row.color}`, paddingLeft: 6 }}
                  >
                    {row.label}
                  </td>
                  {holes.map((h) => {
                    const gross = localScores[h.number]?.[row.teamSide]?.[row.player]
                    const strokes = row.strokes[h.number] ?? 0
                    return (
                      <ScoreInput
                        key={h.number}
                        value={gross ?? ''}
                        strokes={strokes}
                        onChange={(val) => onScoreChange(h.number, row.teamSide, row.player, val)}
                      />
                    )
                  })}
                  <td className={`${tdStyle} font-semibold`} style={{ color: rowTotal > 0 ? '#222' : '#ccc' }}>
                    {rowTotal > 0 ? rowTotal : '–'}
                  </td>
                </tr>
                {/* Stroke indicator row */}
                <tr style={{ borderBottom: '2px solid #e8e5d8', background: '#faf9f5' }}>
                  <td
                    className="font-body py-0.5 px-2 text-left"
                    style={{ fontSize: 9, color: '#aaa', borderLeft: `3px solid ${row.color}`, paddingLeft: 6 }}
                  >
                    strokes
                  </td>
                  {holes.map((h) => {
                    const strokes = row.strokes[h.number] ?? 0
                    return (
                      <td key={h.number} className="text-center p-0" style={{ height: 16 }}>
                        {strokes === 1 && (
                          <span style={{ color: row.color, fontSize: 14, lineHeight: 1 }}>●</span>
                        )}
                        {strokes >= 2 && (
                          <span style={{ color: row.color, fontSize: 10, lineHeight: 1, letterSpacing: -2 }}>●●</span>
                        )}
                      </td>
                    )
                  })}
                  <td />
                </tr>
              </React.Fragment>
            )
          })}

          {/* Running match status row */}
          <tr style={{ borderTop: '2px solid #e8e5d8', background: '#f9f7f1' }}>
            <td className={`${tdStyle} text-left text-gray-500`}>Status</td>
            {holes.map((h) => {
              const st = statusByHole[h.number]
              return (
                <td key={h.number} className={tdStyle}>
                  {st !== undefined ? (
                    <span
                      className="text-xs font-semibold"
                      style={{ color: st > 0 ? TEAM_COLORS.team1 : st < 0 ? TEAM_COLORS.team2 : '#888' }}
                    >
                      {st === 0 ? 'AS' : st > 0 ? `${st}↑` : `${Math.abs(st)}↓`}
                    </span>
                  ) : null}
                </td>
              )
            })}
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  )
}

interface RowDef {
  label: string
  teamSide: 'team1' | 'team2'
  player: string
  strokes: Record<number, number>
  color: string
}

/** Returns map of hole number → t1Up after that hole */
function computeRunningStatus(
  match: Match,
  localScores: Match['scores'],
  format: Format,
  players: Player[],
  course: Course,
): Record<number, number> {
  // Build a temporary match with localScores to feed into calcMatchStatus incrementally
  const result: Record<number, number> = {}
  const sortedHoles = [...course.holes].sort((a, b) => a.number - b.number)

  // We recompute using running hole-by-hole match with a partial scores object
  const partialScores: Match['scores'] = {}
  for (const hole of sortedHoles) {
    const hs = localScores[hole.number]
    if (!hs) continue
    partialScores[hole.number] = hs
    const partial: Match = { ...match, scores: partialScores }
    const st = calcMatchStatus(partial, format, players, course)
    result[hole.number] = st.t1Up
  }
  return result
}
