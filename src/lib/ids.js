// ID conventions shared by every data file. See DATA_CONTRACT.md.

export function slug(s) {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function senateRaceId(state, seatClass) {
  return `sen-${state.toLowerCase()}-${seatClass}`
}

export function houseRaceId(state, district) {
  const d = district === 0 ? 'al' : String(district).padStart(2, '0')
  return `house-${state.toLowerCase()}-${d}`
}

// e.g. candidateId('GA', 'sen', 'Jon Ossoff') -> "ga-sen-ossoff"
//      candidateId('PA', 7, 'Ryan Mackenzie') -> "pa-07-mackenzie"
//      candidateId('AK', 0, 'Nick Begich') -> "ak-al-begich"
// On a collision within a race, pass withFirst=true -> "ga-sen-ossoff-jon".
export function candidateId(state, seat, fullName, withFirst = false) {
  const s = state.toLowerCase()
  const seatPart = seat === 'sen' ? 'sen' : seat === 0 ? 'al' : String(seat).padStart(2, '0')
  const parts = fullName.trim().split(/\s+/).filter((p) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(p))
  const last = slug(parts[parts.length - 1])
  const first = slug(parts[0])
  return `${s}-${seatPart}-${last}${withFirst ? `-${first}` : ''}`
}

export const PARTIES = {
  D: { name: 'Democratic', short: 'Dem', color: 'var(--dem)', light: 'var(--dem-light)' },
  R: { name: 'Republican', short: 'Rep', color: 'var(--rep)', light: 'var(--rep-light)' },
  I: { name: 'Independent', short: 'Ind', color: 'var(--ind)', light: 'var(--ind-light)' },
  L: { name: 'Libertarian', short: 'Lib', color: 'var(--ind)', light: 'var(--ind-light)' },
  G: { name: 'Green', short: 'Grn', color: 'var(--ind)', light: 'var(--ind-light)' },
  O: { name: 'Other', short: 'Oth', color: 'var(--ind)', light: 'var(--ind-light)' },
}

export function partyInfo(code) {
  return PARTIES[code] || PARTIES.O
}

export const RATING_CATEGORIES = ['toss-up', 'lean', 'likely', 'solid']
