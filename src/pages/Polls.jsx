import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData.js'
import RatingBadge from '../components/RatingBadge.jsx'
import PollMarginChart from '../components/PollMarginChart.jsx'
import {
  absoluteTime, isStalePoll, marginLabel, pollPct, raceLabel, relativeTime, signedMargin, STALE_POLL_DAYS,
} from '../components/pollUtils.js'
import './Polls.css'

const RATING_FILTERS = [
  { value: 'all', label: 'All ratings' },
  { value: 'toss-up', label: 'Toss-up' },
  { value: 'lean', label: 'Lean' },
  { value: 'likely', label: 'Likely' },
  { value: 'solid', label: 'Solid' },
  { value: 'competitive', label: 'Competitive (not solid)' },
]

function MarginText({ margin }) {
  const party = margin?.party && ['D', 'R'].includes(margin.party) ? margin.party : 'O'
  return <span className={`polls__margin polls__margin--${party}`}>{marginLabel(margin)}</span>
}

function Updated({ iso, stale }) {
  if (!iso) return <span className="muted">—</span>
  return (
    <span className="polls__updated">
      <time dateTime={iso} title={absoluteTime(iso)}>{relativeTime(iso)}</time>
      <span className="muted polls__abs">{absoluteTime(iso)}</span>
      {stale && <span className="polls__stale" title={`Older than ${STALE_POLL_DAYS} days`}>Stale</span>}
    </span>
  )
}

function Candidates({ race }) {
  const cands = (race.candidates || []).filter((c) => pollPct(race.poll, c.id) != null)
  if (!cands.length) return <span className="muted">No average</span>
  return (
    <ul className="polls__cands">
      {cands.map((c) => (
        <li key={c.id}>
          <Link to={`/candidate/${c.id}`} className={`party-${c.party}`}>{c.name}</Link>
          <span className="polls__pct">{pollPct(race.poll, c.id)}%</span>
        </li>
      ))}
    </ul>
  )
}

function Others({ others }) {
  if (!others?.length) return <span className="muted">—</span>
  return (
    <ul className="polls__others">
      {others.map((o) => (
        <li key={o.source}>
          {o.url ? <a href={o.url} target="_blank" rel="noopener noreferrer">{o.source}</a> : o.source}
          {' '}<MarginText margin={o.margin} />
        </li>
      ))}
    </ul>
  )
}

export default function Polls() {
  const senate = useData('senate_races.json')
  const house = useData('house_races.json')
  const [chamber, setChamber] = useState('all')
  const [rating, setRating] = useState('all')
  const [sort, setSort] = useState('margin')
  const [showNoPoll, setShowNoPoll] = useState(false)

  const all = useMemo(() => [
    ...(senate.data?.races || []),
    ...(house.data?.races || []),
  ], [senate.data, house.data])

  const filtered = useMemo(() => all.filter((r) => {
    if (chamber !== 'all' && r.chamber !== chamber) return false
    const cat = r.rating?.category
    if (rating === 'competitive' && (!cat || cat === 'solid')) return false
    if (!['all', 'competitive'].includes(rating) && cat !== rating) return false
    return true
  }), [all, chamber, rating])

  const withPoll = filtered.filter((r) => r.poll)
  const noPoll = filtered.filter((r) => !r.poll)
  const sorted = useMemo(() => [...withPoll].sort((a, b) => {
    if (sort === 'recent') return (Date.parse(b.poll.asOf) || 0) - (Date.parse(a.poll.asOf) || 0)
    return Math.abs(signedMargin(a.poll.margin, a) ?? 99) - Math.abs(signedMargin(b.poll.margin, b) ?? 99)
  }), [withPoll, sort])
  const rows = showNoPoll ? [...sorted, ...noPoll] : sorted

  const loading = (senate.loading && !senate.data) || (house.loading && !house.data)
  const error = senate.error || house.error

  const jumpTo = (id) => {
    const el = document.getElementById(`poll-${id}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.focus({ preventScroll: true })
  }

  return (
    <div className="page polls">
      <h1>Polling averages</h1>
      <p className="muted polls__intro">
        Latest public polling averages for each race, with other aggregators side by side. Averages older
        than {STALE_POLL_DAYS} days are flagged stale. A lead inside about ±3 points is within typical polling error.
      </p>

      <form className="polls__filters" onSubmit={(e) => e.preventDefault()} aria-label="Filter polls">
        <label>Chamber
          <select value={chamber} onChange={(e) => setChamber(e.target.value)}>
            <option value="all">Senate + House</option>
            <option value="senate">Senate</option>
            <option value="house">House</option>
          </select>
        </label>
        <label>Rating
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            {RATING_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </label>
        <label>Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="margin">Closest margin</option>
            <option value="recent">Most recent</option>
          </select>
        </label>
        <label className="polls__toggle">
          <input type="checkbox" checked={showNoPoll} onChange={(e) => setShowNoPoll(e.target.checked)} />
          Show races without polling ({noPoll.length})
        </label>
      </form>

      {error && !all.length && <p className="polls__error" role="alert">Couldn&apos;t load race data: {error.message}</p>}
      {loading && <p className="muted" role="status">Loading polls…</p>}

      {!loading && !error && !rows.length && (
        <p className="polls__empty">No races with polling match these filters.{noPoll.length > 0 && !showNoPoll && ' Try showing races without polling.'}</p>
      )}

      {sorted.length > 0 && <PollMarginChart races={sorted} onSelect={jumpTo} />}

      {rows.length > 0 && (
        <>
          <p className="muted polls__count" aria-live="polite">{withPoll.length} race{withPoll.length === 1 ? '' : 's'} with polling{showNoPoll ? `, ${noPoll.length} without` : ''}</p>
          <table className="polls__table">
            <caption className="polls__sr">Polling averages by race</caption>
            <thead>
              <tr>
                <th scope="col">Race</th>
                <th scope="col">Rating</th>
                <th scope="col">Candidates</th>
                <th scope="col">Margin</th>
                <th scope="col">Source</th>
                <th scope="col">Updated</th>
                <th scope="col">Other aggregators</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const stale = r.poll && isStalePoll(r.poll)
                return (
                  <tr key={r.id} id={`poll-${r.id}`} tabIndex={-1} className={`${stale ? 'is-stale' : ''}${r.poll ? '' : ' is-nopoll'}`}>
                    <th scope="row" data-label="Race">
                      <Link to={r.chamber === 'senate' ? `/senate#${r.id}` : `/house#${r.id}`}>{raceLabel(r)}</Link>
                    </th>
                    <td data-label="Rating"><RatingBadge rating={r.rating} /></td>
                    {r.poll ? (
                      <>
                        <td data-label="Candidates"><Candidates race={r} /></td>
                        <td data-label="Margin"><MarginText margin={r.poll.margin} /></td>
                        <td data-label="Source">{r.poll.url ? <a href={r.poll.url} target="_blank" rel="noopener noreferrer">{r.poll.source}</a> : r.poll.source}</td>
                        <td data-label="Updated"><Updated iso={r.poll.asOf} stale={stale} /></td>
                        <td data-label="Others"><Others others={r.poll.others} /></td>
                      </>
                    ) : (
                      <td colSpan={5} className="muted" data-label="Polling">No public polling average</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
