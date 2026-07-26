import { useEffect, useState } from 'react'
import type { TournamentData } from '../../lib/types'
import { updateTournament } from '../../lib/api'
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
    </div>
  )
}
