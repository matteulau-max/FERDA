import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Leaderboard } from './pages/Leaderboard'
import { Scorecard } from './pages/Scorecard'
import { Rules } from './pages/Rules'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/rules" element={<Rules />} />
        <Route path="/match/:matchId" element={<Scorecard />} />
      </Routes>
    </BrowserRouter>
  )
}
