// Session A owns this file. Pure helpers shared by Hemicycle, RatingSpectrum and MajorityBuilder.
import { partyInfo } from '../lib/ids.js'

// Independents (and other non-Republicans) count on the Democratic side, matching
// the per-chamber `called` aggregates in results.json (DATA_CONTRACT.md).
export const sideOf = (party) => (party === 'R' ? 'R' : party ? 'D' : null)

export function raceLabel(race) {
  if (!race) return ''
  if (race.chamber === 'senate') return `${race.stateName}${race.special ? ' (special)' : ''}`
  return `${race.state}-${race.district === 0 ? 'AL' : String(race.district).padStart(2, '0')}`
}

export const RATING_KEYS = ['solid-D', 'likely-D', 'lean-D', 'toss-up', 'lean-R', 'likely-R', 'solid-R']
export const RATING_LABELS = {
  'solid-D': 'Solid D', 'likely-D': 'Likely D', 'lean-D': 'Lean D', 'toss-up': 'Toss-up',
  'lean-R': 'Lean R', 'likely-R': 'Likely R', 'solid-R': 'Solid R', unrated: 'No rating data',
}

export function ratingKey(rating) {
  if (!rating?.category) return 'unrated'
  if (rating.category === 'toss-up') return 'toss-up'
  const side = sideOf(rating.party)
  return side ? `${rating.category}-${side}` : 'unrated'
}

export function winnerOf(race, result) {
  if (!result?.called || !result.winner) return null
  return race?.candidates?.find((c) => c.id === result.winner) || { id: result.winner, name: result.winner, party: null }
}

export function leaderOf(race, result) {
  const top = [...(result?.votes || [])].sort((a, b) => b.pct - a.pct)[0]
  if (!top || !(top.pct > 0)) return null
  const c = race?.candidates?.find((x) => x.id === top.candidateId)
  return c ? { ...c, pct: top.pct } : null
}

const ORDER = { 'solid-D': 0, 'likely-D': 1, 'lean-D': 2, 'toss-up': 3, unrated: 4, 'lean-R': 5, 'likely-R': 6, 'solid-R': 7 }
const byRatingThenLabel = (a, b) => (ORDER[a.ratingKey] - ORDER[b.ratingKey]) || a.label.localeCompare(b.label)

// One entry per seat, ordered left (D) to right (R):
// D not up · D won · uncalled (by rating, D-leaning first) · R won · R not up.
// Counts are reconciled with the chamber aggregates so the total always equals `total`
// even while the race files are incomplete samples.
export function buildSeats(summary, races = [], raceResult = () => null) {
  if (!summary) return []
  const total = summary.total || 0
  const notUp = summary.notUp || {}
  const called = summary.called || {}
  const notUpD = (notUp.D || 0) + (notUp.I || 0)
  const notUpR = notUp.R || 0
  const wonD = (called.D || 0) + (called.I || 0)
  const wonR = called.R || 0

  const won = { D: [], R: [] }
  const open = []
  for (const race of races) {
    const result = raceResult(race.id)
    const rk = ratingKey(race.rating)
    const base = { raceId: race.id, race, result, label: raceLabel(race), ratingKey: rk }
    const w = winnerOf(race, result)
    const side = w && sideOf(w.party)
    if (side) won[side].push({ ...base, kind: 'won', party: w.party, side, winner: w })
    else open.push({ ...base, kind: 'uncalled', party: null, side: null, leader: leaderOf(race, result) })
  }
  won.D.sort(byRatingThenLabel)
  won.R.sort(byRatingThenLabel)
  open.sort(byRatingThenLabel)

  const filler = (n, make) => Array.from({ length: Math.max(0, n) }, (_, i) => make(i))
  const notUpSeat = (side) => () => ({ kind: 'notup', side, party: side, label: 'Not up in 2026', ratingKey: `solid-${side}` })
  const calledSeat = (side) => () => ({ kind: 'won', side, party: side, label: 'Called race (details not loaded)', ratingKey: 'unrated' })

  const dWon = [...won.D, ...filler(wonD - won.D.length, calledSeat('D'))]
  const rWon = [...won.R, ...filler(wonR - won.R.length, calledSeat('R'))]
  const fixed = notUpD + notUpR + dWon.length + rWon.length
  const uncalledCount = Math.max(0, total - fixed)
  const uncalled = [
    ...open.slice(0, uncalledCount),
    ...filler(uncalledCount - open.length, () => ({ kind: 'uncalled', side: null, party: null, label: 'Uncalled race (details not loaded)', ratingKey: 'unrated' })),
  ]
  return [
    ...filler(notUpD, notUpSeat('D')),
    ...dWon,
    ...uncalled,
    ...rWon.reverse(),
    ...filler(notUpR, notUpSeat('R')),
  ]
}

export function seatStatus(seat) {
  if (seat.kind === 'notup') return seat.side === 'D' ? 'Held by a Democrat or independent; not on the 2026 ballot' : 'Held by a Republican; not on the 2026 ballot'
  if (seat.kind === 'won') return seat.winner ? `Called: ${seat.winner.name} (${partyInfo(seat.winner.party).short})` : `Called for ${seat.side === 'D' ? 'Democrats' : 'Republicans'}`
  const pct = seat.result?.pctReporting
  const parts = ['Uncalled']
  if (pct) parts.push(`${pct}% reporting`)
  if (seat.leader) parts.push(`${seat.leader.name} leads (${seat.leader.pct}%)`)
  return parts.join(' · ')
}
