#!/usr/bin/env node
// Seeds data-src/*.csv from Wikipedia wikitext (which cites Cook Political Report ratings,
// state candidate lists and poll aggregators). Run once; then hand-correct the CSVs and run
// `npm run build:races` (scripts/build-races.mjs). Re-seeding overwrites the seed CSVs, so
// put lasting corrections in data-src/overrides.json instead.
//
// Usage: node scripts/build-races-seed.mjs [--offline]   (--offline = use cached wikitext only)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { STATES, toCsv, partyCode, cleanName, parseDate } from './build-races-lib.mjs'

const root = join(import.meta.dirname, '..')
const out = join(root, 'data-src')
const cache = join(root, 'node_modules', '.cache', 'build-races')
mkdirSync(cache, { recursive: true })
const offline = process.argv.includes('--offline')
const WIKI = 'https://en.wikipedia.org/wiki/'

async function wiki(title) {
  const file = join(cache, `${title.replace(/[^\w-]/g, '_')}.wiki`)
  if (existsSync(file)) return readFileSync(file, 'utf8')
  if (offline) throw new Error(`not cached: ${title}`)
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(title)}&action=raw`, {
      headers: { 'User-Agent': 'midterms-2026-databuild/1.0 (https://github.com/cmelwani/midterms-2026)' },
    })
    if (res.ok) {
      const text = await res.text()
      writeFileSync(file, text)
      return text
    }
    await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)))
  }
  throw new Error(`fetch failed: ${title}`)
}

// --- wikitext helpers ---
const stripRefs = (s) => s
  .replace(/<ref[^>]*\/>/g, '')
  .replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '')

function tableRows(text) {
  // Split a wikitable into rows (arrays of raw lines).
  return text.split(/\n\|-[^\n]*/).map((r) => r.split('\n').filter(Boolean))
}

function section(text, startRe, endRe = /\n==[^=]/) {
  const m = text.match(startRe)
  if (!m) return ''
  const rest = text.slice(m.index + m[0].length)
  const e = rest.search(endRe)
  return e === -1 ? rest : rest.slice(0, e)
}

function firstRating(row) {
  const m = row.match(/\{\{USRaceRating\|([A-Za-z]+)(?:\|([A-Z]))?/)
  if (!m) return null
  const word = m[1].toLowerCase()
  const category = word === 'tossup' ? 'toss-up' : word === 'safe' || word === 'solid' ? 'solid' : word
  return { category, party: category === 'toss-up' ? '' : m[2] }
}

function bulletCandidates(rowText) {
  const out = []
  for (const line of rowText.replace(/\{\{Plainlist *\| *\*/gi, '{{Plainlist |\n*').split('\n')) {
    if (!/^\*\s*\{\{Party stripe/i.test(line.trim())) continue
    const party = line.match(/\{\{Party stripe\|([^}|]*)/i)[1]
    let s = stripRefs(line).replace(/^\*\s*\{\{Party stripe\|[^}]*\}\}/i, '')
    s = s.replace(/\{\{[Aa]ye\}\}/g, '').replace(/'''/g, '').replace(/\{\{endplainlist\}\}/gi, '')
    const pm = s.match(/\(([^()]*)\)\s*[\d.]*%?\s*$/)
    const label = pm ? pm[1] : party
    s = pm ? s.slice(0, pm.index) : s
    out.push({ name: cleanName(s), party: partyCode(label, party), partyLabel: label })
  }
  return out
}

// ----------------------------------------------------------------- Senate
const senateMain = await wiki('2026_United_States_Senate_elections')
const senRaces = []
const senCands = []
{
  const summary = section(senateMain, /== Race summary ==/)
  for (const row of tableRows(summary)) {
    const text = row.join('\n')
    const head = text.match(/^! \[\[2026 United States Senate (special )?election in ([^|\]]+)\|[^\]]*\]\](.*)$/m)
    if (!head) continue
    const stateName = head[2]
    const st = Object.entries(STATES).find(([, n]) => n === stateName)[0]
    const special = Boolean(head[1])
    const seatClass = special ? 3 : 2
    const id = `sen-${st.toLowerCase()}-${seatClass}`
    const cells = row.filter((l) => l.startsWith('|') && !/Shading PVI/i.test(l))
    const incLine = stripRefs(cells[0] || '')
    let incName = incLine.match(/\{\{sortname\|([^|}]+)\|([^|}]+)/)
    incName = incName ? `${incName[1]} ${incName[2]}` : cleanName(incLine.replace(/^\|\s*/, '').replace(/\{\{efn[\s\S]*$/, ''))
    const incParty = partyCode((cells[1] || '').split('|').pop().trim())
    const status = stripRefs(text.match(/^\|[^\n]*(Incumbent|Interim appointee)[^\n]*$/m)?.[0] || '')
      .replace(/^.*\|\s*(?=Incumbent|Interim)/, '').replace(/<br \/>/g, ' ').replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1').trim()
    senRaces.push({ id, state: st, stateName, seatClass, special, incumbentName: incName, incumbentParty: incParty, status, source: `${WIKI}2026_United_States_Senate_elections#Race_summary` })
    for (const c of bulletCandidates(text)) senCands.push({ raceId: id, ...c })
  }
}

const senRatings = []
{
  const pred = section(senateMain, /== Predictions ==/)
  const asOf = parseDate(pred.match(/Cook\]\]''<br \/>\{\{small\|([^}]+)\}\}/)[1].replace(/<br ?\/?>/g, ' '))
  for (const row of tableRows(pred)) {
    const text = row.join('\n')
    const head = text.match(/^! \[\[2026 United States Senate (special )?election in ([^|\]]+)\|/m)
    if (!head) continue
    const st = Object.entries(STATES).find(([, n]) => n === head[2])[0]
    const r = firstRating(text)
    senRatings.push({ raceId: `sen-${st.toLowerCase()}-${head[1] ? 3 : 2}`, ...r, asOf, source: 'Cook Political Report', url: 'https://www.cookpolitical.com/ratings/senate-race-ratings', via: `${WIKI}2026_United_States_Senate_elections#Predictions` })
  }
}

// Senate poll aggregates from each state's article (first "Aggregate polls" table in the
// General election section whose columns match the nominees).
const senPolls = []
for (const r of senRaces) {
  const title = r.special
    ? `2026_United_States_Senate_special_election_in_${r.stateName.replace(/ /g, '_')}`
    : `2026_United_States_Senate_election_in_${r.stateName.replace(/ /g, '_')}`
  const text = await wiki(title)
  const general = section(text, /\n== ?General election ?==/)
  const tables = general.split(/Aggregate polls/).slice(1).map((t) => t.slice(0, t.indexOf('\n|}')))
  const nominees = senCands.filter((c) => c.raceId === r.id)
  for (const t of tables) {
    const headers = [...t.matchAll(/^!([^\n]*)$/gm)].map((m) => stripRefs(m[1]).replace(/\{\{[^{}]*\}\}/g, '').replace(/^.*\|/, '').replace(/<br ?\/?>|<wbr ?\/?>/g, ' ').replace(/\{\{[^}]*\}\}/g, '').replace(/\s+/g, ' ').trim())
    const candCols = headers.slice(3).filter((h) => !/^other|^undecided|^margin/i.test(h))
    const matched = candCols.map((h) => {
      const name = h.replace(/\([A-Z]\)$/, '').trim()
      const last = name.split(' ').pop().toLowerCase()
      return nominees.find((n) => n.name.toLowerCase().endsWith(last) && (n.name.toLowerCase().split(' ')[0] === name.toLowerCase().split(' ')[0] || nominees.filter((x) => x.name.toLowerCase().endsWith(last)).length === 1))
    })
    if (!candCols.length || matched.some((m) => !m)) continue
    for (const row of tableRows(t).slice(1)) {
      const lines = row.filter((l) => l.startsWith('|'))
      if (lines.length < 3 + candCols.length || /colspan/.test(lines[0])) continue
      const src = lines[0]
      const name = stripRefs(src).replace(/<ref[\s\S]*$/, '').replace(/''/g, '').replace(/^\|/, '').replace(/\[\[([^|\]]*\|)?([^\]]*)\]\]/g, '$2').replace(/\[https?:\S+ ([^\]]*)\]/g, '$1').trim()
      let url = src.match(/url=\s*([^\s|}]+)/)?.[1]
      if (!url) {
        const refName = src.match(/<ref name="?([^"/>]+)"?\s*\/>/)?.[1]
        if (refName) url = text.match(new RegExp(`<ref name="?${refName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?>[^<]*?url=\\s*([^\\s|}]+)`))?.[1]
      }
      const updated = parseDate(stripRefs(lines[2]).replace(/^\|/, ''))
      const pcts = lines.slice(3, 3 + candCols.length).map((l) => Number(l.replace(/^.*\|/, '').replace(/[^\d.]/g, '')))
      if (pcts.some((p) => !Number.isFinite(p) || p === 0)) continue
      matched.forEach((m, i) => senPolls.push({ raceId: r.id, source: name, url: url || '', asOf: updated || '', candidate: m.name, pct: pcts[i] }))
    }
    break
  }
}

// ----------------------------------------------------------------- House
const houseMain = await wiki('2026_United_States_House_of_Representatives_elections')
const houseRaces = []
const houseCands = []
{
  const start = houseMain.indexOf('\n==Alabama==')
  const end = houseMain.indexOf('\n==', houseMain.indexOf('\n==Wyoming==') + 5)
  const body = houseMain.slice(start, end)
  let cur = null
  for (const row of tableRows(body)) {
    const text = row.join('\n')
    const head = text.match(/^!(?:rowspan=\d+ ?\|)?\{\{ushr\|([A-Z]{2})\|(\w+)\|X\}\}/m)
    if (head) {
      const district = head[2] === 'AL' ? 0 : Number(head[2])
      cur = { id: `house-${head[1].toLowerCase()}-${district === 0 ? 'al' : String(district).padStart(2, '0')}`, state: head[1], stateName: STATES[head[1]], district, pvi: (text.match(/shading PVI\|([DR])\|([\d.]+)/i) || []).slice(1).join('+'), incumbents: [] }
      houseRaces.push(cur)
      for (const c of bulletCandidates(text)) houseCands.push({ raceId: cur.id, ...c })
    } else if (!cur || !/sortname/.test(text)) continue
    const t = stripRefs(text).replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, (m, a) => (m.includes('sortname') ? m : a))
    const sn = t.match(/\{\{sortname\|([^|}]+)\|([^|}]+)/) || t.match(/^\|\[\[(?:[^|\]]*\|)?([^\]]+?)\]\]\s*$()/m)
    if (sn) {
      const party = partyCode(t.match(/\|\s*(Democratic|Republican|DFL|Independent)\s*$/m)?.[1] || '')
      const statusLine = t.split('\n').filter((l) => /Incumbent|resigned|died|lost/i.test(l) && !/sortname|plainlist/i.test(l)).pop() || ''
      const status = statusLine.replace(/^.*\|\s*(?=[A-Z])/, '').replace(/<br ?\/?>/g, ' ').replace(/\[\[[^|\]]*\|([^\]]*)\]\]/g, '$1').replace(/\[\[([^\]]*)\]\]/g, '$1').replace(/\{\{[^}]*\}\}/g, '').trim()
      cur.incumbents.push({ name: `${sn[1]} ${sn[2]}`.trim(), party, status })
    }
  }
}

const houseRatingsWiki = await wiki('2026_United_States_House_of_Representatives_election_ratings')
const houseRatings = []
{
  const tbl = section(houseRatingsWiki, /===Latest published ratings for competitive seats===/, /\n\|\}/)
  const asOf = parseDate(tbl.match(/Cook Political Report\|Cook\]\]<br>\{\{small\|([^}]+)\}\}/)[1].replace(/<br ?\/?>/g, ' '))
  for (const row of tableRows(tbl)) {
    const text = row.join('\n')
    const head = text.match(/^!\{\{ushr\|([A-Z]{2})\|(\w+)(?:\|[Xx])?\}\}/m)
    if (!head) continue
    const r = firstRating(text)
    const d = head[2] === 'AL' ? 'al' : head[2].padStart(2, '0')
    houseRatings.push({ raceId: `house-${head[1].toLowerCase()}-${d}`, ...r, asOf, source: 'Cook Political Report', url: 'https://www.cookpolitical.com/ratings/house-race-ratings', via: `${WIKI}2026_United_States_House_of_Representatives_election_ratings` })
  }
}

// ----------------------------------------------------------------- write
const w = (f, rows, cols) => writeFileSync(join(out, f), toCsv(rows, cols))
w('senate_races.csv', senRaces, ['id', 'state', 'stateName', 'seatClass', 'special', 'incumbentName', 'incumbentParty', 'status', 'source'])
w('senate_candidates.csv', senCands, ['raceId', 'name', 'party', 'partyLabel'])
w('senate_ratings.csv', senRatings, ['raceId', 'category', 'party', 'asOf', 'source', 'url', 'via'])
w('senate_polls.csv', senPolls, ['raceId', 'source', 'url', 'asOf', 'candidate', 'pct'])
w('house_races.csv', houseRaces.map((r) => {
  const running = r.incumbents.find((i) => /renominated|advanced|unopposed|running for re|re-elected/i.test(i.status))
  const inc = running || r.incumbents[0] || null
  return { id: r.id, state: r.state, stateName: r.stateName, district: r.district, pvi: r.pvi, incumbentName: inc?.name || '', incumbentParty: inc?.party || '', status: inc?.status || '', otherIncumbents: r.incumbents.filter((i) => i !== inc).map((i) => `${i.name} (${i.party}): ${i.status}`).join('; ') }
}), ['id', 'state', 'stateName', 'district', 'pvi', 'incumbentName', 'incumbentParty', 'status', 'otherIncumbents'])
w('house_candidates.csv', houseCands, ['raceId', 'name', 'party', 'partyLabel'])
w('house_ratings.csv', houseRatings, ['raceId', 'category', 'party', 'asOf', 'source', 'url', 'via'])
console.log(`senate races=${senRaces.length} cands=${senCands.length} ratings=${senRatings.length} pollRows=${senPolls.length}; house races=${houseRaces.length} cands=${houseCands.length} ratings=${houseRatings.length}`)
