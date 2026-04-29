import type { Course, Format, Match, Player, Team } from '../lib/types'
import { runningStatusByHole } from '../lib/matchPlay'
import { TEAM_COLORS } from '../lib/constants'

interface Props {
  match: Match
  format: Format
  players: Player[]
  course: Course
  team1: Team
  team2: Team
}

const VIEW_W = 320
const VIEW_H = 88
const PAD_LEFT = 30
const PAD_RIGHT = 10
const PAD_TOP = 14
const PAD_BOTTOM = 20
const CHART_W = VIEW_W - PAD_LEFT - PAD_RIGHT  // 280
const CHART_H = VIEW_H - PAD_TOP - PAD_BOTTOM  // 54
const CENTER_Y = PAD_TOP + CHART_H / 2          // 41
const MAX_UP = 7  // y-range: ±7 holes up

function holeX(hole: number): number {
  return PAD_LEFT + ((hole - 0.5) / 18) * CHART_W
}

function t1UpY(t1Up: number): number {
  const clamped = Math.max(-MAX_UP, Math.min(MAX_UP, t1Up))
  return CENTER_Y - (clamped / MAX_UP) * (CHART_H / 2)
}

export function MatchWormChart({ match, format, players, course, team1, team2 }: Props) {
  const statusData = runningStatusByHole(match, format, players, course)

  if (statusData.length === 0) return null

  // Build path points: start at All Square before hole 1
  const points: Array<{ x: number; y: number; t1Up: number }> = [
    { x: PAD_LEFT, y: CENTER_Y, t1Up: 0 },
    ...statusData.map(({ hole, t1Up }) => ({ x: holeX(hole), y: t1UpY(t1Up), t1Up })),
  ]

  const lastPoint = points[points.length - 1]
  const currentT1Up = lastPoint.t1Up
  const isLeadingTeam1 = currentT1Up > 0
  const isLeadingTeam2 = currentT1Up < 0
  const leaderColor = isLeadingTeam1 ? TEAM_COLORS.team1 : isLeadingTeam2 ? TEAM_COLORS.team2 : '#888'

  // Hole labels on x-axis: 3, 6, 9, 12, 15, 18
  const holeLabels = [3, 6, 9, 12, 15, 18]

  return (
    <div
      className="rounded-xl overflow-hidden shadow-sm"
      style={{ border: '1px solid #e8e5d8', background: '#fff' }}
    >
      <div className="px-3 pt-3 pb-1">
        <p className="font-serif text-xs font-semibold" style={{ color: '#444', marginBottom: 2 }}>
          Match Momentum
        </p>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        style={{ display: 'block', overflow: 'visible' }}
        aria-label="Match momentum worm chart"
      >
        {/* Faint background bands */}
        <rect x={PAD_LEFT} y={PAD_TOP} width={CHART_W} height={CHART_H / 2} fill={TEAM_COLORS.team1} fillOpacity={0.04} />
        <rect x={PAD_LEFT} y={CENTER_Y} width={CHART_W} height={CHART_H / 2} fill={TEAM_COLORS.team2} fillOpacity={0.04} />

        {/* Team labels inside the chart bands */}
        <text x={PAD_LEFT + 4} y={PAD_TOP + 9} fontSize={8} fill={TEAM_COLORS.team1} fontFamily="Lora, serif" fontWeight="600" opacity={0.7}>
          ↑ {team1.name}
        </text>
        <text x={PAD_LEFT + 4} y={PAD_TOP + CHART_H - 3} fontSize={8} fill={TEAM_COLORS.team2} fontFamily="Lora, serif" fontWeight="600" opacity={0.7}>
          ↓ {team2.name}
        </text>

        {/* Center line */}
        <line
          x1={PAD_LEFT} y1={CENTER_Y}
          x2={PAD_LEFT + CHART_W} y2={CENTER_Y}
          stroke="#ccc" strokeWidth={1} strokeDasharray="3,3"
        />

        {/* Chart border */}
        <rect x={PAD_LEFT} y={PAD_TOP} width={CHART_W} height={CHART_H} fill="none" stroke="#e8e5d8" strokeWidth={0.5} />

        {/* Vertical hole markers at 9 */}
        <line
          x1={holeX(9)} y1={PAD_TOP}
          x2={holeX(9)} y2={PAD_TOP + CHART_H}
          stroke="#e8e5d8" strokeWidth={1} strokeDasharray="2,2"
        />

        {/* Worm line segments, colored by leading team */}
        {points.slice(0, -1).map((pt, i) => {
          const next = points[i + 1]
          const color = next.t1Up > 0
            ? TEAM_COLORS.team1
            : next.t1Up < 0
              ? TEAM_COLORS.team2
              : '#888'
          return (
            <line
              key={i}
              x1={pt.x} y1={pt.y}
              x2={next.x} y2={next.y}
              stroke={color}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )
        })}

        {/* Dot at current position */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r={4}
          fill={leaderColor}
          stroke="#fff"
          strokeWidth={1.5}
        />

        {/* X-axis hole labels */}
        {holeLabels.map((h) => (
          <text
            key={h}
            x={holeX(h)}
            y={VIEW_H - 4}
            textAnchor="middle"
            fontSize={8}
            fill="#aaa"
            fontFamily="Lora, serif"
          >
            {h}
          </text>
        ))}

        {/* Y-axis: AS label */}
        <text
          x={PAD_LEFT - 3}
          y={CENTER_Y + 3}
          textAnchor="end"
          fontSize={7}
          fill="#aaa"
          fontFamily="Lora, serif"
        >
          AS
        </text>
      </svg>

      {/* Current status label */}
      <div className="text-center pb-2" style={{ fontSize: 11, fontFamily: 'Lora, serif' }}>
        <span style={{ color: leaderColor, fontWeight: 600 }}>
          {currentT1Up === 0
            ? 'All Square'
            : `${currentT1Up > 0 ? team1.name : team2.name} ${Math.abs(currentT1Up)} UP`}
        </span>
        <span style={{ color: '#aaa' }}>
          {' '}· thru {statusData.length}
        </span>
      </div>
    </div>
  )
}
