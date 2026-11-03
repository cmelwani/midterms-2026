// Session A owns this file.
// Props: { lastFetched: ms|null, updated: ISO string|null (file's own "updated"),
//          stale: bool, loading: bool, error: Error|null, onRefresh: fn }
export default function LastUpdated({ lastFetched, updated, stale, loading, error, onRefresh }) {
  let text = 'Loading…'
  if (error) text = `Fetch failed: ${error.message}`
  else if (lastFetched) text = `Fetched ${new Date(lastFetched).toLocaleTimeString()}`
  return (
    <span className={`last-updated${stale ? ' last-updated--stale' : ''}`} title={updated ? `Data updated ${updated}` : undefined}>
      {loading && lastFetched ? '↻ ' : ''}{text}
      {stale ? ' (stale)' : ''}
      {onRefresh && <button type="button" onClick={onRefresh}>Refresh</button>}
    </span>
  )
}
