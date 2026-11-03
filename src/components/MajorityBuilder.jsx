import { useMemo, useState } from 'react'
import SeatBar from './SeatBar.jsx'
import RatingBadge from './RatingBadge.jsx'
import { raceLabel, sideOf, winnerOf } from './seatModel.js'
import { summarizeChamber } from '../hooks/useResults.jsx'
import './MajorityBuilder.css'

// Session A owns this file.
// Props: { chambers: results.chambers, races: race[] (both chambers), raceResult: fn }
// What-if: assign uncalled toss-up / lean races to D or R and see who reaches a majority.
const NEXT = { undefined: 'D', D: 'R', R: undefined }
const PICK_LABEL = { D: 'Dem', R: 'Rep', undefined: '?' }
const CHAMBERS = [['senate', 'Senate'], ['house', 'House']]

export default function MajorityBuilder({ chambers, races = [], raceResult = () => null }) {
  const [picks, setPicks] = useState({})
  const [assumeSafe, setAssumeSafe] = useState(true)

  const model = useMemo(() => {
    const out = {}
    for (const [ch] of CHAMBERS) {
      const summary = chambers?.[ch]
      if (!summary) continue
      const chRaces = races.filter((r) => r.chamber === ch)
      const add = { D: 0, R: 0 }
      const contested = []
      for (const race of chRaces) {
        const w = winnerOf(race, raceResult(race.id))
        const cat = race.rating?.category
        const close = cat === 'toss-up' || cat === 'lean'
        if (close) contested.push({ race, locked: w ? sideOf(w.party) : null, winner: w })
        if (w) continue
        const pick = picks[race.id]
        if (close && pick) add[pick]++
        else if (!close && assumeSafe && sideOf(race.rating?.party)) add[sideOf(race.rating.party)]++
      }
      const called = summary.called || {}
      const what = {
        ...summary,
        called: { D: (called.D || 0) + (called.I || 0) + add.D, I: 0, R: (called.R || 0) + add.R },
      }
      const s = summarizeChamber(what)
      contested.sort((a, b) => (a.race.rating.category === 'toss-up' ? -1 : 0) - (b.race.rating.category === 'toss-up' ? -1 : 0) || raceLabel(a.race).localeCompare(raceLabel(b.race)))
      out[ch] = { what, s, contested }
    }
    return out
  }, [chambers, races, raceResult, picks, assumeSafe])

  const cycle = (id) => setPicks((p) => {
    const next = { ...p }
    const v = NEXT[p[id]]
    if (v) next[id] = v
    else delete next[id]
    return next
  })
  const fillLeans = () => setPicks((p) => {
    const next = { ...p }
    for (const { race, locked } of Object.values(model).flatMap((m) => m.contested)) {
      if (!locked && race.rating.category === 'lean' && sideOf(race.rating.party)) next[race.id] = sideOf(race.rating.party)
    }
    return next
  })
  const nPicked = Object.keys(picks).length

  return (
    <div className="majority-builder">
      <div className="majority-builder__controls">
        <label className="majority-builder__check">
          <input type="checkbox" checked={assumeSafe} onChange={(e) => setAssumeSafe(e.target.checked)} />
          Give solid &amp; likely races to the favored party
        </label>
        <button type="button" className="btn" onClick={fillLeans}>Leans go as rated</button>
        <button type="button" className="btn" onClick={() => setPicks({})} disabled={!nPicked}>Reset{nPicked ? ` (${nPicked})` : ''}</button>
      </div>
      <div className="majority-builder__cols">
        {CHAMBERS.map(([ch, name]) => {
          const m = model[ch]
          if (!m) return null
          const { s, what, contested } = m
          const verdict = s.control
            ? { cls: s.control, text: `${s.control === 'D' ? 'Democrats' : 'Republicans'} win the ${name}` }
            : { cls: 'none', text: `Undecided — D needs ${s.needed.D}, R needs ${s.needed.R} of ${s.seats.uncalled} left` }
          return (
            <section key={ch} className="majority-builder__chamber" aria-labelledby={`mb-${ch}`}>
              <h3 id={`mb-${ch}`}>{name}</h3>
              <p className={`majority-builder__verdict majority-builder__verdict--${verdict.cls}`} aria-live="polite">{verdict.text}</p>
              <SeatBar chamber={ch} summary={what} />
              {contested.length === 0 ? (
                <p className="state small">No toss-up or lean races in the race data yet.</p>
              ) : (
                <ul className="majority-builder__races">
                  {contested.map(({ race, locked, winner }) => {
                    const pick = locked || picks[race.id]
                    const label = raceLabel(race)
                    return (
                      <li key={race.id}>
                        <button
                          type="button"
                          className={`majority-builder__race majority-builder__race--${pick || 'none'}${locked ? ' majority-builder__race--locked' : ''}`}
                          onClick={() => !locked && cycle(race.id)}
                          aria-disabled={Boolean(locked)}
                          aria-label={locked
                            ? `${label}: called for ${winner.name}. Locked.`
                            : `${label}: ${pick ? `assigned to ${pick === 'D' ? 'Democrats' : 'Republicans'}` : 'undecided'}. Activate to change.`}
                        >
                          <span className="majority-builder__name">{label}</span>
                          <RatingBadge rating={race.rating} />
                          <span className="majority-builder__pick" aria-hidden="true">{locked ? `✓ ${PICK_LABEL[locked]}` : PICK_LABEL[pick]}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}
      </div>
      <p className="small muted">Tap a race to cycle it Dem → Rep → undecided. Called races are locked to the winner. Picks are not saved.</p>
    </div>
  )
}
