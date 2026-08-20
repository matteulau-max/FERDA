import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Leaderboard } from './pages/Leaderboard'
import { Scorecard } from './pages/Scorecard'
import { Manual } from './pages/Manual'
import { NewTournament } from './pages/NewTournament'
import { Setup } from './pages/Setup'
import { Tournaments } from './pages/Tournaments'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* The landing page: every tournament, and the way to add one */}
        <Route path="/" element={<Tournaments />} />
        <Route path="/new" element={<NewTournament />} />

        {/* The default tournament — keeps existing links and bookmarks working.
            Its leaderboard has moved to /t/<slug>, since / now lists them all. */}
        <Route path="/manual" element={<Manual />} />
        <Route path="/setup" element={<Setup />} />
        <Route path="/match/:matchId" element={<Scorecard />} />

        {/* A specific tournament, once more than one exists */}
        <Route path="/t/:slug" element={<Leaderboard />} />
        <Route path="/t/:slug/manual" element={<Manual />} />
        <Route path="/t/:slug/setup" element={<Setup />} />
        <Route path="/t/:slug/match/:matchId" element={<Scorecard />} />
      </Routes>
    </BrowserRouter>
  )
}
