import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useData } from '../hooks/useData.js'
import { useResults } from '../hooks/useResults.jsx'
import RaceCard from '../components/RaceCard.jsx'
import USTileMap from '../components/USTileMap.jsx'
import RaceSpectrum from '../components/RaceSpectrum.jsx'
import { formatDate, partyFill, raceTitle, ratingFill, ratingLabel, SPECTRUM_FILLS, SPECTRUM_LABELS, SPECTRUM_ORDER } from '../components/RatingBadge.lib.js'
import './House.css'

const CATS = { 'toss-up': 'Toss-up', lean: 'Lean', likely: 'Likely', solid: 'Solid' }
const SHADES = ['var(--ind-light)', '#ddd6fe', '#c4b5fd', '#a78bfa', '#7c3aed', '#5b21b6']
const shade = (n) => SHADES[n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 6 ? 3 : n <= 10 ? 4 : 5]

export default function House() {
  const { data, error, loading, refresh } = useData('house_races.json')
  const { raceResult } = useResults()
  const [params, setParams] = useSearchParams()
  const [highlight, setHighlight] = useState(null)
  const [openOverride, setOpenOverride] = useState({})
  const races = useMemo(() => data?.races ?? [], [data])

  const showAll = params.get('show') === 'all'
  const state = params.get('state') || ''
  const rating = params.get('rating') || ''
  const inc = params.get('inc') || ''
  const q = params.get('q') || ''
  const setParam = (k, v) => setParams((p) => { const n = new URLSearchParams(p); if (v) n.set(k, v); else n.delete(k); return n }, { replace: true })

  const states = useMemo(() => [...new Map(races.map((r) => [r.state, r.stateName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [races])

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return races.filter((r) => {
      if (!showAll && !r.competitive && !(needle || state || rating || inc)) return false
      if (state && r.state !== state) return false
      if (rating && r.rating?.category !== rating) return false
      if (inc === 'open' ? r.incumbent?.running : inc && r.incumbent?.party !== inc) return false
      if (needle) {
        const hay = `${raceTitle(r)} ${r.state}${r.district} ${r.stateName} ${r.incumbent?.name || ''} ${r.candidates.map((c) => c.name).join(' ')}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      return true
    })
  }, [races, showAll, state, rating, inc, q])

  const groups = useMemo(() => {
    const m = new Map()
    for (const r of shown) m.set(r.state, [...(m.get(r.state) || []), r])
    return [...m.entries()].sort((a, b) => a[1][0].stateName.localeCompare(b[1][0].stateName))
  }, [shown])
  const byState = useMemo(() => races.reduce((m, r) => m.set(r.state, [...(m.get(r.state) || []), r]), new Map()), [races])

  const mapValues = useMemo(() => {
    const v = {}
    for (const [st, rs] of byState) {
      const comp = rs.filter((r) => r.competitive)
      const tossups = comp.filter((r) => r.rating.category === 'toss-up').length
      const calledN = rs.filter((r) => raceResult(r.id)?.called).length
      v[st] = {
        fill: shade(comp.length),
        textColor: comp.length > 3 ? '#fff' : 'var(--text)',
        label: String(comp.length),
        tooltip: `${rs[0].stateName}: ${rs.length} seat${rs.length > 1 ? 's' : ''}, ${comp.length} competitive (${tossups} toss-up)${calledN ? `, ${calledN} called` : ''}${comp.length ? `\n${comp.map((r) => `${raceTitle(r)} ${ratingLabel(r.rating)}`).join(', ')}` : ''}`,
      }
    }
    return v
  }, [byState, raceResult])

  const competitiveCount = races.filter((r) => r.competitive).length
  const spectrumRaces = useMemo(() => races.filter((r) => r.competitive && (!state || r.state === state)), [races, state])
  const counts = SPECTRUM_ORDER.map((k) => ({ k, n: races.filter((r) => (r.rating.category === 'toss-up' ? 'toss-up' : `${r.rating.category}-${r.rating.party}`) === k).length }))

  const cellFill = (r) => {
    const res = raceResult(r.id)
    const w = res?.called && r.candidates.find((c) => c.id === res.winner)
    return w ? partyFill(w.party) : ratingFill(r.rating)
  }
  const isOpen = (st) => openOverride[st] ?? (groups.length <= 12 || Boolean(state || q))
  const jump = (id) => {
    const r = races.find((x) => x.id === id)
    if (!r) return
    if (!shown.includes(r)) { setParams(new URLSearchParams({ state: r.state }), { replace: true }) }
    setOpenOverride((o) => ({ ...o, [r.state]: true }))
    setHighlight(id)
    setTimeout(() => { const el = document.getElementById(id); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.focus({ preventScroll: true }) }, 50)
  }

  if (loading && !data) return <div className="page"><h1>House</h1><p className="muted" role="status">Loading House races…</p></div>
  if (error && !data) return <div className="page"><h1>House</h1><p className="house__error" role="alert">Couldn't load House races: {String(error.message || error)} <button type="button" onClick={refresh}>Retry</button></p></div>

  return (
    <div className="page house">
      <header>
        <h1 className="house__title">House</h1>
        <p className="muted house__sub">All 435 districts on the maps in effect for 2026 · {competitiveCount} competitive (Cook toss-up / lean / likely{races[0]?.rating?.asOf ? `, ${formatDate(races[0].rating.asOf)}` : ''}) · 218 for a majority</p>
      </header>

      <ul className="house__summary" aria-label="Seats by Cook rating">
        {counts.map(({ k, n }) => (
          <li key={k} style={{ borderTopColor: SPECTRUM_FILLS[k] }}><strong>{n}</strong><span>{SPECTRUM_LABELS[k]}</span></li>
        ))}
      </ul>

      <div className="house__viz">
        <section aria-labelledby="house-map-h">
          <h2 id="house-map-h" className="house__h2">Competitive seats by state <span className="muted">(click to filter)</span></h2>
          <USTileMap
            title="Number of competitive House seats per state"
            values={mapValues}
            selected={state || undefined}
            onSelect={(st) => setParam('state', st === state ? '' : st)}
            legend={[{ fill: SHADES[0], label: '0' }, { fill: SHADES[1], label: '1' }, { fill: SHADES[2], label: '2–3' }, { fill: SHADES[3], label: '4–6' }, { fill: SHADES[4], label: '7–10' }, { fill: SHADES[5], label: '11+' }]}
          />
        </section>
        <section aria-labelledby="house-spec-h">
          <h2 id="house-spec-h" className="house__h2">Competitive seats, Solid D → Solid R{state ? ` (${state})` : ''}</h2>
          <RaceSpectrum races={spectrumRaces} raceResult={raceResult} onSelect={jump} title="Competitive House races from Lean D to Lean R" />
        </section>
      </div>

      <form className="house__filters" role="search" aria-label="Filter House races" onSubmit={(e) => e.preventDefault()}>
        <label>Search
          <input type="search" value={q} placeholder="District or candidate, e.g. TX-28" onChange={(e) => setParam('q', e.target.value)} />
        </label>
        <label>State
          <select value={state} onChange={(e) => setParam('state', e.target.value)}>
            <option value="">All states</option>
            {states.map(([s, n]) => <option key={s} value={s}>{n}</option>)}
          </select>
        </label>
        <label>Rating
          <select value={rating} onChange={(e) => setParam('rating', e.target.value)}>
            <option value="">Any</option>
            {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label>Incumbent
          <select value={inc} onChange={(e) => setParam('inc', e.target.value)}>
            <option value="">Any</option><option value="D">Democrat</option><option value="R">Republican</option><option value="open">Open seat</option>
          </select>
        </label>
        <label className="house__toggle">
          <input type="checkbox" checked={showAll} onChange={(e) => setParam('show', e.target.checked ? 'all' : '')} />
          Show all 435
        </label>
        {(state || rating || inc || q || showAll) && <button type="button" className="house__reset" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Reset</button>}
      </form>
      <p className="muted house__count" aria-live="polite">
        Showing {shown.length} {showAll || state || q || rating || inc ? '' : 'competitive '}race{shown.length === 1 ? '' : 's'} in {groups.length} state{groups.length === 1 ? '' : 's'}
        {!showAll && !state && !q && !rating && !inc && <> · <button type="button" className="house__link" onClick={() => setParam('show', 'all')}>Show all 435</button></>}
      </p>

      {groups.length === 0 && <p className="house__empty">No districts match these filters.</p>}

      {groups.map(([st, rs]) => {
        const all = byState.get(st) || []
        const open = isOpen(st)
        return (
          <section key={st} className="house__group" aria-labelledby={`house-g-${st}`}>
            <h2 className="house__group-h" id={`house-g-${st}`}>
              <button type="button" aria-expanded={open} onClick={() => setOpenOverride((o) => ({ ...o, [st]: !open }))}>
                <span className="house__caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
                {rs[0].stateName}
                <span className="muted house__group-n">{rs.length} shown · {all.length} seat{all.length > 1 ? 's' : ''}</span>
              </button>
              <span className="house__strip" role="list" aria-label={`${rs[0].stateName} seats by rating`}>
                {all.map((r) => (
                  <button key={r.id} type="button" role="listitem" className="house__strip-cell" style={{ background: cellFill(r) }} title={`${raceTitle(r)}: ${ratingLabel(r.rating)}${raceResult(r.id)?.called ? ' (called)' : ''}`} aria-label={`${raceTitle(r)}: ${ratingLabel(r.rating)}`} onClick={() => jump(r.id)} />
                ))}
              </span>
            </h2>
            {open && (
              <div className="house__cards">
                {rs.map((r) => <RaceCard key={r.id} race={r} result={raceResult(r.id)} highlighted={highlight === r.id} />)}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
