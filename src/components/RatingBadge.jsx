import { partyInfo } from '../lib/ids.js'

// Session B owns this file.
// Props: { rating: { category: 'toss-up'|'lean'|'likely'|'solid', party: 'D'|'R'|null } }
export default function RatingBadge({ rating }) {
  if (!rating) return null
  const label = rating.category === 'toss-up'
    ? 'Toss-up'
    : `${rating.category[0].toUpperCase()}${rating.category.slice(1)} ${partyInfo(rating.party).short}`
  return <span className={`rating-badge rating-badge--${rating.category} rating-badge--${rating.party || 'tossup'}`}>{label}</span>
}
