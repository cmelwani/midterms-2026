import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
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

const REPO_URL = 'https://github.com/cmelwani/midterms-2026'

export default function Layout() {
  const r = useResults()
  const { pathname } = useLocation()
  // Menu is open only for the route it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState(null)
  const open = openOn === pathname

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpenOn(null)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="layout">
      <a className="layout__skip" href="#main">Skip to content</a>
      <header className="nav">
        <div className="nav__inner">
          <NavLink to="/" className="nav__brand" aria-label="2026 Midterms — Dashboard">
            <span className="nav__logo" aria-hidden="true"><i /><i /></span>
            2026 Midterms
          </NavLink>
          <button
            type="button"
            className="nav__toggle"
            aria-expanded={open}
            aria-controls="nav-links"
            onClick={() => setOpenOn(open ? null : pathname)}
          >
            <span className="nav__burger" aria-hidden="true" />
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
          <nav id="nav-links" className={`nav__links${open ? ' nav__links--open' : ''}`} aria-label="Main">
            {NAV.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
            ))}
          </nav>
          <div className="nav__status">
            <LastUpdated
              lastFetched={r.lastFetched}
              updated={r.results?.updated}
              stale={r.stale}
              loading={r.loading}
              error={r.error}
              onRefresh={r.refresh}
            />
          </div>
        </div>
      </header>
      <main id="main" className="layout__main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer__inner">
          <p>
            <strong>Sources:</strong>{' '}
            <a href="https://ballotpedia.org/United_States_Congress_elections,_2026">Ballotpedia</a>,{' '}
            <a href="https://www.fec.gov/data/elections/">FEC</a>, official state election offices; ratings from the{' '}
            <a href="https://www.cookpolitical.com/ratings">Cook Political Report</a>; polling averages from{' '}
            <a href="https://www.realclearpolling.com/">RealClearPolling</a>,{' '}
            <a href="https://www.racetothewh.com/">Race to the WH</a> and{' '}
            <a href="https://split-ticket.org/">Split Ticket</a>. Calls are entered by hand and may lag official results.
          </p>
          <p className="muted">
            Independent project — not affiliated with any campaign, party, government agency or news organization.{' '}
            <a href={REPO_URL}>Source on GitHub</a>.
          </p>
        </div>
      </footer>
    </div>
  )
}
