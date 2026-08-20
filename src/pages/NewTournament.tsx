import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createTournament } from '../lib/api'

const API_URL = import.meta.env.VITE_API_URL as string

/**
 * Step one of setup: name the event. Everything else — courses, teams,
 * players, sessions, pairings — happens on the setup page afterwards, so
 * this screen stays deliberately small.
 */
export function NewTournament() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const { slug } = await createTournament(API_URL, name.trim())
      navigate(`/t/${slug}/setup`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the tournament')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FDF8E8' }}>
      <div
        className="text-white text-center py-8 px-4"
        style={{ background: 'linear-gradient(135deg, #004d34 0%, #006747 60%, #004d34 100%)' }}
      >
        <p className="text-xs uppercase tracking-widest font-body mb-1" style={{ color: '#FFF200', opacity: 0.85 }}>
          A Tradition Unlike Any Other
        </p>
        <h1 className="font-serif italic text-2xl font-bold" style={{ color: '#FFF200' }}>
          Start a Tournament
        </h1>
      </div>

      <form onSubmit={submit} className="flex-1 px-5 py-8 max-w-md w-full mx-auto">
        <label className="block font-body text-sm font-semibold text-gray-700 mb-2" htmlFor="tournament-name">
          Tournament name
        </label>
        <input
          id="tournament-name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="The Ferda Invitational"
          maxLength={80}
          className="w-full px-3 py-3 rounded-lg border border-gray-300 font-body text-base focus:outline-none focus:ring-2"
          style={{ background: '#fff' }}
        />
        <p className="text-xs text-gray-500 font-body mt-2">
          You can change this later. Next you'll add courses, teams, players and pairings.
        </p>

        {error && <p className="text-sm text-red-600 font-body mt-4">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="w-full mt-6 py-3 rounded-lg font-body font-semibold text-white disabled:opacity-40"
          style={{ background: '#006747' }}
        >
          {saving ? 'Creating…' : 'Create tournament'}
        </button>
      </form>
    </div>
  )
}
