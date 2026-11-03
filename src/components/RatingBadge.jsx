import { formatDate, ratingKey, ratingLabel } from './RatingBadge.lib.js'
import './RatingBadge.css'

// Props: { rating: { category: 'toss-up'|'lean'|'likely'|'solid', party: 'D'|'R'|'I'|null, source?, asOf? } }
export default function RatingBadge({ rating }) {
  if (!rating) return null
  const label = ratingLabel(rating)
  const tip = [rating.source || 'Rating', rating.asOf ? `as of ${formatDate(rating.asOf)}` : ''].filter(Boolean).join(', ')
  return (
    <span className={`rating-badge rating-badge--${ratingKey(rating)}`} title={tip} aria-label={`${label} (${tip})`}>
      {label}
    </span>
  )
}
