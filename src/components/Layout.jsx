import { NavLink, Outlet } from 'react-router-dom'
import LastUpdated from './LastUpdated.jsx'
import { useResults } from '../hooks/useResults.jsx'
import './Layout.css'

// Session A owns this file (sticky nav, footer, responsive menu).
const NAV = [
  ['/', 'Dashboard'],
  ['/senate', 'Senate'],
  ['/house', 'House'],
  ['/polls', 'Polls'],
  ['/analysis', 'Analysis'],
  ['/rules', 'Rules'],
]

export default function Layout() {
  const r = useResults()
  return (
    <>
      <header className="nav">
        <div className="nav__inner">
          <NavLink to="/" className="nav__brand">2026 Midterms</NavLink>
          <nav className="nav__links">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
            ))}
          </nav>
          <LastUpdated
            lastFetched={r.lastFetched}
            updated={r.results?.updated}
            stale={r.stale}
            loading={r.loading}
            error={r.error}
            onRefresh={r.refresh}
          />
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  )
}
