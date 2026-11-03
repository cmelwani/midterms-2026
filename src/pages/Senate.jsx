import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData.js'
import { useResults } from '../hooks/useResults.jsx'
import RaceCard, { RaceStatus } from '../components/RaceCard.jsx'
import RatingBadge from '../components/RatingBadge.jsx'
import USTileMap from '../components/USTileMap.jsx'
import { senateMapValues, SENATE_MAP_LEGEND } from '../components/senateMap.js'
import RaceSpectrum from '../components/RaceSpectrum.jsx'
import { marginLabel, ratingScore, SPECTRUM_FILLS, SPECTRUM_LABELS, SPECTRUM_ORDER, formatDate } from '../components/RatingBadge.lib.js'
import './Senate.css'

const CATS = ['toss-up', 'lean', 'likely', 'solid']
const CAT_NAME = { 'toss-up': 'Toss-up', lean: 'Lean', likely: 'Likely', solid: 'Solid' }

export default function Senate() {
  const { data, error, loading, refresh } = useData('senate_races.json')
  const { raceResult } = useResults()
  const [cat, setCat] = useState('all')
  const [called, setCalled] = useState('all')
  const [sort, setSort] = useState('state')
  const [view, setView] = useState('table')
  const [highlight, setHighlight] = useState(null)
  const races = useMemo(() => data?.races ?? [], [data])

  const shown = useMemo(() => {
    const list = races.filter((r) => {
      if (cat !== 'all' && r.rating?.category !== cat) return false
      const c = Boolean(raceResult(r.id)?.called)
      return called === 'all' || (called === 'called' ? c : !c)
    })
    return sort === 'state'
      ? [...list].sort((a, b) => a.stateName.localeCompare(b.stateName) || a.seatClass - b.seatClass)
      : [...list].sort((a, b) => Math.abs(ratingScore(a.rating)) - Math.abs(ratingScore(b.rating)) || Math.abs(a.poll?.margin?.points ?? 99) - Math.abs(b.poll?.margin?.points ?? 99))
  }, [races, cat, called, sort, raceResult])

  const mapValues = useMemo(() => senateMapValues(races, raceResult), [races, raceResult])

  const counts = useMemo(() => SPECTRUM_ORDER.map((k) => ({ k, n: races.filter((r) => (r.rating?.category === 'toss-up' ? 'toss-up' : `${r.rating?.category}-${r.rating?.party}`) === k).length })), [races])
  const calledCount = races.filter((r) => raceResult(r.id)?.called).length

  const jump = (id) => {
    setCat('all'); setCalled('all')
    setHighlight(id)
    requestAnimationFrame(() => {
      const el = document.getElementById(view === 'table' ? `row-${id}` : id) || document.getElementById(id)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.focus({ preventScroll: true })
    })
  }
  const selectState = (st) => {
    const r = races.filter((x) => x.state === st).sort((a, b) => Math.abs(ratingScore(a.rating)) - Math.abs(ratingScore(b.rating)))[0]
    if (r) jump(r.id)
  }

  if (loading && !data) return <div className="page"><h1>Senate</h1><p className="muted" role="status">Loading Senate races…</p></div>
  if (error && !data) return <div className="page"><h1>Senate</h1><p className="senate__error" role="alert">Couldn't load Senate races: {String(error.message || error)} <button type="button" onClick={refresh}>Retry</button></p></div>

  return (
    <div className="page senate">
      <header className="senate__head">
        <h1>Senate</h1>
        <p className="muted">{races.length} races · 33 Class 2 seats + Ohio and Florida specials · {calledCount} called · ratings: Cook Political Report{races[0]?.rating?.asOf ? `, ${formatDate(races[0].rating.asOf)}` : ''}</p>
      </header>

      <ul className="senate__summary" aria-label="Races by rating">
        {counts.map(({ k, n }) => (
          <li key={k} className="senate__count" style={{ borderTopColor: SPECTRUM_FILLS[k] }}>
            <span className="senate__count-n">{n}</span><span className="senate__count-l">{SPECTRUM_LABELS[k]}</span>
          </li>
        ))}
      </ul>

      <div className="senate__viz">
        <section aria-labelledby="senate-map-h">
          <h2 id="senate-map-h" className="senate__h2">Map by rating</h2>
          <USTileMap
            title="Senate races by state, colored by Cook rating or called winner"
            values={mapValues}
            onSelect={selectState}
            selected={highlight ? races.find((r) => r.id === highlight)?.state : undefined}
            legend={SENATE_MAP_LEGEND}
          />
        </section>
        <section aria-labelledby="senate-spec-h">
          <h2 id="senate-spec-h" className="senate__h2">Rating spectrum</h2>
          <RaceSpectrum races={races} raceResult={raceResult} onSelect={jump} title="Senate races from Solid D to Solid R" />
        </section>
      </div>

      <form className="senate__filters" onSubmit={(e) => e.preventDefault()} aria-label="Filter Senate races">
        <label>Rating
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="all">All ratings</option>
            {CATS.map((c) => <option key={c} value={c}>{CAT_NAME[c]}</option>)}
          </select>
        </label>
        <label>Status
          <select value={called} onChange={(e) => setCalled(e.target.value)}>
            <option value="all">All</option><option value="called">Called</option><option value="uncalled">Not called</option>
          </select>
        </label>
        <label>Sort
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="state">State (A–Z)</option><option value="competitive">Most competitive</option>
          </select>
        </label>
        <fieldset className="senate__view">
          <legend className="sr-only">View</legend>
          {['table', 'cards'].map((v) => (
            <button key={v} type="button" aria-pressed={view === v} className={view === v ? 'is-active' : ''} onClick={() => setView(v)}>{v === 'table' ? 'Table' : 'Cards'}</button>
          ))}
        </fieldset>
        <span className="muted senate__shown" aria-live="polite">{shown.length} of {races.length} shown</span>
      </form>

      {shown.length === 0 && <p className="muted senate__empty">No races match these filters.</p>}

      {shown.length > 0 && view === 'table' && (
        <div className="senate__table-wrap">
          <table className="senate__table">
            <thead><tr><th scope="col">State</th><th scope="col">Class</th><th scope="col">Incumbent</th><th scope="col">Candidates</th><th scope="col">Rating</th><th scope="col">Poll avg</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {shown.map((r) => {
                const res = raceResult(r.id)
                return (
                  <tr key={r.id} id={`row-${r.id}`} tabIndex={-1} className={highlight === r.id ? 'is-highlight' : undefined}>
                    <th scope="row">{r.stateName}{r.special && <span className="senate__special">special</span>}</th>
                    <td>{r.seatClass}</td>
                    <td>{r.incumbent ? <>{r.incumbent.name} ({r.incumbent.party}){!r.incumbent.running && <span className="senate__open">open</span>}</> : '—'}</td>
                    <td className="senate__cands">
                      {r.candidates.map((c) => {
                        const won = res?.called && res.winner === c.id
                        const pct = res?.votes?.find((v) => v.candidateId === c.id)?.pct
                        return (
                          <span key={c.id} className={`senate__cand${won ? ' is-winner' : ''}`}>
                            <span className={`senate__chip senate__chip--${c.party}`} aria-hidden="true" />
                            <Link to={`/candidate/${c.id}`}>{c.name}</Link> <span className="muted">({c.party}){c.incumbent ? ' inc.' : ''}</span>
                            {pct != null && <span className="senate__pct"> {pct}%</span>}
                            {won && <span aria-label="winner"> ✓</span>}
                          </span>
                        )
                      })}
                    </td>
                    <td><RatingBadge rating={r.rating} /></td>
                    <td>{r.poll ? <span title={`${r.poll.source}, ${formatDate(r.poll.asOf)}`}>{marginLabel(r.poll.margin)} <span className="muted senate__src">{r.poll.source}</span></span> : <span className="muted">—</span>}</td>
                    <td><RaceStatus race={r} result={res} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className={`senate__cards${view === 'table' ? ' senate__cards--mobile-only' : ''}`}>
        {shown.map((r) => <RaceCard key={r.id} race={r} result={raceResult(r.id)} highlighted={highlight === r.id} />)}
      </div>
    </div>
  )
}
