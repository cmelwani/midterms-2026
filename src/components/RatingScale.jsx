import { ratingLabel, ratingPosition } from './pollUtils.js'
import './RatingScale.css'

const STEPS = [
  { pos: -3, label: 'Solid D' }, { pos: -2, label: 'Likely D' }, { pos: -1, label: 'Lean D' },
  { pos: 0, label: 'Toss-up' },
  { pos: 1, label: 'Lean R' }, { pos: 2, label: 'Likely R' }, { pos: 3, label: 'Solid R' },
]

// Session C. Marker for a rating on a Solid D → Solid R scale.
// Props: { rating: { category, party, source, asOf }, compact?: bool }
export default function RatingScale({ rating, compact = false }) {
  const p = ratingPosition(rating)
  if (p == null) return null
  const left = ((p + 3.5) / 7) * 100
  return (
    <figure className={`rating-scale${compact ? ' rating-scale--compact' : ''}`}>
      <div className="rating-scale__track" role="img" aria-label={`Rating: ${ratingLabel(rating)}${rating.source ? ` (${rating.source})` : ''}`}>
        {STEPS.map((s) => <span key={s.pos} className={`rating-scale__step rating-scale__step--${s.pos < 0 ? 'D' : s.pos > 0 ? 'R' : 'T'}${Math.abs(s.pos) === 3 ? ' is-solid' : Math.abs(s.pos) === 2 ? ' is-likely' : ''}`} />)}
        <span className="rating-scale__marker" style={{ left: `${left}%` }} />
      </div>
      {!compact && (
        <div className="rating-scale__labels" aria-hidden="true">
          {STEPS.map((s) => <span key={s.pos}>{s.label}</span>)}
        </div>
      )}
    </figure>
  )
}
