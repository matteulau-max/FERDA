import { useState } from 'react'
import type { Course, Hole, TournamentData } from '../../lib/types'
import { deleteCourse, saveCourse } from '../../lib/api'
import { Button, Card, EmptyState, ErrorText, Field, SectionHeading, Select, TextInput } from './ui'

interface Props {
  apiUrl: string
  slug: string
  data: TournamentData
  onSaved: () => void
}

/** A fresh card: 18 par-4s with stroke indexes already 1-18, so it's valid
 *  from the outset and the organiser edits rather than fills from blank. */
function blankHoles(): Hole[] {
  return Array.from({ length: 18 }, (_, i) => ({ number: i + 1, par: 4, strokeIndex: i + 1 }))
}

function blankCourse(): Course {
  return { name: '', rating: 72, slope: 113, par: 72, holes: blankHoles() }
}

export function CoursesSection({ apiUrl, slug, data, onSaved }: Props) {
  const [editing, setEditing] = useState<{ course: Course; originalName?: string } | null>(null)

  if (editing) {
    return (
      <CourseEditor
        apiUrl={apiUrl}
        slug={slug}
        course={editing.course}
        originalName={editing.originalName}
        onDone={() => { setEditing(null); onSaved() }}
        onCancel={() => setEditing(null)}
      />
    )
  }

  return (
    <div>
      <SectionHeading
        title="Courses"
        action={<Button onClick={() => setEditing({ course: blankCourse() })}>Add course</Button>}
      />

      {data.courses.length === 0 && (
        <EmptyState>No courses yet. Add one before creating sessions — each session is played on a course.</EmptyState>
      )}

      {data.courses.map((course) => (
        <Card key={course.name}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-serif font-bold text-base" style={{ color: '#004d34' }}>{course.name}</p>
              <p className="text-xs text-gray-500 font-body mt-0.5">
                Rating {course.rating} · Slope {course.slope} · Par {course.par}
              </p>
            </div>
            <Button variant="ghost" onClick={() => setEditing({ course, originalName: course.name })}>
              Edit
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

function CourseEditor({
  apiUrl, slug, course: initial, originalName, onDone, onCancel,
}: {
  apiUrl: string
  slug: string
  course: Course
  originalName?: string
  onDone: () => void
  onCancel: () => void
}) {
  const [course, setCourse] = useState<Course>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Total par is the sum of the card — no reason to type it twice.
  const totalPar = course.holes.reduce((sum, h) => sum + h.par, 0)

  const duplicateIndexes = new Set(
    course.holes
      .map((h) => h.strokeIndex)
      .filter((si, i, all) => all.indexOf(si) !== i),
  )

  function setHole(number: number, patch: Partial<Hole>) {
    setCourse((c) => ({
      ...c,
      holes: c.holes.map((h) => (h.number === number ? { ...h, ...patch } : h)),
    }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveCourse(apiUrl, slug, { ...course, par: totalPar }, originalName)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
      setSaving(false)
    }
  }

  async function remove() {
    if (!originalName) return
    if (!confirm(`Delete ${originalName}?`)) return
    setSaving(true)
    setError(null)
    try {
      await deleteCourse(apiUrl, slug, originalName)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
      setSaving(false)
    }
  }

  return (
    <div>
      <SectionHeading
        title={originalName ? 'Edit course' : 'Add course'}
        action={<Button variant="ghost" onClick={onCancel}>Back</Button>}
      />

      <Card>
        <Field label="Course name">
          <TextInput
            value={course.name}
            maxLength={60}
            placeholder="Patriot Hills"
            onChange={(e) => setCourse({ ...course, name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Course rating" hint="From the scorecard, e.g. 69.4">
            <TextInput
              type="number" inputMode="decimal" step="0.1" value={course.rating}
              onChange={(e) => setCourse({ ...course, rating: parseFloat(e.target.value) || 0 })}
            />
          </Field>
          <Field label="Slope" hint="55–155, usually ~113–140">
            <TextInput
              type="number" inputMode="numeric" value={course.slope}
              onChange={(e) => setCourse({ ...course, slope: parseInt(e.target.value, 10) || 0 })}
            />
          </Field>
        </div>
        <p className="font-body text-sm text-gray-600">
          Total par <span className="font-bold" style={{ color: '#004d34' }}>{totalPar}</span>
          <span className="text-gray-400"> — added up from the holes below</span>
        </p>
      </Card>

      <Card>
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-gray-600 mb-2">
          Scorecard
        </p>
        <p className="text-xs text-gray-500 font-body mb-3">
          Stroke index is the hole's difficulty ranking, 1–18, each used once. It decides
          where handicap strokes fall, so it has to match the scorecard.
        </p>

        <div className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center mb-1">
          <span className="text-xs font-body text-gray-400">#</span>
          <span className="text-xs font-body text-gray-400">Par</span>
          <span className="text-xs font-body text-gray-400">Stroke index</span>
        </div>

        {course.holes.map((hole) => (
          <div key={hole.number} className="grid grid-cols-[2rem_1fr_1fr] gap-2 items-center mb-1.5">
            <span className="font-body text-sm text-gray-600 tabular-nums">{hole.number}</span>
            <Select
              value={hole.par}
              onChange={(e) => setHole(hole.number, { par: parseInt(e.target.value, 10) })}
            >
              {[3, 4, 5, 6].map((p) => <option key={p} value={p}>{p}</option>)}
            </Select>
            <Select
              value={hole.strokeIndex}
              onChange={(e) => setHole(hole.number, { strokeIndex: parseInt(e.target.value, 10) })}
              style={duplicateIndexes.has(hole.strokeIndex) ? { borderColor: '#C41E3A', color: '#C41E3A' } : undefined}
            >
              {Array.from({ length: 18 }, (_, i) => i + 1).map((si) => (
                <option key={si} value={si}>{si}</option>
              ))}
            </Select>
          </div>
        ))}

        {duplicateIndexes.size > 0 && (
          <ErrorText>
            {`Stroke indexes must each be used once — ${[...duplicateIndexes].sort((a, b) => a - b).join(', ')} repeated.`}
          </ErrorText>
        )}
      </Card>

      <div className="flex gap-2 items-center">
        <Button onClick={save} disabled={saving || !course.name.trim() || duplicateIndexes.size > 0}>
          {saving ? 'Saving…' : 'Save course'}
        </Button>
        {originalName && <Button variant="danger" onClick={remove} disabled={saving}>Delete</Button>}
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  )
}
