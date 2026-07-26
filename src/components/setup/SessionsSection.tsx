import { useState } from 'react'
import type { Format, Scoring, TournamentData } from '../../lib/types'
import { deleteSession, saveSession, type SessionFields } from '../../lib/api'
import { FORMAT_LABELS, SCORING_LABELS } from '../../lib/constants'
import { Button, Card, EmptyState, ErrorText, Field, SectionHeading, Select, TextInput } from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

const FORMATS: Format[] = ['Singles', 'Best Ball', 'Scramble', '2v1']
const SCORINGS: Scoring[] = ['Match Play', 'Stroke Play']

/** How many players a side takes, shown alongside the format picker. */
const FORMAT_SHAPE: Record<Format, string> = {
  Singles: '1 v 1',
  'Best Ball': '2 v 2',
  Scramble: '2 v 2',
  '2v1': '2 v 1',
}

export function SessionsSection({ apiUrl, slug, data, onSaved }: Props) {
  const [editing, setEditing] = useState<{ session: SessionFields; originalName?: string } | null>(null)

  const blank = (): SessionFields => ({
    name: '',
    format: 'Best Ball',
    scoring: 'Match Play',
    courseName: data.courses[0]?.name ?? '',
  })

  if (editing) {
    return (
      <SessionEditor
        apiUrl={apiUrl}
        slug={slug}
        data={data}
        session={editing.session}
        originalName={editing.originalName}
        onDone={() => { setEditing(null); onSaved() }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div>
      <SectionHeading
        title="Sessions"
        action={
          <Button onClick={() => setEditing({ session: blank() })} disabled={data.courses.length === 0}>
            Add session
          </Button>
        }
      />

      {data.courses.length === 0 && (
        <EmptyState>Add a course first — every session is played on one.</EmptyState>
      )}

      {data.courses.length > 0 && data.sessions.length === 0 && (
        <EmptyState>No sessions yet. A session is one round: a format, a course, and its matches.</EmptyState>
      )}

      {[...data.sessions].sort((a, b) => a.sortOrder - b.sortOrder).map((session) => (
        <Card key={session.name}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-serif font-bold text-base" style={{ color: '#004d34' }}>{session.name}</p>
              <p className="text-xs text-gray-500 font-body mt-0.5">
                {FORMAT_LABELS[session.format]} · {SCORING_LABELS[session.scoring ?? 'Match Play']} · {session.courseName}
              </p>
              <p className="text-xs text-gray-400 font-body mt-0.5">
                {session.matches.length} {session.matches.length === 1 ? 'match' : 'matches'}
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => setEditing({
                session: {
                  name: session.name,
                  format: session.format,
                  scoring: session.scoring ?? 'Match Play',
                  courseName: session.courseName,
                },
                originalName: session.name,
              })}
            >
              Edit
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

function SessionEditor({
  apiUrl, slug, data, session: initial, originalName, onDone, onCancel,
}: {
  apiUrl: string
  slug: string
  data: TournamentData
  session: SessionFields
  originalName?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [session, setSession] = useState<SessionFields>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const existing = data.sessions.find((s) => s.name === originalName)
  const matchCount = existing?.matches.length ?? 0

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveSession(apiUrl, slug, { ...session, name: session.name.trim() }, originalName)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  async function remove() {
    if (!originalName) return
    const warning = matchCount
      ? `Delete ${originalName}? Its ${matchCount} ${matchCount === 1 ? 'match' : 'matches'} and any scores go too.`
      : `Delete ${originalName}?`
    if (!confirm(warning)) return
    setSaving(true)
    setError(null)
    try {
      await deleteSession(apiUrl, slug, originalName)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionHeading
        title={originalName ? 'Edit session' : 'Add session'}
        action={<Button variant="ghost" onClick={onCancel}>Back</Button>}
      />
      <Card>
        <Field label="Session name" hint="How it appears on the leaderboard, e.g. Saturday AM.">
          <TextInput
            value={session.name}
            maxLength={60}
            placeholder="Saturday AM"
            onChange={(e) => setSession({ ...session, name: e.target.value })}
          />
        </Field>

        <Field label="Game type">
          <Select
            value={session.format}
            onChange={(e) => setSession({ ...session, format: e.target.value as Format })}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f}>{FORMAT_LABELS[f]} ({FORMAT_SHAPE[f]})</option>
            ))}
          </Select>
        </Field>

        <Field label="Scoring">
          <Select
            value={session.scoring}
            onChange={(e) => setSession({ ...session, scoring: e.target.value as Scoring })}
          >
            {SCORINGS.map((s) => <option key={s} value={s}>{SCORING_LABELS[s]}</option>)}
          </Select>
        </Field>

        <Field label="Course" hint="Each session can be played on a different course.">
          <Select
            value={session.courseName}
            onChange={(e) => setSession({ ...session, courseName: e.target.value })}
          >
            {data.courses.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </Select>
        </Field>
      </Card>

      {originalName && matchCount > 0 && (
        <p className="text-xs text-gray-500 font-body mb-3">
          Changing the game type may invalidate existing pairings — a 2v2 lineup can't be played as Singles.
        </p>
      )}

      <div className="flex gap-2 items-center">
        <Button onClick={save} disabled={saving || !session.name.trim() || !session.courseName}>
          {saving ? 'Saving…' : 'Save session'}
        </Button>
        {originalName && <Button variant="danger" onClick={remove} disabled={saving}>Delete</Button>}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
