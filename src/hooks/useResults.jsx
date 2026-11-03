/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useData } from './useData.js'

// Session A owns this file. Contract (keep stable — other pages depend on it):
//   const { results, raceResult, loading, error, lastFetched, stale, refresh,
//           chamberSummary, calledRaces } = useResults()
//   results     -> parsed results.json (last good copy; null before first load)
//   raceResult(raceId) -> results.races[raceId] or null
//   chamberSummary('senate'|'house') -> summarizeChamber(...) below, or null
//   calledRaces -> [{ raceId, ...entry }] with called: true, most recent calledAt first
const ResultsContext = createContext(null)

const n = (x) => (Number.isFinite(x) ? x : 0)

// Seat math for one chamber. Independents count with Democrats (DATA_CONTRACT.md).
// Majority: `majority` seats, or total/2 for the party holding the `tiebreak` (VP).
export function summarizeChamber(summary) {
  if (!summary) return null
  const { total = 0, majority = Math.floor(total / 2) + 1, tiebreak = null, racesUp = 0, racesCalled = 0 } = summary
  const notUp = summary.notUp || {}
  const called = summary.called || {}
  const notUpD = n(notUp.D) + n(notUp.I)
  const notUpR = n(notUp.R)
  const wonD = n(called.D) + n(called.I)
  const wonR = n(called.R)
  const D = notUpD + wonD
  const R = notUpR + wonR
  const uncalled = Math.max(0, total - D - R)
  const toWin = {
    D: tiebreak === 'D' && total % 2 === 0 ? total / 2 : majority,
    R: tiebreak === 'R' && total % 2 === 0 ? total / 2 : majority,
  }
  const needed = { D: Math.max(0, toWin.D - D), R: Math.max(0, toWin.R - R) }
  const control = needed.D === 0 ? 'D' : needed.R === 0 ? 'R' : null
  return {
    total, majority, tiebreak, racesUp, racesCalled,
    racesLeft: Math.max(0, racesUp - racesCalled),
    seats: { D, R, uncalled },
    notUp: { D: notUpD, R: notUpR },
    won: { D: wonD, R: wonR },
    toWin, needed, control,
  }
}

export function ResultsProvider({ children }) {
  const q = useData('results.json')
  const { refresh } = q
  const { pathname, search } = useLocation()

  // Navigating = fresh results (the initial load is already done by useData).
  const firstRoute = useRef(true)
  useEffect(() => {
    if (firstRoute.current) { firstRoute.current = false; return }
    refresh()
  }, [pathname, search, refresh])

  const value = useMemo(() => {
    const results = q.data
    const races = results?.races || {}
    const calledRaces = Object.entries(races)
      .filter(([, r]) => r?.called)
      .map(([raceId, r]) => ({ raceId, ...r }))
      .sort((a, b) => (Date.parse(b.calledAt) || 0) - (Date.parse(a.calledAt) || 0))
    return {
      ...q,
      results,
      raceResult: (raceId) => races[raceId] ?? null,
      chamberSummary: (chamber) => summarizeChamber(results?.chambers?.[chamber]),
      calledRaces,
    }
  }, [q])
  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>
}

export function useResults() {
  const ctx = useContext(ResultsContext)
  if (!ctx) throw new Error('useResults must be used inside <ResultsProvider>')
  return ctx
}
