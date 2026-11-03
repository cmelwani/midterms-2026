// Session C: builds public/data/candidates.json and public/data/links.json from curated inputs in data-src/.
// Usage: node scripts/build-candidates.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { candidateId } from '../src/lib/ids.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'))
const write = (p, obj) => fs.writeFileSync(path.join(root, p), `${JSON.stringify(obj, null, 2)}\n`)
const now = new Date().toISOString()
const errors = []

// --- candidates.json ---
const profiles = read('data-src/candidates/profiles.json')
const partyPlatforms = read('data-src/candidates/party-platforms.json')
const idOverrides = fs.existsSync(path.join(root, 'data-src/candidates/id-overrides.json'))
  ? read('data-src/candidates/id-overrides.json') : {}

const seen = new Map()
const candidates = profiles.map((p) => {
  const id = idOverrides[`${p.raceId}|${p.name}`] || candidateId(p.state, p.seat, p.name)
  if (seen.has(id)) errors.push(`duplicate candidate id ${id} (${seen.get(id)} / ${p.name}); add an id-overrides.json entry using withFirst`)
  seen.set(id, p.name)
  const usePlatform = p.prioritiesSource === 'party-platform'
  const priorities = usePlatform ? partyPlatforms[p.party]?.priorities : p.priorities
  if (!priorities || priorities.length !== 3) errors.push(`${id}: needs exactly 3 priorities (got ${priorities?.length ?? 0})`)
  return {
    id,
    name: p.displayName || p.name,
    party: p.party,
    raceId: p.raceId,
    incumbent: Boolean(p.incumbent),
    currentOffice: p.currentOffice ?? null,
    bio: p.bio ?? null,
    priorities,
    prioritiesSource: p.prioritiesSource,
    links: p.links || {},
  }
}).sort((a, b) => a.raceId.localeCompare(b.raceId) || a.id.localeCompare(b.id))

write('public/data/candidates.json', { updated: now, partyPlatforms, candidates })

// --- links.json ---
const rows = read('data-src/links.src.json')
const links = rows.map(([id, title, publisher, url, description, category, raceIds]) => ({
  id, title, publisher, url, description, category, raceIds: raceIds || [],
}))
const ids = new Set()
for (const l of links) {
  if (ids.has(l.id)) errors.push(`duplicate link id ${l.id}`)
  ids.add(l.id)
}
const matrixFile = 'data-src/ratings-matrix.senate.json'
const ratingsMatrix = fs.existsSync(path.join(root, matrixFile)) ? read(matrixFile) : undefined
write('public/data/links.json', { updated: now, links, ...(ratingsMatrix ? { ratingsMatrix } : {}) })

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(`candidates.json: ${candidates.length} profiles; links.json: ${links.length} links`)
