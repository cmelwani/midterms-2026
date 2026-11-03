import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ResultsProvider } from './hooks/useResults.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Rules from './pages/Rules.jsx'
import Senate from './pages/Senate.jsx'
import House from './pages/House.jsx'
import Polls from './pages/Polls.jsx'
import Analysis from './pages/Analysis.jsx'
import Candidate from './pages/Candidate.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  return (
    <ResultsProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="rules" element={<Rules />} />
          <Route path="senate" element={<Senate />} />
          <Route path="house" element={<House />} />
          <Route path="polls" element={<Polls />} />
          <Route path="analysis" element={<Analysis />} />
          <Route path="candidate/:id" element={<Candidate />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ResultsProvider>
  )
}
