import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchJson, POLL_INTERVAL_MS, STALE_AFTER_MS } from '../lib/data.js'

// Fetches public/data/<file> on mount (i.e. on every route load of the page
// using it), then every POLL_INTERVAL_MS and when the tab becomes visible.
export function useData(file, { interval = POLL_INTERVAL_MS } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true, lastFetched: null })
  const [now, setNow] = useState(() => Date.now())
  const ctrlRef = useRef(null)

  const refresh = useCallback(async () => {
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setState((s) => ({ ...s, loading: true }))
    try {
      const data = await fetchJson(file, { signal: ctrl.signal })
      setState({ data, error: null, loading: false, lastFetched: Date.now() })
    } catch (err) {
      if (err.name === 'AbortError') return
      setState((s) => ({ ...s, error: err, loading: false }))
    }
  }, [file])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, interval)
    const tick = setInterval(() => setNow(Date.now()), 5_000)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
      ctrlRef.current?.abort()
    }
  }, [refresh, interval])

  const stale = state.lastFetched != null && now - state.lastFetched > STALE_AFTER_MS
  return { ...state, stale, refresh }
}
