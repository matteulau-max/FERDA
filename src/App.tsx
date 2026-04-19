import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Leaderboard } from './pages/Leaderboard'
import { Scorecard } from './pages/Scorecard'

export default function App() {
  return (
    <BrowserRouter basename="/FERDA">
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/match/:matchId" element={<Scorecard />} />
      </Routes>
    </BrowserRouter>
  )
}
