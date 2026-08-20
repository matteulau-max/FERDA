import { useState } from 'react'
import type { Player, TournamentData } from '../../lib/types'
import { deletePlayer, savePlayer } from '../../lib/api'
import { Button, Card, EmptyState, ErrorText, Field, SectionHeading, Select, TextInput } from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

function blankPlayer(team: 1 | 2): Player {
  return { name: '', handicapIndex: 0, team }
}

export function PlayersSection({ apiUrl, slug, data, onSaved }: Props) {
  const [editing, setEditing] = useState<{ player: Player; originalName?: string } | null>(null)

  if (editing) {
    return (
      <PlayerEditor
        apiUrl={apiUrl}
        slug={slug}
        data={data}
        player={editing.player}
        originalName={editing.originalName}
        onDone={() => { setEditing(null); onSaved() }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  const teams: { side: 1 | 2; name: string }[] = [
    { side: 1, name: data.teams.team1.name },
    { side: 2, name: data.teams.team2.name },
  ]

  return (
    <div>
      <SectionHeading
        title="Players"
        action={<Button onClick={() => setEditing({ player: blankPlayer(1) })}>Add player</Button>}
      />

      {data.players.length === 0 && (
        <EmptyState>No players yet. Add them to both teams, then build pairings.</EmptyState>
      )}

      {teams.map(({ side, name }) => {
        const roster = data.players.filter((p) => p.team === side)
        if (!roster.length) return null
        return (
          <div key={side} className="mb-4">
            <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
              {name} · {roster.length}
            </p>
            {roster.map((player) => (
              <Card key={player.name}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-body font-semibold text-sm truncate">{player.name}</p>
                    <p className="text-xs text-gray-500 font-body mt-0.5">
                      Index {player.handicapIndex}
                      {player.phone ? ` · ${player.phone}` : ''}
                    </p>
                  </div>
                  <Button variant="ghost" onClick={() => setEditing({ player, originalName: player.name })}>
                    Edit
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function PlayerEditor({
  apiUrl, slug, data, player: initial, originalName, onDone, onCancel,
}: {
  apiUrl: string
  slug: string
  data: TournamentData
  player: Player
  originalName?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [player, setPlayer] = useState<Player>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await savePlayer(apiUrl, slug, { ...player, name: player.name.trim() }, originalName)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  async function remove() {
    if (!originalName) return
    if (!confirm(`Remove ${originalName}?`)) return
    setSaving(true)
    setError(null)
    try {
      await deletePlayer(apiUrl, slug, originalName)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove')
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionHeading
        title={originalName ? 'Edit player' : 'Add player'}
        action={<Button variant="ghost" onClick={onCancel}>Back</Button>}
      />
      <Card>
        <Field label="Name">
          <TextInput
            value={player.name}
            maxLength={60}
            onChange={(e) => setPlayer({ ...player, name: e.target.value })}
          />
        </Field>

        <Field
          label="Handicap index"
          hint="The GHIN index, not a course handicap — strokes are worked out per course automatically."
        >
          <TextInput
            type="number" inputMode="decimal" step="0.1" value={player.handicapIndex}
            onChange={(e) => setPlayer({ ...player, handicapIndex: parseFloat(e.target.value) || 0 })}
          />
        </Field>

        <Field label="Team">
          <Select
            value={player.team}
            onChange={(e) => setPlayer({ ...player, team: parseInt(e.target.value, 10) as 1 | 2 })}
          >
            <option value={1}>{data.teams.team1.name}</option>
            <option value={2}>{data.teams.team2.name}</option>
          </Select>
        </Field>

        <Field label="Phone number" hint="Optional — for sending them the tournament link.">
          <TextInput
            type="tel"
            value={player.phone ?? ''}
            maxLength={32}
            placeholder="(555) 123-4567"
            onChange={(e) => setPlayer({ ...player, phone: e.target.value })}
          />
        </Field>
      </Card>

      <div className="flex gap-2 items-center">
        <Button onClick={save} disabled={saving || !player.name.trim()}>
          {saving ? 'Saving…' : 'Save player'}
        </Button>
        {originalName && <Button variant="danger" onClick={remove} disabled={saving}>Remove</Button>}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
