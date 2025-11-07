import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import TrainingMode from './pages/TrainingMode'
import AnalysisMode from './pages/AnalysisMode'
import CoachingMode from './pages/CoachingMode'
import History from './pages/History'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/training" element={<TrainingMode />} />
          <Route path="/analysis" element={<AnalysisMode />} />
          <Route path="/coaching" element={<CoachingMode />} />
          <Route path="/history" element={<History />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App

