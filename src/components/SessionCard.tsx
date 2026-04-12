import type { Course, Player, Session, Team } from '../lib/types'
import { MatchRow } from './MatchRow'

interface Props {
  session: Session
  players: Player[]
  course: Course
  team1: Team
  team2: Team
}

const FORMAT_COLORS: Record<string, string> = {
  Singles: '#006747',
  'Best Ball': '#8B6914',
  Scramble: '#1a4f7a',
}

export function SessionCard({ session, players, course, team1, team2 }: Props) {
  const badgeColor = FORMAT_COLORS[session.format] ?? '#555'

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm"
      style={{ background: '#fff', border: '1px solid #e8e5d8' }}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: '#f9f7f1', borderBottom: '1px solid #e8e5d8' }}>
        <h2 className="font-serif font-semibold text-base" style={{ color: '#333' }}>
          {session.name}
        </h2>
        <span
          className="text-xs font-body font-semibold px-2 py-0.5 rounded-full text-white"
          style={{ background: badgeColor }}
        >
          {session.format}
        </span>
      </div>

      {/* Matches */}
      <div className="p-3 flex flex-col gap-2">
        {session.matches.map((match) => (
          <MatchRow
            key={match.id}
            match={match}
            format={session.format}
            players={players}
            course={course}
            team1={team1}
            team2={team2}
          />
        ))}
        {session.matches.length === 0 && (
          <p className="text-xs text-gray-400 font-body py-2 text-center">No matches configured</p>
        )}
      </div>
    </div>
  )
}
