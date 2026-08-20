import type { Session } from '../../lib/types'
import { HOLE_SET_LABELS, sessionRules } from '../../lib/holes'
import { FORMAT_LABELS, SCORING_LABELS } from '../../lib/constants'
import { Chip, Tag } from './ui'

/**
 * How a round is described wherever the manual mentions one — the schedule and
 * the rules both point at the same sessions, so they read the same way.
 *
 * Everything here is derived. A round's format, scoring, course, holes and
 * whether handicaps apply are all decided under Setup → Sessions, so the
 * manual never asks an organiser to write them down a second time and can't
 * fall out of step with what the scoring engine is actually doing.
 */

/** "2v2", "1v1", "2v1" — read off the pairings that actually exist. */
export function sideLabel(session: Session): string {
  const match = session.matches[0]
  if (!match) return ''
  const a = match.team1Players.length
  const b = match.team2Players.length
  return `${a}v${b}`
}

export function formatLabel(session: Session): string {
  const sides = sideLabel(session)
  const format = FORMAT_LABELS[session.format] ?? session.format
  // "2v1" is already a side count; pairing it with another would read "1v2 2 v 1".
  return sides && session.format !== '2v1' ? `${sides} ${format}` : format
}

export function RoundBadges({ session }: { session: Session }) {
  const rules = sessionRules(session)
  return (
    <>
      <Chip>{formatLabel(session)}</Chip>
      <Tag>{SCORING_LABELS[rules.scoring] ?? rules.scoring}</Tag>
    </>
  )
}

/** "Patriot Hills · Front 9 (1–9) · Gross" — the settings worth restating. */
export function roundDetail(session: Session): string {
  const rules = sessionRules(session)
  const parts = [session.courseName]
  if (rules.holeSet !== 'All 18') parts.push(HOLE_SET_LABELS[rules.holeSet])
  parts.push(rules.useHandicap ? 'Net' : 'Gross — no handicaps')
  if (rules.scoring === 'Total Stroke Play') {
    parts.push(`${rules.pointsPerStroke} pt per stroke of margin`)
  }
  return parts.filter(Boolean).join(' · ')
}
