import { useState } from 'react'
import { marginLabel, partyFill, raceTitle, ratingKey, ratingLabel, SPECTRUM_FILLS, SPECTRUM_LABELS, SPECTRUM_ORDER } from './RatingBadge.lib.js'
import './RaceSpectrum.css'

const marginScore = (race) => (!race.poll?.margin?.party ? 0 : race.poll.margin.party === 'R' ? race.poll.margin.points : -race.poll.margin.points)

// Props: { races, raceResult?(id), onSelect?(raceId), title }
// Lays every race out from Solid D to Solid R; called races switch to the winner's color with ✓.
export default function RaceSpectrum({ races = [], raceResult = () => null, onSelect, title = 'Races by rating' }) {
  const [hover, setHover] = useState(null)
  const buckets = SPECTRUM_ORDER.map((k) => ({
    key: k,
    races: races.filter((r) => ratingKey(r.rating) === k).sort((a, b) => marginScore(a) - marginScore(b) || a.id.localeCompare(b.id)),
  }))
  const other = races.filter((r) => !SPECTRUM_ORDER.includes(ratingKey(r.rating)))
  if (other.length) buckets.splice(3, 0, { key: 'other', races: other })
  const hovered = hover && races.find((r) => r.id === hover)
  const describe = (r) => {
    const res = raceResult(r.id)
    const w = res?.called && r.candidates.find((c) => c.id === res.winner)
    return `${raceTitle(r)} — ${ratingLabel(r.rating)}${r.poll ? `, poll ${marginLabel(r.poll.margin)}` : ''}${w ? `, called: ${w.name} (${w.party})` : ''}`
  }
  return (
    <section className="race-spectrum" aria-label={title}>
      <div className="race-spectrum__bar">
        {buckets.filter((b) => b.races.length).map((b) => (
          <div key={b.key} className="race-spectrum__bucket" style={{ flexGrow: b.races.length }}>
            <div className="race-spectrum__cells">
              {b.races.map((r) => {
                const res = raceResult(r.id)
                const w = res?.called && r.candidates.find((c) => c.id === res.winner)
                return (
                  <button
                    key={r.id}
                    type="button"
                    className={`race-spectrum__cell${w ? ' race-spectrum__cell--called' : ''}`}
                    style={{ background: w ? partyFill(w.party) : SPECTRUM_FILLS[b.key] || 'var(--ind)' }}
                    aria-label={describe(r)}
                    title={describe(r)}
                    onMouseEnter={() => setHover(r.id)}
                    onFocus={() => setHover(r.id)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => onSelect?.(r.id)}
                  >{w ? '✓' : ''}</button>
                )
              })}
            </div>
            <div className="race-spectrum__label">{SPECTRUM_LABELS[b.key] || 'Other'} <strong>{b.races.length}</strong></div>
          </div>
        ))}
      </div>
      <p className="race-spectrum__detail" aria-live="polite">{hovered ? describe(hovered) : 'Hover or focus a cell for details; click to jump to the race.'}</p>
    </section>
  )
}
