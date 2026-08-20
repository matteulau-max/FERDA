import { useState } from 'react'
import type { Format, Match, Session, TournamentData } from '../../lib/types'
import { deleteMatch, reorderMatches, saveMatch } from '../../lib/api'
import { FORMAT_LABELS } from '../../lib/constants'
import { moveItem } from '../../lib/order'
import { formatTeeTime } from '../../lib/time'
import {
  Button, Card, EmptyState, ErrorText, Field, MoveButtons, SectionHeading, Select, TextInput,
} from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

/** Allowed side sizes per format — mirrors api/_lib/validate.ts. */
function sideLimits(format: Format): { min: number; max: number } {
  if (format === 'Singles') return { min: 1, max: 1 }
  if (format === '2v1') return { min: 1, max: 2 }
  return { min: 2, max: 4 }
}

function describeSizes(format: Format, n1: number, n2: number): string | null {
  if (format === 'Singles') {
    return n1 === 1 && n2 === 1 ? null : 'Singles needs one player per side'
  }
  if (format === '2v1') {
    const shape = [n1, n2].sort().join('v')
    return shape === '1v2' ? null : 'A 2v1 needs two players on one side and one on the other'
  }
  if (n1 !== n2) return `${format} needs the same number on each side`
  if (n1 < 2 || n1 > 4) return `${format} needs 2 to 4 players per side`
  return null
}

export function PairingsSection({ apiUrl, slug, data, onSaved }: Props) {
  const sessions = [...data.sessions].sort((a, b) => a.sortOrder - b.sortOrder)
  const [sessionName, setSessionName] = useState(sessions[0]?.name ?? '')
  const [editing, setEditing] = useState<{ match?: Match } | null>(null)
  const [reordering, setReordering] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)

  const session = sessions.find((s) => s.name === sessionName) ?? sessions[0]
  const matches = session ? [...session.matches].sort((a, b) => a.sortOrder - b.sortOrder) : []

  /** Matches go out in this order, so it's the order they're listed in. */
  async function move(index: number, delta: number) {
    if (!session) return
    const ids = matches.map((m) => m.id)
    const next = moveItem(ids, index, delta)
    if (next === ids) return

    setReordering(true)
    setOrderError(null)
    try {
      await reorderMatches(apiUrl, slug, session.name, next)
      onSaved()
    } catch (err) {
      setOrderError(err instanceof Error ? err.message : 'Could not change the order')
    } finally {
      setReordering(false)
    }
  }

  if (!sessions.length) {
    return (
      <div>
        <SectionHeading title="Pairings" />
        <EmptyState>Add a session first — pairings belong to one.</EmptyState>
      </div>
    )
  }

  if (session && editing) {
    return (
      <MatchEditor
        apiUrl={apiUrl}
        slug={slug}
        data={data}
        session={session}
        match={editing.match}
        onDone={() => { setEditing(null); onSaved() }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div>
      <SectionHeading
        title="Pairings"
        action={<Button onClick={() => setEditing({})} disabled={!session}>Add match</Button>}
      />

      <div className="mb-3">
        <Select value={sessionName} onChange={(e) => setSessionName(e.target.value)}>
          {sessions.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} — {FORMAT_LABELS[s.format]}
            </option>
          ))}
        </Select>
      </div>

      {session && matches.length === 0 && (
        <EmptyState>No matches in {session.name} yet.</EmptyState>
      )}

      {matches.length > 1 && (
        <p className="text-xs text-gray-500 font-body mb-2">
          The arrows set the order these groups are listed in.
        </p>
      )}
      <ErrorText>{orderError}</ErrorText>

      {matches.map((match, index) => {
        const teeTime = formatTeeTime(match.teeTime)
        return (
          <Card key={match.id}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-body mb-1">
                  {match.id}
                  {teeTime && <span style={{ color: '#006747' }}> · {teeTime}</span>}
                </p>
                <p className="font-body text-sm">
                  <span className="font-semibold">{match.team1Players.join(' & ')}</span>
                  <span className="text-gray-400"> v </span>
                  <span className="font-semibold">{match.team2Players.join(' & ')}</span>
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {matches.length > 1 && (
                  <MoveButtons
                    label={match.id}
                    disabled={reordering}
                    onUp={index > 0 ? () => move(index, -1) : undefined}
                    onDown={index < matches.length - 1 ? () => move(index, 1) : undefined}
                  />
                )}
                <Button variant="ghost" onClick={() => setEditing({ match })}>Edit</Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function MatchEditor({
  apiUrl, slug, data, session, match, onDone, onCancel,
}: {
  apiUrl: string
  slug: string
  data: TournamentData
  session: Session
  match?: Match
  onDone: () => void
  onCancel: () => void
}) {
  const [team1, setTeam1] = useState<string[]>(match?.team1Players ?? [])
  const [team2, setTeam2] = useState<string[]>(match?.team2Players ?? [])
  const [teeTime, setTeeTime] = useState(match?.teeTime ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const limits = sideLimits(session.format)
  const sizeError = describeSizes(session.format, team1.length, team2.length)

  // Players already committed to another match in this session.
  const takenElsewhere = new Set(
    session.matches
      .filter((m) => m.id !== match?.id)
      .flatMap((m) => [...m.team1Players, ...m.team2Players]),
  )

  function toggle(side: 1 | 2, name: string) {
    const [selected, setSelected] = side === 1 ? [team1, setTeam1] as const : [team2, setTeam2] as const
    if (selected.includes(name)) {
      setSelected(selected.filter((n) => n !== name))
    } else if (selected.length < limits.max) {
      setSelected([...selected, name])
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveMatch(apiUrl, slug, {
        id: match?.id,
        sessionName: session.name,
        team1Players: team1,
        team2Players: team2,
        teeTime,
      })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  async function remove() {
    if (!match) return
    if (!confirm(`Delete match ${match.id}? Any scores entered for it go too.`)) return
    setSaving(true)
    setError(null)
    try {
      await deleteMatch(apiUrl, slug, match.id)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
      setSaving(false)
    }
  }

  const sides: { side: 1 | 2; label: string; selected: string[] }[] = [
    { side: 1, label: data.teams.team1.name, selected: team1 },
    { side: 2, label: data.teams.team2.name, selected: team2 },
  ]

  return (
    <div>
      <SectionHeading
        title={match ? `Edit ${match.id}` : 'Add match'}
        action={<Button variant="ghost" onClick={onCancel}>Back</Button>}
      />

      <p className="text-xs text-gray-500 font-body mb-3">
        {session.name} · {FORMAT_LABELS[session.format]} · {session.courseName}
      </p>

      {sides.map(({ side, label, selected }) => {
        const roster = data.players.filter((p) => p.team === side)
        return (
          <Card key={side}>
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
              {label} — {selected.length} selected
            </p>
            {roster.length === 0 && <EmptyState>No players on this team yet.</EmptyState>}
            <div className="flex flex-wrap gap-2">
              {roster.map((player) => {
                const isSelected = selected.includes(player.name)
                const taken = takenElsewhere.has(player.name) && !isSelected
                const full = selected.length >= limits.max && !isSelected
                return (
                  <button
                    key={player.name}
                    disabled={taken || full}
                    onClick={() => toggle(side, player.name)}
                    className="px-3 py-1.5 rounded-full font-body text-sm border disabled:opacity-30"
                    style={
                      isSelected
                        ? { background: '#006747', color: '#fff', borderColor: '#006747' }
                        : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }
                    }
                    title={taken ? 'Already playing in another match this session' : undefined}
                  >
                    {player.name}
                    <span className="opacity-60 text-xs"> {player.handicapIndex}</span>
                  </button>
                )
              })}
            </div>
          </Card>
        )
      })}

      <Card>
        <Field
          label="Tee time"
          hint={
            formatTeeTime(teeTime)
              ? `Shown as ${formatTeeTime(teeTime)} above this match's score on the leaderboard.`
              : 'Optional. When this group goes off — it shows above the match score on the leaderboard.'
          }
        >
          <div className="flex items-center gap-2">
            <TextInput
              type="time"
              aria-label="Tee time"
              value={teeTime}
              onChange={(e) => setTeeTime(e.target.value)}
            />
            {teeTime && (
              <Button variant="ghost" onClick={() => setTeeTime('')}>Clear</Button>
            )}
          </div>
        </Field>
      </Card>

      {sizeError && <ErrorText>{sizeError}</ErrorText>}

      <div className="flex gap-2 items-center mt-3">
        <Button onClick={save} disabled={saving || sizeError !== null}>
          {saving ? 'Saving…' : 'Save match'}
        </Button>
        {match && <Button variant="danger" onClick={remove} disabled={saving}>Delete</Button>}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
