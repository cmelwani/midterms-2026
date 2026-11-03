import { useEffect, useState } from 'react'
import { STALE_AFTER_MS } from '../lib/data.js'
import './LastUpdated.css'

// Session A owns this file.
// Props: { lastFetched: ms|null, updated: ISO string|null (file's own "updated"),
//          stale: bool, loading: bool, error: Error|null, onRefresh: fn }

function relativeTime(ms, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m ago`
}

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const fullFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' })

export default function LastUpdated({ lastFetched, updated, stale, loading, error, onRefresh }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const isStale = Boolean(stale || (lastFetched && now - lastFetched > STALE_AFTER_MS))
  const updatedMs = updated ? Date.parse(updated) : NaN
  const state = error ? 'error' : isStale ? 'stale' : 'ok'

  let label
  if (!lastFetched) label = error ? 'Results unavailable' : 'Loading results…'
  else label = `Checked ${relativeTime(lastFetched, now)}`

  const title = [
    lastFetched && `Last checked: ${fullFmt.format(lastFetched)}`,
    !Number.isNaN(updatedMs) && `Results file updated: ${fullFmt.format(updatedMs)}`,
    isStale && 'No successful update in over 2 minutes.',
    error && `Last fetch failed: ${error.message}`,
  ].filter(Boolean).join('\n')

  return (
    <div className={`last-updated last-updated--${state}`} title={title || undefined} role="status" aria-live="polite">
      <span className={`last-updated__icon${loading ? ' last-updated__icon--spin' : ''}`} aria-hidden="true" />
      <span className="last-updated__text">
        {label}
        {state === 'stale' && <strong className="last-updated__flag"> · stale</strong>}
        {state === 'error' && lastFetched && <strong className="last-updated__flag"> · offline</strong>}
      </span>
      {!Number.isNaN(updatedMs) && (
        <span className="last-updated__file">
          <span className="sr-only">Results file updated </span>
          <span aria-hidden="true">data </span>
          <time dateTime={updated}>{timeFmt.format(updatedMs)}</time>
        </span>
      )}
      {onRefresh && (
        <button type="button" className="last-updated__btn" onClick={onRefresh} disabled={loading} aria-label="Refresh results now">
          ↻
        </button>
      )}
    </div>
  )
}
