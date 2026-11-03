// Session C helpers shared by Polls / Candidate / PollMarginChart / VoteShareBar.
export const STALE_POLL_DAYS = 14
export const POLLING_ERROR_PTS = 3

// D margins are negative, R positive, everything else (I/L/G/O or tie) by sign of party.
export const MAX_PLAUSIBLE_MARGIN = 100

const validMargin = (m) => m && m.points != null && Math.abs(m.points) <= MAX_PLAUSIBLE_MARGIN

export function signedMargin(margin) {
  if (!validMargin(margin)) return null
  if (!margin.party) return 0
  if (margin.party === 'D') return -margin.points
  if (margin.party === 'R') return margin.points
  return 0
}

export function marginLabel(margin) {
  if (!validMargin(margin)) return '—'
  if (!margin.party || margin.points === 0) return 'Tied'
  return `${margin.party}+${Number(margin.points).toFixed(1).replace(/\.0$/, '')}`
}

export function raceLabel(race) {
  if (!race) return ''
  if (race.chamber === 'senate') return `${race.stateName || race.state} Senate${race.special ? ' (special)' : ''}`
  return `${race.state}-${race.district === 0 ? 'AL' : String(race.district).padStart(2, '0')}`
}

export function raceShortLabel(race) {
  if (!race) return ''
  if (race.chamber === 'senate') return `${race.state}${race.special ? '*' : ''} Sen`
  return `${race.state}-${race.district === 0 ? 'AL' : race.district}`
}

export function ageDays(iso, now = Date.now()) {
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : (now - t) / 86_400_000
}

export function isStalePoll(poll, now = Date.now()) {
  const d = ageDays(poll?.asOf, now)
  return d != null && d > STALE_POLL_DAYS
}

const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
export function relativeTime(iso, now = Date.now()) {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const sec = (t - now) / 1000
  const abs = Math.abs(sec)
  if (abs < 60) return RTF.format(Math.round(sec), 'second')
  if (abs < 3600) return RTF.format(Math.round(sec / 60), 'minute')
  if (abs < 86_400) return RTF.format(Math.round(sec / 3600), 'hour')
  if (abs < 86_400 * 60) return RTF.format(Math.round(sec / 86_400), 'day')
  return RTF.format(Math.round(sec / (86_400 * 30)), 'month')
}

export function absoluteTime(iso) {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  return new Date(t).toLocaleString('en-US', dateOnly
    ? { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }
    : { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function pollPct(poll, candidateId) {
  return poll?.average?.find((a) => a.candidateId === candidateId)?.pct ?? null
}

// Solid D (-3) … Toss-up (0) … Solid R (+3); 'tilt' sits between toss-up and lean.
const RATING_STEP = { 'toss-up': 0, tilt: 0.5, lean: 1, likely: 2, solid: 3 }
export function ratingPosition(rating) {
  if (!rating || !(rating.category in RATING_STEP)) return null
  const step = RATING_STEP[rating.category]
  if (step === 0 || !rating.party) return 0
  if (rating.party === 'D') return -step
  if (rating.party === 'R') return step
  return 0
}

export function ratingLabel(rating) {
  if (!rating) return '—'
  if (rating.category === 'toss-up') return 'Toss-up'
  const cat = rating.category[0].toUpperCase() + rating.category.slice(1)
  return `${cat} ${rating.party || ''}`.trim()
}
