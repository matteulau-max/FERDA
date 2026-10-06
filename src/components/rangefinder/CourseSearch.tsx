import { useEffect, useRef, useState } from 'react'
import { parseCourse, readCourseApi, type Course, type CourseMap } from '../../lib/courseCatalog'
type Result = { id: string; name: string; city?: string; state?: string }
export function CourseSearch({ onLoad }: { onLoad: (course: Course, map: CourseMap) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('Search by course name. Mapping coverage varies.')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function run(result?: Result) {
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    const timeout = window.setTimeout(() => { controller.abort(); setBusy(false); setMessage('Course service timed out. Please try again.') }, 20000)
    if (!result) setResults([])
    setBusy(true); setMessage(result ? `Loading ${result.name}…` : 'Searching…')
    try {
      if (result) {
        const raw = await readCourseApi(`api/v1/features?course=${encodeURIComponent(result.id)}`, controller.signal)
        const loaded = parseCourse(result.id, result.name, raw)
        if (controller.signal.aborted) return
        onLoad(loaded.course, loaded.map); setResults([]); setMessage(`${result.name} loaded · ${loaded.course.holes.length} mapped holes.`)
      } else {
        const raw = await readCourseApi(`v1/courses/search?q=${encodeURIComponent(query.trim())}&limit=20`, controller.signal) as { courses?: Result[] }
        if (controller.signal.aborted) return
        const found = Array.isArray(raw.courses) ? raw.courses.filter(c => typeof c.id === 'string' && typeof c.name === 'string').slice(0, 20) : []
        setResults(found); setMessage(found.length ? 'Choose a course to check its GPS map.' : 'No courses found. Try a shorter name (for La Tourette, try Tourette).')
      }
    } catch (error) {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Could not load courses. Try again.')
    } finally { window.clearTimeout(timeout); if (!controller.signal.aborted) setBusy(false) }
  }
  return <details className="rf-course-search"><summary>Find another course</summary>
    <form onSubmit={e => { e.preventDefault(); void run() }}><label htmlFor="rf-course-query">Course name</label><div><input id="rf-course-query" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search courses" minLength={2} maxLength={100} required /><button disabled={busy || query.trim().length < 2}>Search</button></div></form>
    <p role="status">{message}</p>
    <ul>{results.map(c => <li key={c.id}><button disabled={busy} onClick={() => void run(c)}>{c.name}<small>{[c.city, c.state].filter(Boolean).join(', ')}</small></button></li>)}</ul>
    <p>OpenGolfAPI / OpenStreetMap community data. Loaded courses stay available for this session. Tee scorecards and aerial imagery may be unavailable.</p>
  </details>
}
