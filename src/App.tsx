import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Leaderboard } from './pages/Leaderboard'
import { Scorecard } from './pages/Scorecard'
import { Manual } from './pages/Manual'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/match/:matchId" element={<Scorecard />} />
      </Routes>
    </BrowserRouter>
  )
}
