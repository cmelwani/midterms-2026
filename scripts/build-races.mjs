#!/usr/bin/env node
// Generates public/data/senate_races.json + house_races.json from data-src/*.csv and
// data-src/overrides.json. Seed the CSVs with scripts/build-races-seed.mjs.
// Usage: node scripts/build-races.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseCsv } from './build-races-lib.mjs'
import { candidateId } from '../src/lib/ids.js'

const root = join(import.meta.dirname, '..')
const src = (f) => parseCsv(readFileSync(join(root, 'data-src', f), 'utf8'))
const overrides = JSON.parse(readFileSync(join(root, 'data-src', 'overrides.json'), 'utf8'))
const UPDATED = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
const COOK = { senate: 'https://www.cookpolitical.com/ratings/senate-race-ratings', house: 'https://www.cookpolitical.com/ratings/house-race-ratings' }
const POLL_PREF = ['RealClearPolling', 'Race to the WH', 'Split Ticket']
const SOURCE_NAMES = { RealClearPolitics: 'RealClearPolling', RacetotheWH: 'Race to the WH', 'Race to the WH': 'Race to the WH' }
const ORDER = { D: 0, R: 1 }

const group = (rows, key) => rows.reduce((m, r) => m.set(r[key], [...(m.get(r[key]) || []), r]), new Map())
const lastName = (n) => n.split(/\s+/).filter((p) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(p)).pop().toLowerCase()
const running = (status) => /renominated|advanced|unopposed|running|re-elected|nominated/i.test(status) && !/lost|retir|ineligible|withdrew|resign|died/i.test(status)

const norm = (n) => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
function samePerson(a, b) {
  if (!a || !b) return false
  const [x, y] = [norm(a).split(/\s+/), norm(b).split(/\s+/)]
  return lastName(norm(a)) === lastName(norm(b)) && (x[0] === y[0] || !x[0].includes('.'))
}

// Keep every D/R nominee (top-two states can have two of one party) plus independents/third
// parties that poll >= 5% or are listed in overrides; if a major party has no nominee, keep the
// remaining ballot candidates when keepOthers is set (House only).
function pickCandidates(raceId, all, { polledNames, keepOthers }) {
  const ov = overrides.candidates?.[raceId] || {}
  const list = all
    .filter((c) => !(ov.exclude || []).includes(c.name))
    .map((c) => ({ ...c, name: (ov.rename?.[c.name] || c.name).replace(/&nbsp;/g, ' '), party: ov.party?.[c.name] || c.party }))
  const keep = list.filter((c) => c.party === 'D' || c.party === 'R')
  const majors = new Set(keep.map((c) => c.party))
  for (const c of list) {
    if (c.party === 'D' || c.party === 'R') continue
    if (polledNames.has(c.name) || (ov.include || []).includes(c.name) || (keepOthers && majors.size < 2)) keep.push(c)
  }
  return keep.sort((a, b) => (ORDER[a.party] ?? 2) - (ORDER[b.party] ?? 2))
}

function withIds(state, seat, cands, incumbentName, incRunning) {
  const base = cands.map((c) => candidateId(state, seat, c.name))
  return cands.map((c, i) => ({
    id: base.filter((b) => b === base[i]).length > 1 ? candidateId(state, seat, c.name, true) : base[i],
    name: c.name,
    party: c.party,
    incumbent: Boolean(incRunning && samePerson(c.name, incumbentName)),
  }))
}

function rating(r, chamber) {
  return { category: r.category, party: r.category === 'toss-up' ? null : r.party, source: 'Cook Political Report', asOf: r.asOf, url: COOK[chamber] }
}

function buildPoll(rows, candidates) {
  if (!rows?.length) return null
  const bySource = group(rows.map((r) => ({ ...r, source: SOURCE_NAMES[r.source] || r.source })), 'source')
  const entries = [...bySource.entries()].map(([source, rs]) => {
    const average = rs.map((r) => ({ candidateId: candidates.find((c) => c.name === r.candidate)?.id, pct: Number(r.pct) })).filter((a) => a.candidateId)
    const sorted = [...average].sort((a, b) => b.pct - a.pct)
    const lead = candidates.find((c) => c.id === sorted[0]?.candidateId)
    const points = Math.round(((sorted[0]?.pct ?? 0) - (sorted[1]?.pct ?? 0)) * 10) / 10
    return { source, url: rs[0].url || null, asOf: rs.map((r) => r.asOf).sort().pop(), average, margin: { party: points === 0 ? null : lead?.party ?? null, points } }
  }).filter((e) => e.average.length >= 2)
  if (!entries.length) return null
  const rank = (e) => { const i = POLL_PREF.indexOf(e.source); return i === -1 ? POLL_PREF.length : i }
  entries.sort((a, b) => rank(a) - rank(b) || b.asOf.localeCompare(a.asOf))
  const [main, ...rest] = entries
  return { average: main.average, margin: main.margin, source: main.source, url: main.url, asOf: main.asOf,
    ...(rest.length ? { others: rest.map(({ source, url, asOf, margin }) => ({ source, url, asOf, margin })) } : {}) }
}

function incumbentObj(name, party, isRunning, candidates) {
  if (!name) return null
  const c = isRunning ? candidates.find((x) => x.incumbent) : null
  return { name, party, candidateId: c?.id ?? null, running: Boolean(c) }
}

// ---------------- Senate
const senCands = group(src('senate_candidates.csv'), 'raceId')
const senRatings = new Map(src('senate_ratings.csv').map((r) => [r.raceId, r]))
const senPolls = group(src('senate_polls.csv'), 'raceId')
const senate = src('senate_races.csv').map((r) => {
  const ov = overrides.candidates?.[r.id] || {}
  const incName = ov.rename?.[r.incumbentName] || r.incumbentName
  const isRunning = running(r.status)
  const polled = new Set((senPolls.get(r.id) || []).filter((p) => Number(p.pct) >= 5).map((p) => ov.rename?.[p.candidate] || p.candidate))
  const picked = pickCandidates(r.id, senCands.get(r.id) || [], { polledNames: polled, keepOthers: false })
  const candidates = withIds(r.state, 'sen', picked, incName, isRunning)
  const pollRows = (senPolls.get(r.id) || []).map((p) => ({ ...p, candidate: ov.rename?.[p.candidate] || p.candidate }))
  return {
    id: r.id, chamber: 'senate', state: r.state, stateName: r.stateName, seatClass: Number(r.seatClass), special: r.special === 'true',
    incumbent: incumbentObj(incName, r.incumbentParty, isRunning, candidates),
    status: r.status,
    candidates,
    rating: rating(senRatings.get(r.id), 'senate'),
    poll: buildPoll(pollRows, candidates),
    winner: null,
    ...(overrides.races?.[r.id] || {}),
  }
}).sort((a, b) => a.stateName.localeCompare(b.stateName))

// ---------------- House
const houseCands = group(src('house_candidates.csv'), 'raceId')
const houseRatings = new Map(src('house_ratings.csv').map((r) => [r.raceId, r]))
const cookHouseAsOf = [...houseRatings.values()][0]?.asOf
const house = src('house_races.csv').map((r) => {
  const isRunning = running(r.status)
  const picked = pickCandidates(r.id, houseCands.get(r.id) || [], { polledNames: new Set(), keepOthers: true })
  const district = Number(r.district)
  const candidates = withIds(r.state, district, picked, r.incumbentName.replace(/&nbsp;/g, ' '), isRunning)
  const listed = houseRatings.get(r.id)
  // Seats Cook doesn't list are Solid for the running incumbent's party, else the district's PVI lean.
  const solidParty = (isRunning && ['D', 'R'].includes(r.incumbentParty) ? r.incumbentParty : r.pvi?.[0]) || r.incumbentParty || null
  const rt = listed ? rating(listed, 'house') : { category: 'solid', party: solidParty, source: 'Cook Political Report', asOf: cookHouseAsOf, url: COOK.house, inferred: true }
  return {
    id: r.id, chamber: 'house', state: r.state, stateName: r.stateName, district, competitive: rt.category !== 'solid',
    pvi: r.pvi || null,
    incumbent: incumbentObj(r.incumbentName.replace(/&nbsp;/g, ' '), r.incumbentParty, isRunning, candidates),
    status: r.status || (r.incumbentName ? '' : 'Open seat (new or vacant)'),
    candidates,
    rating: rt,
    poll: null,
    winner: null,
    ...(overrides.races?.[r.id] || {}),
  }
})

const write = (file, sources, races) => writeFileSync(join(root, 'public', 'data', file), JSON.stringify({ updated: UPDATED, sources, races }, null, 1) + '\n')
write('senate_races.json', [
  { name: 'Cook Political Report — Senate race ratings', url: COOK.senate },
  { name: 'Wikipedia — 2026 United States Senate elections (nominees, ratings table)', url: 'https://en.wikipedia.org/wiki/2026_United_States_Senate_elections' },
  { name: 'Ballotpedia — U.S. Senate elections, 2026', url: 'https://ballotpedia.org/United_States_Senate_elections,_2026' },
  { name: 'Poll aggregates (RealClearPolling, Race to the WH, Split Ticket, others) via each state race article', url: 'https://www.realclearpolling.com/latest-polls/senate' },
], senate)
write('house_races.json', [
  { name: 'Cook Political Report — House race ratings', url: COOK.house },
  { name: 'Wikipedia — 2026 U.S. House election ratings', url: 'https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_election_ratings' },
  { name: 'Wikipedia — 2026 U.S. House elections (districts, incumbents, nominees)', url: 'https://en.wikipedia.org/wiki/2026_United_States_House_of_Representatives_elections' },
  { name: 'Ballotpedia — U.S. House elections, 2026', url: 'https://ballotpedia.org/United_States_House_of_Representatives_elections,_2026' },
], house)
const comp = house.filter((r) => r.competitive).length
console.log(`senate_races.json: ${senate.length} races, ${senate.filter((r) => r.poll).length} with polls; house_races.json: ${house.length} races, ${comp} competitive`)
