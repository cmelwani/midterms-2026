import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../hooks/useData.js'
import { raceLabel, ratingLabel } from '../components/pollUtils.js'
import './Analysis.css'

const CATEGORIES = [
  { key: 'ratings', title: 'Race ratings', blurb: 'Nonpartisan handicappers’ toss-up / lean / likely / solid calls.' },
  { key: 'forecasts', title: 'Forecast models', blurb: 'Statistical models that turn polls and fundamentals into win probabilities.' },
  { key: 'polling', title: 'Polling', blurb: 'Polling averages and the latest individual polls.' },
  { key: 'reference', title: 'Reference & official data', blurb: 'Candidate lists, maps, campaign finance and voter tools.' },
  { key: 'news', title: 'Results & news', blurb: 'Live results and race calls on election night.' },
]

function ExternalIcon() {
  return (
    <svg className="analysis__ext" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false">
      <path d="M9 2h5v5M14 2 7 9M12 9v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LinkItem({ link, compact = false }) {
  return (
    <li className={`analysis__link${compact ? ' analysis__link--compact' : ''}`}>
      <a href={link.url} target="_blank" rel="noopener noreferrer">
        {link.title}<ExternalIcon /><span className="analysis__sr"> (opens in a new tab)</span>
      </a>
      <span className="analysis__publisher">{link.publisher}</span>
      {!compact && link.description && <p className="analysis__desc">{link.description}</p>}
    </li>
  )
}

const ABBR = { tilt: 'Ti', lean: 'L', likely: 'Li', solid: 'S' }

function cellClass(r) {
  if (!r) return 'analysis__cell--na'
  if (r.category === 'toss-up' || !r.party) return 'analysis__cell--T'
  return `analysis__cell--${r.party}-${r.category}`
}

function RatingsMatrix({ matrix, racesById }) {
  const raceIds = Object.keys(matrix.races || {})
  const pubs = matrix.publishers || []
  const order = { solid: 3, likely: 2, lean: 1, tilt: 0.5, 'toss-up': 0 }
  const score = (r) => (!r ? 0 : (r.party === 'D' ? -1 : r.party === 'R' ? 1 : 0) * (order[r.category] ?? 0))
  const avg = (id) => {
    const vals = pubs.map((p) => matrix.races[id][p.key]).filter(Boolean).map(score)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  }
  const rows = raceIds
    .filter((id) => pubs.some((p) => matrix.races[id][p.key] && matrix.races[id][p.key].category !== 'solid'))
    .sort((a, b) => avg(a) - avg(b))
  if (!rows.length) return null
  return (
    <section className="analysis__section" aria-labelledby="analysis-matrix">
      <h2 id="analysis-matrix">Who rates what: competitive Senate races</h2>
      <p className="muted analysis__blurb">
        Each column is a publisher’s latest rating; rows are sorted from most Democratic-leaning to most Republican-leaning
        on average. Races every outlet rates Solid/Safe are omitted. Compiled from{' '}
        <a href={matrix.sourceUrl} target="_blank" rel="noopener noreferrer">{matrix.source}</a>.
      </p>
      <div className="analysis__matrix-wrap" tabIndex={0} role="region" aria-label="Ratings by publisher (scrollable)">
        <table className="analysis__matrix">
          <thead>
            <tr>
              <th scope="col">Race</th>
              {pubs.map((p) => <th scope="col" key={p.key} title={`${p.name}${p.asOf ? `, ${p.asOf}` : ''}`}><abbr title={p.name}>{p.short || p.key}</abbr></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((id) => (
              <tr key={id}>
                <th scope="row">{racesById[id] ? raceLabel(racesById[id]) : id}</th>
                {pubs.map((p) => {
                  const r = matrix.races[id][p.key]
                  return (
                    <td key={p.key} className={`analysis__cell ${cellClass(r)}`} title={`${p.name}: ${r ? ratingLabel(r) : 'n/a'}`}>
                      {r ? (r.category === 'toss-up' ? 'T' : `${ABBR[r.category] || r.category}${r.party || ''}`) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="analysis__matrix-key muted">
        T = Toss-up · Ti = Tilt · L = Lean · Li = Likely · S = Solid/Safe, followed by the favored party.
      </p>
    </section>
  )
}

export default function Analysis() {
  const { data, loading, error } = useData('links.json')
  const senate = useData('senate_races.json')
  const house = useData('house_races.json')
  const links = useMemo(() => data?.links || [], [data])

  const racesById = useMemo(() => Object.fromEntries(
    [...(senate.data?.races || []), ...(house.data?.races || [])].map((r) => [r.id, r]),
  ), [senate.data, house.data])

  const byRace = useMemo(() => {
    const m = new Map()
    for (const l of links) for (const id of l.raceIds || []) m.set(id, [...(m.get(id) || []), l])
    return [...m.entries()].sort(([a], [b]) => (raceLabel(racesById[a]) || a).localeCompare(raceLabel(racesById[b]) || b))
  }, [links, racesById])

  if (loading && !data) return <div className="page"><h1>Analysis</h1><p className="muted" role="status">Loading links…</p></div>
  if (error && !data) return <div className="page"><h1>Analysis</h1><p role="alert" className="analysis__error">Couldn&apos;t load links: {error.message}</p></div>

  const general = links.filter((l) => !l.raceIds?.length)
  const extra = [...new Set(general.map((l) => l.category))].filter((c) => !CATEGORIES.some((k) => k.key === c))

  return (
    <div className="page analysis">
      <h1>Analysis &amp; sources</h1>
      <p className="muted analysis__intro">Free, independent ratings, forecasts, polling and reference sources for the 2026 midterms. All links open in a new tab.</p>

      {!links.length && <p className="analysis__empty">No links yet.</p>}

      <nav className="analysis__toc" aria-label="Jump to section">
        {data?.ratingsMatrix && <a href="#analysis-matrix">Who rates what</a>}
        {CATEGORIES.filter((c) => general.some((l) => l.category === c.key)).map((c) => <a key={c.key} href={`#analysis-${c.key}`}>{c.title}</a>)}
        {byRace.length > 0 && <a href="#analysis-races">Race-specific</a>}
      </nav>

      {data?.ratingsMatrix && <RatingsMatrix matrix={data.ratingsMatrix} racesById={racesById} />}

      <div className="analysis__groups">
        {[...CATEGORIES, ...extra.map((k) => ({ key: k, title: k }))].map((c) => {
          const items = general.filter((l) => l.category === c.key)
          if (!items.length) return null
          return (
            <section key={c.key} className="analysis__section analysis__group" aria-labelledby={`analysis-${c.key}`}>
              <h2 id={`analysis-${c.key}`}>{c.title}</h2>
              {c.blurb && <p className="muted analysis__blurb">{c.blurb}</p>}
              <ul className="analysis__list">{items.map((l) => <LinkItem key={l.id} link={l} />)}</ul>
            </section>
          )
        })}
      </div>

      {byRace.length > 0 && (
        <section className="analysis__section" aria-labelledby="analysis-races">
          <h2 id="analysis-races">Race-specific analysis</h2>
          <div className="analysis__races">
            {byRace.map(([id, items]) => {
              const race = racesById[id]
              return (
                <article key={id} className="analysis__race" id={`analysis-${id}`}>
                  <h3>
                    {race ? <Link to={race.chamber === 'senate' ? `/senate#${id}` : `/house#${id}`}>{raceLabel(race)}</Link> : id}
                  </h3>
                  <ul className="analysis__list">{items.map((l) => <LinkItem key={l.id} link={l} compact />)}</ul>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
