/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo } from 'react'
import { useData } from './useData.js'

// Session A owns this file. Contract (keep stable — other pages depend on it):
//   const { results, raceResult, loading, error, lastFetched, stale, refresh } = useResults()
//   results     -> parsed results.json (or null before first load)
//   raceResult(raceId) -> results.races[raceId] or null
const ResultsContext = createContext(null)

export function ResultsProvider({ children }) {
  const q = useData('results.json')
  const value = useMemo(
    () => ({
      ...q,
      results: q.data,
      raceResult: (raceId) => q.data?.races?.[raceId] ?? null,
    }),
    [q],
  )
  return <ResultsContext.Provider value={value}>{children}</ResultsContext.Provider>
}

export function useResults() {
  const ctx = useContext(ResultsContext)
  if (!ctx) throw new Error('useResults must be used inside <ResultsProvider>')
  return ctx
}
