import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { TournamentData } from '../../lib/types'
import { deleteTournament, updateTournament } from '../../lib/api'
import { clearTournamentCache } from '../../hooks/useTournament'
import { Button, Card, ErrorText, Field, SectionHeading, TextInput } from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

export function TeamsSection({ apiUrl, slug, data, onSaved }: Props) {
  const [name, setName] = useState(data.name ?? '')
  const [team1, setTeam1] = useState(data.teams.team1.name)
  const [team2, setTeam2] = useState(data.teams.team2.name)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Polling refreshes `data` every 15s; don't stomp on what's being typed.
  useEffect(() => {
    if (saving) return
    setName(data.name ?? '')
    setTeam1(data.teams.team1.name)
    setTeam2(data.teams.team2.name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.name, data.teams.team1.name, data.teams.team2.name])

  const dirty =
    name !== (data.name ?? '') ||
    team1 !== data.teams.team1.name ||
    team2 !== data.teams.team2.name

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await updateTournament(apiUrl, slug, { name, team1Name: team1, team2Name: team2 })
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionHeading title="Tournament & Teams" />
      <Card>
        <Field label="Tournament name">
          <TextInput value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Team 1 name">
          <TextInput value={team1} maxLength={40} onChange={(e) => setTeam1(e.target.value)} />
        </Field>
        <Field label="Team 2 name">
          <TextInput value={team2} maxLength={40} onChange={(e) => setTeam2(e.target.value)} />
        </Field>
        <Button onClick={save} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <ErrorText>{error}</ErrorText>
      </Card>

      <DeleteTournament apiUrl={apiUrl} slug={slug} data={data} />
    </div>
  )
}

/**
 * Deleting takes the whole event with it and there's no undo, so the name has
 * to be typed out. Kept behind a disclosure so it isn't sitting under the
 * save button waiting to be hit by accident.
 */
function DeleteTournament({ apiUrl, slug, data }: { apiUrl: string; slug: string; data: TournamentData }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const realName = data.name ?? ''
  const matches = confirm.trim() === realName

  const counts = [
    `${data.players.length} ${data.players.length === 1 ? 'player' : 'players'}`,
    `${data.courses.length} ${data.courses.length === 1 ? 'course' : 'courses'}`,
    `${data.sessions.length} ${data.sessions.length === 1 ? 'session' : 'sessions'}`,
    `${data.sessions.reduce((n, s) => n + s.matches.length, 0)} matches`,
  ].join(', ')

  async function remove() {
    setDeleting(true)
    setError(null)
    try {
      await deleteTournament(apiUrl, slug, confirm.trim())
      clearTournamentCache(slug)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the tournament')
      setDeleting(false)
    }
  }

  if (!open) {
    return (
      <div className="mt-6">
        <button
          onClick={() => setOpen(true)}
          className="font-body text-sm underline"
          style={{ color: '#C41E3A' }}
        >
          Delete this tournament
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-xl p-4" style={{ background: '#fef6f5', border: '1px solid #f3c9c4' }}>
      <h3 className="font-serif font-bold text-base mb-1" style={{ color: '#C41E3A' }}>
        Delete this tournament
      </h3>
      <p className="text-sm text-gray-600 font-body mb-1">
        This removes <span className="font-semibold">{realName}</span> and everything in it — {counts},
        and every score entered. It cannot be undone.
      </p>
      <p className="text-sm text-gray-600 font-body mb-3">
        Type <span className="font-semibold">{realName}</span> to confirm.
      </p>

      <TextInput
        value={confirm}
        placeholder={realName}
        autoFocus
        onChange={(e) => setConfirm(e.target.value)}
      />

      <div className="flex gap-2 items-center mt-3">
        <Button variant="danger" onClick={remove} disabled={!matches || deleting}>
          {deleting ? 'Deleting…' : 'Delete forever'}
        </Button>
        <Button variant="ghost" onClick={() => { setOpen(false); setConfirm(''); setError(null) }} disabled={deleting}>
          Cancel
        </Button>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
