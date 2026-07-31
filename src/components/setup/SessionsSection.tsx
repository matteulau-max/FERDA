import { useState } from 'react'
import type { Format, HoleSet, Scoring, TournamentData } from '../../lib/types'
import { deleteSession, saveSession, type SessionFields } from '../../lib/api'
import { DEFAULT_POINTS_PER_STROKE, FORMAT_LABELS, SCORING_LABELS } from '../../lib/constants'
import { HOLE_SETS, HOLE_SET_LABELS, sessionRules } from '../../lib/holes'
import { Button, Card, EmptyState, ErrorText, Field, SectionHeading, Select, TextInput } from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

const FORMATS: Format[] = ['Singles', 'Best Ball', 'Scramble', '2v1']
const SCORINGS: Scoring[] = ['Match Play', 'Stroke Play', 'Total Stroke Play']

/** One line each, so the organiser doesn't have to guess what they're picking. */
const SCORING_HINTS: Record<Scoring, string> = {
  'Match Play': 'Hole by hole. Each match is worth one point.',
  'Stroke Play': 'Lowest total wins the match. Still one point per match.',
  'Total Stroke Play':
    "Every match's total is added up per team. The team with fewer strokes wins the margin at the rate below.",
}

/** How many players a side takes, shown alongside the format picker. */
const FORMAT_SHAPE: Record<Format, string> = {
  Singles: '1 v 1',
  'Best Ball': '2 v 2',
  Scramble: '2 v 2',
  '2v1': '2 v 1',
}

/** Make the rate concrete — the number alone doesn't say much. */
function pointsExample(rate: number): string {
  if (!rate) return 'At 0, the session is worth nothing.'
  const two = Math.round(rate * 2 * 100) / 100
  return `Winning by 2 strokes is worth ${two} ${two === 1 ? 'point' : 'points'}. Level totals score nothing.`
}

export function SessionsSection({ apiUrl, slug, data, onSaved }: Props) {
  const [editing, setEditing] = useState<{ session: SessionFields; originalName?: string } | null>(null)

  const blank = (): SessionFields => ({
    name: '',
    format: 'Best Ball',
    scoring: 'Match Play',
    courseName: data.courses[0]?.name ?? '',
    holeSet: 'All 18',
    useHandicap: true,
    pointsPerStroke: DEFAULT_POINTS_PER_STROKE,
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

      {[...data.sessions].sort((a, b) => a.sortOrder - b.sortOrder).map((session) => {
        const rules = sessionRules(session)
        return (
          <Card key={session.name}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-serif font-bold text-base" style={{ color: '#004d34' }}>{session.name}</p>
                <p className="text-xs text-gray-500 font-body mt-0.5">
                  {FORMAT_LABELS[session.format]} · {SCORING_LABELS[rules.scoring]} · {session.courseName}
                </p>
                <p className="text-xs text-gray-400 font-body mt-0.5">
                  {rules.holeSet}
                  {' · '}{rules.useHandicap ? 'Handicaps on' : 'Gross'}
                  {rules.scoring === 'Total Stroke Play' && ` · ${rules.pointsPerStroke} pt/stroke`}
                  {' · '}{session.matches.length} {session.matches.length === 1 ? 'match' : 'matches'}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setEditing({
                  session: {
                    name: session.name,
                    format: session.format,
                    scoring: rules.scoring,
                    courseName: session.courseName,
                    holeSet: rules.holeSet,
                    useHandicap: rules.useHandicap,
                    pointsPerStroke: rules.pointsPerStroke,
                  },
                  originalName: session.name,
                })}
              >
                Edit
              </Button>
            </div>
          </Card>
        )
      })}
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

        <Field label="Scoring" hint={SCORING_HINTS[session.scoring]}>
          <Select
            value={session.scoring}
            onChange={(e) => setSession({ ...session, scoring: e.target.value as Scoring })}
          >
            {SCORINGS.map((s) => <option key={s} value={s}>{SCORING_LABELS[s]}</option>)}
          </Select>
        </Field>

        {session.scoring === 'Total Stroke Play' && (
          <Field
            label="Team points per stroke"
            hint={pointsExample(session.pointsPerStroke)}
          >
            <TextInput
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max="10"
              value={String(session.pointsPerStroke)}
              onChange={(e) => setSession({
                ...session,
                // Keep the field editable while it's mid-typing ("0." parses to NaN).
                pointsPerStroke: e.target.value === '' ? 0 : Number(e.target.value),
              })}
            />
          </Field>
        )}

        <Field label="Course" hint="Each session can be played on a different course.">
          <Select
            value={session.courseName}
            onChange={(e) => setSession({ ...session, courseName: e.target.value })}
          >
            {data.courses.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          </Select>
        </Field>

        <Field label="Holes" hint="A nine halves each handicap and re-ranks the stroke indexes within those nine holes.">
          <Select
            value={session.holeSet}
            onChange={(e) => setSession({ ...session, holeSet: e.target.value as HoleSet })}
          >
            {HOLE_SETS.map((h) => <option key={h} value={h}>{HOLE_SET_LABELS[h]}</option>)}
          </Select>
        </Field>

        <Field label="Handicaps" hint={session.useHandicap
          ? 'Strokes are given per the format’s USGA allowance.'
          : 'Everyone plays gross — no strokes given.'}>
          <Select
            value={session.useHandicap ? 'on' : 'off'}
            onChange={(e) => setSession({ ...session, useHandicap: e.target.value === 'on' })}
          >
            <option value="on">Handicap adjusted</option>
            <option value="off">Gross (no handicaps)</option>
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
