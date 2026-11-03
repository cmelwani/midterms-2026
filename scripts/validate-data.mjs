#!/usr/bin/env node
// Validates public/data/*.json against DATA_CONTRACT.md, including cross-file references.
// Usage: node scripts/validate-data.mjs [--strict]   (--strict also enforces full race counts)
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const strict = process.argv.includes('--strict')
const dir = join(import.meta.dirname, '..', 'public', 'data')
const errors = []
const warnings = []
const err = (m) => errors.push(m)
const warn = (m) => warnings.push(m)

function load(name) {
  try {
    return JSON.parse(readFileSync(join(dir, name), 'utf8'))
  } catch (e) {
    err(`${name}: ${e.message}`)
    return null
  }
}

const PARTIES = new Set(['D', 'R', 'I', 'L', 'G', 'O'])
const RATINGS = new Set(['toss-up', 'lean', 'likely', 'solid'])
const STATES = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '))
const ISO = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/
const CAND_ID = /^[a-z]{2}-(sen|al|\d{2})-[a-z0-9-]+$/

const races = new Map() // raceId -> race
const raceCandidates = new Map() // candidateId -> raceId

function checkRace(r, file, chamber) {
  const where = `${file} ${r.id}`
  const expectedId = chamber === 'senate'
    ? `sen-${r.state?.toLowerCase()}-${r.seatClass}`
    : `house-${r.state?.toLowerCase()}-${r.district === 0 ? 'al' : String(r.district).padStart(2, '0')}`
  if (r.id !== expectedId) err(`${where}: id should be ${expectedId}`)
  if (races.has(r.id)) err(`${where}: duplicate race id`)
  races.set(r.id, r)
  if (r.chamber !== chamber) err(`${where}: chamber must be "${chamber}"`)
  if (!STATES.has(r.state)) err(`${where}: bad state ${r.state}`)
  if (!r.stateName) err(`${where}: missing stateName`)
  if (chamber === 'senate') {
    if (![1, 2, 3].includes(r.seatClass)) err(`${where}: seatClass must be 1|2|3`)
    if (typeof r.special !== 'boolean') err(`${where}: special must be boolean`)
  } else {
    if (!Number.isInteger(r.district) || r.district < 0) err(`${where}: district must be int >= 0 (0 = at-large)`)
    if (typeof r.competitive !== 'boolean') err(`${where}: competitive must be boolean`)
  }
  if (r.incumbent !== null) {
    if (!r.incumbent?.name || !PARTIES.has(r.incumbent?.party)) err(`${where}: incumbent needs name + party (or null for vacant)`)
    if (typeof r.incumbent?.running !== 'boolean') err(`${where}: incumbent.running must be boolean`)
  }
  if (!Array.isArray(r.candidates) || r.candidates.length === 0) err(`${where}: candidates must be a non-empty array`)
  const ids = new Set()
  for (const c of r.candidates || []) {
    if (!CAND_ID.test(c.id || '')) err(`${where}: bad candidate id "${c.id}"`)
    const prefix = chamber === 'senate' ? `${r.state.toLowerCase()}-sen-` : `${r.state.toLowerCase()}-${r.district === 0 ? 'al' : String(r.district).padStart(2, '0')}-`
    if (c.id && !c.id.startsWith(prefix)) err(`${where}: candidate id "${c.id}" should start with ${prefix}`)
    if (ids.has(c.id)) err(`${where}: duplicate candidate ${c.id}`)
    ids.add(c.id)
    if (raceCandidates.has(c.id)) err(`${where}: candidate ${c.id} also in ${raceCandidates.get(c.id)}`)
    raceCandidates.set(c.id, r.id)
    if (!c.name || !PARTIES.has(c.party) || typeof c.incumbent !== 'boolean') err(`${where}: candidate ${c.id} needs name, party, incumbent`)
  }
  if (r.incumbent?.running && r.incumbent.candidateId && !ids.has(r.incumbent.candidateId)) err(`${where}: incumbent.candidateId not in candidates`)
  if (!r.rating || !RATINGS.has(r.rating.category)) err(`${where}: rating.category must be one of ${[...RATINGS]}`)
  else {
    if (r.rating.category === 'toss-up' ? r.rating.party !== null : !['D', 'R', 'I'].includes(r.rating.party)) err(`${where}: rating.party must be null for toss-up, else D|R|I`)
    if (!r.rating.source || !ISO.test(r.rating.asOf || '')) err(`${where}: rating needs source + asOf`)
  }
  if (r.poll != null) {
    const p = r.poll
    if (!Array.isArray(p.average) || !p.source || !ISO.test(p.asOf || '')) err(`${where}: poll needs average[], source, asOf`)
    for (const a of p.average || []) {
      if (!ids.has(a.candidateId)) err(`${where}: poll candidate ${a.candidateId} not in race`)
      if (typeof a.pct !== 'number' || a.pct < 0 || a.pct > 100) err(`${where}: poll pct must be a number 0-100`)
    }
    for (const m of [p.margin, ...(p.others || []).map((o) => o.margin)]) {
      if (m && (typeof m.points !== 'number' || m.points < 0 || m.points > 100)) err(`${where}: poll margin points must be 0-100 (got ${m.points})`)
    }
  }
  if (r.winner != null && !ids.has(r.winner)) err(`${where}: winner ${r.winner} not in candidates`)
}

const senate = load('senate_races.json')
const house = load('house_races.json')
// While race files are still samples, references into them from other files are only warnings,
// so candidates.json / results.json can be built in parallel with the race files.
const racesAreSample = Boolean(senate?._sample || house?._sample)
const xerr = (m) => (racesAreSample && !strict ? warn(`${m} [race files are sample data]`) : err(m))
const cands = load('candidates.json')
const links = load('links.json')
const results = load('results.json')

for (const [f, d] of [['senate_races.json', senate], ['house_races.json', house], ['candidates.json', cands], ['links.json', links], ['results.json', results]]) {
  if (d && !ISO.test(d.updated || '')) err(`${f}: top-level "updated" ISO timestamp required`)
  if (d?._sample) warn(`${f}: still sample data (_sample: true)`)
}

senate?.races?.forEach((r) => checkRace(r, 'senate_races.json', 'senate'))
house?.races?.forEach((r) => checkRace(r, 'house_races.json', 'house'))

const nSen = senate?.races?.length ?? 0
const nHouse = house?.races?.length ?? 0
const countMsg = []
if (nSen !== 35) countMsg.push(`senate_races.json has ${nSen} races (expected 35)`)
if (nHouse !== 435) countMsg.push(`house_races.json has ${nHouse} races (expected 435)`)
countMsg.forEach((m) => (strict ? err(m) : warn(m)))

if (cands) {
  for (const p of ['D', 'R']) if (!cands.partyPlatforms?.[p]?.summary) err(`candidates.json: partyPlatforms.${p}.summary required`)
  const seen = new Set()
  for (const c of cands.candidates || []) {
    const where = `candidates.json ${c.id}`
    if (seen.has(c.id)) err(`${where}: duplicate`)
    seen.add(c.id)
    if (!c.name || !PARTIES.has(c.party) || typeof c.incumbent !== 'boolean') err(`${where}: needs name, party, incumbent`)
    if (!Array.isArray(c.priorities) || c.priorities.length !== 3) err(`${where}: priorities must have exactly 3 items`)
    if (!races.has(c.raceId)) xerr(`${where}: raceId ${c.raceId} not found in race files`)
    else if (raceCandidates.get(c.id) !== c.raceId) xerr(`${where}: not listed as a candidate in ${c.raceId}`)
  }
  for (const [id, raceId] of raceCandidates) {
    const r = races.get(raceId)
    const needsProfile = r.chamber === 'senate' || r.competitive
    if (needsProfile && !seen.has(id)) (strict ? err : warn)(`candidates.json: missing profile for ${id} (${raceId})`)
  }
}

if (links) {
  for (const l of links.links || []) {
    if (!l.id || !l.title || !l.publisher || !/^https?:\/\//.test(l.url || '')) err(`links.json ${l.id}: needs id, title, publisher, url`)
    for (const rid of l.raceIds || []) if (!races.has(rid)) xerr(`links.json ${l.id}: unknown raceId ${rid}`)
  }
}

if (results) {
  if (!['pre-election', 'live', 'final'].includes(results.status)) err('results.json: status must be pre-election|live|final')
  for (const ch of ['senate', 'house']) {
    const s = results.chambers?.[ch]
    if (!s) { err(`results.json: chambers.${ch} missing`); continue }
    for (const k of ['total', 'majority', 'racesUp', 'racesCalled']) if (!Number.isInteger(s[k])) err(`results.json chambers.${ch}.${k} must be int`)
  }
  let called = { senate: 0, house: 0 }
  for (const [rid, rr] of Object.entries(results.races || {})) {
    const race = races.get(rid)
    if (!race) { xerr(`results.json: unknown race ${rid}`); continue }
    if (rr.called) {
      called[race.chamber]++
      if (!raceCandidates.has(rr.winner) || raceCandidates.get(rr.winner) !== rid) xerr(`results.json ${rid}: winner ${rr.winner} not a candidate in race`)
    }
    if (typeof rr.pctReporting !== 'number' || rr.pctReporting < 0 || rr.pctReporting > 100) err(`results.json ${rid}: pctReporting 0-100`)
    for (const v of rr.votes || []) if (raceCandidates.get(v.candidateId) !== rid) xerr(`results.json ${rid}: vote candidate ${v.candidateId} not in race`)
  }
  for (const ch of ['senate', 'house']) {
    const s = results.chambers?.[ch]
    if (s && s.racesCalled !== called[ch]) err(`results.json chambers.${ch}.racesCalled=${s.racesCalled} but ${called[ch]} races have called=true`)
  }
}

warnings.forEach((w) => console.warn(`warn: ${w}`))
errors.forEach((e) => console.error(`error: ${e}`))
console.log(`${errors.length} error(s), ${warnings.length} warning(s). Races: senate=${nSen} house=${nHouse}, candidates=${cands?.candidates?.length ?? 0}`)
process.exit(errors.length ? 1 : 0)
