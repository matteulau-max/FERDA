import { useEffect, useRef, useState } from 'react'
import { saveManual } from '../../lib/api'
import type { ManualPart } from '../../lib/manual'

/**
 * Editing state for one section of the manual.
 *
 * Every manual section is the same shape of problem: hold a draft, know
 * whether it differs from what's saved, save it, and don't let the 15-second
 * poll overwrite what someone is halfway through typing. The dirty check is a
 * JSON comparison because these are plain data documents — no need for each
 * section to write its own field-by-field version.
 */
export function useManualSection<T>(
  part: ManualPart,
  saved: T,
  { apiUrl, slug, onSaved }: { apiUrl: string; slug: string; onSaved: () => void },
) {
  const [value, setValue] = useState<T>(saved)
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const savedJson = JSON.stringify(saved)
  const dirty = JSON.stringify(value) !== savedJson

  // Adopt whatever the server says, unless there are unsaved edits in the
  // form — a poll landing mid-edit must not throw away the answer being typed.
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty
  useEffect(() => {
    if (saving || dirtyRef.current) return
    setValue(JSON.parse(savedJson) as T)
  }, [savedJson, saving])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await saveManual(apiUrl, slug, part, value)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  /** Update one field of an object-shaped section. */
  function patch(fields: Partial<T>) {
    setValue((v) => ({ ...v, ...fields }))
  }

  return { value, setValue, patch, dirty, saving, justSaved, error, save }
}
