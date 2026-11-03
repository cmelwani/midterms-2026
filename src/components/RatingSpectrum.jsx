import { useMemo, useState } from 'react'
import { buildSeats, RATING_LABELS, raceLabel, winnerOf } from './seatModel.js'
import { summarizeChamber } from '../hooks/useResults.jsx'
import { partyInfo } from '../lib/ids.js'
import './RatingSpectrum.css'

// Session A owns this file.
// Props: { chamber, summary: results.chambers[chamber], races: race[], raceResult: fn }
// Seats grouped by Cook rating, Solid D … Solid R; not-up Senate seats count as Solid on each end.
const KEYS = ['solid-D', 'likely-D', 'lean-D', 'toss-up', 'unrated', 'lean-R', 'likely-R', 'solid-R']

export default function RatingSpectrum({ chamber, summary, races = [], raceResult = () => null }) {
  const [sel, setSel] = useState(null)
  const groups = useMemo(() => {
    const g = Object.fromEntries(KEYS.map((k) => [k, { key: k, seats: 0, notUp: 0, races: [] }]))
    // Ratings are pre-election; use the full seat model only to count not-up and missing seats.
    const seats = buildSeats({ ...summary, called: {} }, races, () => null)
    for (const st of seats) {
      const grp = g[st.ratingKey] || g.unrated
      grp.seats++
      if (st.kind === 'notup') grp.notUp++
      if (st.race) grp.races.push(st.race)
    }
    return KEYS.map((k) => g[k])
  }, [summary, races])
  const s = summarizeChamber(summary)
  if (!s || !s.total) return null

  // Tipping-point group: the one containing Democrats' toWin-th seat counting from the left.
  let acc = 0
  let tipping = null
  for (const grp of groups) {
    acc += grp.seats
    if (tipping == null && acc >= s.toWin.D) tipping = grp.key
  }
  const active = groups.find((grp) => grp.key === sel)
  const visible = groups.filter((grp) => grp.seats > 0)
  const name = chamber === 'senate' ? 'Senate' : 'House'

  return (
    <div className="rating-spectrum">
      <div className="rating-spectrum__bar" role="group" aria-label={`${name} seats by Cook rating`}>
        {visible.map((grp) => (
          <button
            key={grp.key}
            type="button"
            className={`rating-spectrum__seg rating-spectrum__seg--${grp.key}${sel === grp.key ? ' rating-spectrum__seg--sel' : ''}`}
            style={{ flexGrow: grp.seats }}
            aria-pressed={sel === grp.key}
            aria-label={`${RATING_LABELS[grp.key]}: ${grp.seats} seats`}
            onMouseEnter={() => setSel(grp.key)}
            onFocus={() => setSel(grp.key)}
            onClick={() => setSel(grp.key)}
          >
            <span className="rating-spectrum__n">{grp.seats}</span>
          </button>
        ))}
        <span className="rating-spectrum__marker" aria-hidden="true" />
      </div>
      <div className="rating-spectrum__scale small muted" aria-hidden="true">
        <span className="party-D">← Safer D</span>
        <span>▲ {s.toWin.D === s.toWin.R ? `${s.toWin.D} to win` : `D ${s.toWin.D} / R ${s.toWin.R}+VP`}</span>
        <span className="party-R">Safer R →</span>
      </div>
      <ul className="rating-spectrum__legend small">
        {visible.map((grp) => (
          <li key={grp.key}>
            <button type="button" className={`rating-spectrum__chip${sel === grp.key ? ' rating-spectrum__chip--sel' : ''}`} onClick={() => setSel(sel === grp.key ? null : grp.key)} aria-pressed={sel === grp.key}>
              <i className={`rating-spectrum__key rating-spectrum__seg--${grp.key}`} />
              {RATING_LABELS[grp.key]} <b className="num">{grp.seats}</b>
            </button>
          </li>
        ))}
      </ul>
      {tipping && tipping !== 'unrated' && (
        <p className="small muted rating-spectrum__tip">
          Tipping point: the {s.toWin.D}th seat from the left falls in <strong>{RATING_LABELS[tipping]}</strong>.
        </p>
      )}
      <div className="rating-spectrum__detail" aria-live="polite">
        {active ? (
          <>
            <strong>{RATING_LABELS[active.key]}</strong> — {active.seats} seat{active.seats === 1 ? '' : 's'}
            {active.notUp > 0 && <span className="muted"> ({active.notUp} not up in 2026)</span>}
            {active.races.length > 0 ? (
              <ul className="rating-spectrum__races">
                {active.races.map((race) => {
                  const w = winnerOf(race, raceResult(race.id))
                  return (
                    <li key={race.id}>
                      <span className="rating-spectrum__race">{raceLabel(race)}</span>
                      {w && <span className={`party-${w.party}`}> ✓ {w.name.split(' ').slice(-1)[0]} ({partyInfo(w.party).short})</span>}
                    </li>
                  )
                })}
              </ul>
            ) : active.seats > active.notUp && <p className="muted small">Race details not loaded yet.</p>}
          </>
        ) : (
          <span className="muted small">Hover or tap a segment to list its races.</span>
        )}
      </div>
    </div>
  )
}

