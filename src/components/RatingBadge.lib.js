// Shared rating helpers for RatingBadge, RaceSpectrum, USTileMap consumers (Session B).
const CAT_RANK = { solid: 3, likely: 2, lean: 1, 'toss-up': 0 }
const CAT_LABEL = { 'toss-up': 'Toss-up', lean: 'Lean', likely: 'Likely', solid: 'Solid' }
const PARTY_SHORT = { D: 'D', R: 'R', I: 'I' }

export function ratingLabel(rating) {
  if (!rating) return 'Not rated'
  if (rating.category === 'toss-up') return 'Toss-up'
  return `${CAT_LABEL[rating.category] || rating.category} ${PARTY_SHORT[rating.party] || rating.party || ''}`.trim()
}

// -3 (Solid D) .. 0 (Toss-up) .. +3 (Solid R); independents count with D (caucus) only if party is D.
export function ratingScore(rating) {
  if (!rating || rating.category === 'toss-up') return 0
  const r = CAT_RANK[rating.category] ?? 3
  return rating.party === 'R' ? r : -r
}

export function ratingKey(rating) {
  if (!rating) return 'none'
  return rating.category === 'toss-up' ? 'toss-up' : `${rating.category}-${rating.party || 'O'}`
}

const FILL = {
  'toss-up': 'var(--tossup)',
  'lean-D': '#8fb3ea', 'likely-D': '#4f84d6', 'solid-D': 'var(--dem)',
  'lean-R': '#f09aa2', 'likely-R': '#e05563', 'solid-R': 'var(--rep)',
}
export function ratingFill(rating) {
  return FILL[ratingKey(rating)] || 'var(--ind)'
}
export function ratingTextColor(rating) {
  const k = ratingKey(rating)
  return k.startsWith('lean') ? '#111827' : '#fff'
}

export function partyFill(party) {
  return party === 'D' ? 'var(--dem)' : party === 'R' ? 'var(--rep)' : 'var(--ind)'
}

export const SPECTRUM_ORDER = ['solid-D', 'likely-D', 'lean-D', 'toss-up', 'lean-R', 'likely-R', 'solid-R']
export const SPECTRUM_LABELS = { 'solid-D': 'Solid D', 'likely-D': 'Likely D', 'lean-D': 'Lean D', 'toss-up': 'Toss-up', 'lean-R': 'Lean R', 'likely-R': 'Likely R', 'solid-R': 'Solid R' }
export const SPECTRUM_FILLS = FILL

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function marginLabel(margin) {
  if (!margin) return '—'
  if (!margin.party || margin.points === 0) return 'Tied'
  return `${margin.party}+${margin.points}`
}

export function raceTitle(race) {
  if (race.chamber === 'senate') return `${race.stateName}${race.special ? ' (special)' : ''}`
  return `${race.state}-${race.district === 0 ? 'AL' : String(race.district).padStart(2, '0')}`
}
