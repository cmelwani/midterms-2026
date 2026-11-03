#!/usr/bin/env node
// Dev tool: writes a plausible election-night public/data/results.json from whatever race files exist.
//
//   npm run simulate                 # call 5 more races (cumulative), advance % reporting elsewhere
//   npm run simulate -- --count 20   # call 20 more races
//   npm run simulate -- --all        # call every race in the race files (status "final" if all 470 exist)
//   npm run simulate -- --fresh      # start from the pre-election seed instead of the current file
//   npm run simulate -- --seed 42    # deterministic output
//   npm run simulate:reset           # restore the pre-election seed
//
// Output is fake. Never commit a simulated results.json — run `npm run simulate:reset` first.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(import.meta.dirname, '..', 'public', 'data')
const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] != null ? Number(args[i + 1]) : def
}

// Pre-election seed. Senate notUp verified against Ballotpedia (53 R, 45 D, 2 I; 35 seats up =
// 33 Class II [13 D, 20 R] + R-held OH and FL Class III specials -> 31 R, 32 D, 2 I not up).
export const SEED = {
  status: 'pre-election',
  sources: [
    {
      name: 'Ballotpedia — U.S. Senate elections, 2026 (53 R, 45 D, 2 I; 35 seats up: 33 Class II + OH and FL specials)',
      url: 'https://ballotpedia.org/United_States_Senate_elections,_2026',
      asOf: '2026-11-03',
    },
  ],
  chambers: {
    senate: { total: 100, majority: 51, tiebreak: 'R', racesUp: 35, racesCalled: 0, notUp: { D: 32, I: 2, R: 31 }, called: { D: 0, I: 0, R: 0 } },
    house: { total: 435, majority: 218, racesUp: 435, racesCalled: 0, called: { D: 0, I: 0, R: 0 } },
  },
  races: {},
}

function isoLocal(d = new Date()) {
  const pad = (n) => String(Math.abs(Math.trunc(n))).padStart(2, '0')
  const off = -d.getTimezoneOffset()
  const sign = off >= 0 ? '+' : '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(off / 60)}:${pad(off % 60)}`
}

// mulberry32
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = rng(opt('seed', Date.now() % 2 ** 32))
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const round1 = (x) => Math.round(x * 10) / 10

function writeJson(name, obj) {
  writeFileSync(join(dir, name), `${JSON.stringify(obj, null, 2)}\n`)
}
function readJson(name) {
  try {
    return JSON.parse(readFileSync(join(dir, name), 'utf8'))
  } catch {
    return null
  }
}

const seedNow = () => ({ updated: isoLocal(), ...structuredClone(SEED) })
// Fixed so a reset reproduces the committed seed byte-for-byte.
const SEED_UPDATED = '2026-11-03T17:00:00+00:00'

if (flag('reset')) {
  writeJson('results.json', { updated: SEED_UPDATED, ...structuredClone(SEED) })
  console.log('results.json reset to the pre-election seed.')
  process.exit(0)
}

const races = [...(readJson('senate_races.json')?.races || []), ...(readJson('house_races.json')?.races || [])]
if (!races.length) {
  console.error('No races found in senate_races.json / house_races.json.')
  process.exit(1)
}

const current = readJson('results.json')
const results = flag('fresh') || !current || current.status === 'pre-election' ? seedNow() : current
results.races ||= {}

// Probability the rating's favored party wins.
const FAV = { solid: 0.99, likely: 0.9, lean: 0.72, 'toss-up': 0.5 }

function chooseWinner(race) {
  const cands = race.candidates || []
  if (cands.length === 1) return cands[0]
  const { category, party } = race.rating || {}
  const byParty = (p) => cands.find((c) => c.party === p)
  if (category && category !== 'toss-up' && party && byParty(party)) {
    if (rand() < FAV[category]) return byParty(party)
    const rest = cands.filter((c) => c.party !== party)
    return rest.find((c) => c.party === 'D' || c.party === 'R') || rest[0]
  }
  const leader = race.poll?.margin?.party
  const top = cands.filter((c) => ['D', 'R', 'I'].includes(c.party)).slice(0, 2)
  const pool = top.length ? top : cands
  if (leader && byParty(leader) && rand() < 0.6) return byParty(leader)
  return pick(pool)
}

// Vote shares that sum to ~100 with `winner` (if given) on top.
function shares(race, winner, margin) {
  const cands = race.candidates || []
  if (cands.length === 1) return [{ candidateId: cands[0].id, pct: 100 }]
  const minor = cands.filter((c) => c.id !== winner?.id).slice(1)
  const minorTotal = minor.length ? round1(1 + rand() * 3) : 0
  const major = 100 - minorTotal
  const lead = winner || pick(cands)
  const runnerUp = cands.find((c) => c.id !== lead.id)
  const leadPct = round1((major + margin) / 2)
  const out = [
    { candidateId: lead.id, pct: leadPct },
    { candidateId: runnerUp.id, pct: round1(major - leadPct) },
  ]
  minor.filter((c) => c.id !== runnerUp.id).forEach((c, i, arr) => out.push({ candidateId: c.id, pct: round1(minorTotal / arr.length) }))
  const order = new Map(cands.map((c, i) => [c.id, i]))
  return out.sort((a, b) => order.get(a.candidateId) - order.get(b.candidateId))
}

const uncalled = races.filter((r) => !results.races[r.id]?.called)
const count = flag('all') ? uncalled.length : Math.min(opt('count', 5), uncalled.length)
// Shuffle, then call safer races first (they're called earlier on a real night).
const SAFETY = { solid: 0, likely: 1, lean: 2, 'toss-up': 3 }
const toCall = uncalled
  .map((r) => ({ r, k: (SAFETY[r.rating?.category] ?? 1) + rand() * 2.5 }))
  .sort((a, b) => a.k - b.k)
  .slice(0, count)
  .map((x) => x.r)

const now = new Date()
toCall.forEach((race, i) => {
  const winner = chooseWinner(race)
  const cat = race.rating?.category || 'solid'
  const margin = { solid: 15 + rand() * 30, likely: 7 + rand() * 10, lean: 3 + rand() * 6, 'toss-up': 0.5 + rand() * 4 }[cat]
  results.races[race.id] = {
    called: true,
    winner: winner.id,
    calledAt: isoLocal(new Date(now.getTime() - (toCall.length - 1 - i) * 1000)),
    calledBy: 'Simulated (npm run simulate)',
    pctReporting: Math.min(100, Math.round(cat === 'solid' ? 40 + rand() * 60 : 75 + rand() * 25)),
    votes: shares(race, winner, margin),
  }
})

// Some still-uncalled races start / keep reporting.
const stillOpen = races.filter((r) => !results.races[r.id]?.called)
for (const race of stillOpen) {
  const prev = results.races[race.id]
  if (!prev && rand() > 0.35) continue
  const pct = Math.min(99, Math.round((prev?.pctReporting || 0) + 5 + rand() * 25))
  results.races[race.id] = {
    called: false,
    winner: null,
    calledAt: null,
    calledBy: null,
    pctReporting: pct,
    votes: shares(race, null, rand() * 6),
  }
}

// Recompute aggregates from the race entries.
const raceById = new Map(races.map((r) => [r.id, r]))
for (const ch of ['senate', 'house']) {
  results.chambers[ch].called = { D: 0, I: 0, R: 0 }
  results.chambers[ch].racesCalled = 0
}
for (const [id, rr] of Object.entries(results.races)) {
  const race = raceById.get(id)
  if (!race) { delete results.races[id]; continue }
  if (!rr.called) continue
  const party = race.candidates.find((c) => c.id === rr.winner)?.party
  const s = results.chambers[race.chamber]
  s.racesCalled++
  s.called[party === 'D' || party === 'R' ? party : 'I']++
}

const allCalled = ['senate', 'house'].every((ch) => results.chambers[ch].racesCalled === results.chambers[ch].racesUp)
results.status = allCalled ? 'final' : 'live'
results.updated = isoLocal()
writeJson('results.json', results)

const fmt = (ch) => {
  const s = results.chambers[ch]
  return `${ch} ${s.racesCalled}/${s.racesUp} called (D ${s.called.D}, I ${s.called.I}, R ${s.called.R})`
}
console.log(`Called ${toCall.length} race(s): ${toCall.map((r) => r.id).join(', ') || '—'}`)
console.log(`status=${results.status}; ${fmt('senate')}; ${fmt('house')}`)
console.log('Simulated data — run `npm run simulate:reset` before committing.')
