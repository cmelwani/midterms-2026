import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useResults } from '../hooks/useResults.jsx'
import { useData } from '../hooks/useData.js'
import SeatBar from '../components/SeatBar.jsx'
import Hemicycle from '../components/Hemicycle.jsx'
import RatingSpectrum from '../components/RatingSpectrum.jsx'
import MajorityBuilder from '../components/MajorityBuilder.jsx'
import RatingBadge from '../components/RatingBadge.jsx'
import { raceLabel, sideOf, winnerOf, leaderOf } from '../components/seatModel.js'
import { partyInfo } from '../lib/ids.js'
import './Dashboard.css'

// Session A owns this page.
const CHAMBERS = [['senate', 'Senate'], ['house', 'House']]
const EMPTY = []
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const fullFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const CALLED_PREVIEW = 12

function StatusBanner({ results, error }) {
  if (!results) {
    return error
      ? <div className="state state--error">Couldn’t load results: {error.message}. Retrying every 60 s.</div>
      : <div className="state">Loading results…</div>
  }
  const { status, chambers = {} } = results
  const called = (chambers.senate?.racesCalled || 0) + (chambers.house?.racesCalled || 0)
  const up = (chambers.senate?.racesUp || 0) + (chambers.house?.racesUp || 0)
  const updated = Date.parse(results.updated)
  const text = {
    'pre-election': `Election Day — Tuesday, November 3, 2026. No races have been called yet; calls appear here automatically as polls close.`,
    live: `Results are coming in: ${called} of ${up} races called.`,
    final: `All ${up} races have been called.`,
  }[status] || 'Status unknown.'
  return (
    <div className={`dashboard__banner dashboard__banner--${status}`} role="status">
      <span className="dashboard__banner-tag">{status === 'pre-election' ? 'Pre-election' : status === 'live' ? 'Live' : 'Final'}</span>
      <span>{text}</span>
      {!Number.isNaN(updated) && <span className="dashboard__banner-time muted">Results file updated {fullFmt.format(updated)}</span>}
      {error && <span className="dashboard__banner-err">Last refresh failed — showing the last good data.</span>}
    </div>
  )
}

function MajorityCard({ chamber, name, summary, s }) {
  const vp = chamber === 'senate' && s.toWin.D !== s.toWin.R
  return (
    <article className="card dashboard__majority">
      <header className="dashboard__majority-head">
        <h2>{name}</h2>
        <span className="muted small num">{s.racesCalled} of {s.racesUp} races called</span>
      </header>
      <p className="dashboard__majority-rule small muted">
        {vp
          ? <>{s.majority} of {s.total} seats for control, or {Math.min(s.toWin.D, s.toWin.R)} + the Vice President (JD Vance, R) breaking ties.</>
          : <>{s.majority} of {s.total} seats for a majority.</>}
      </p>
      <div className="dashboard__needs">
        {['D', 'R'].map((p) => (
          <div key={p} className={`dashboard__need dashboard__need--${p}`}>
            <span className="dashboard__need-party">{p === 'D' ? 'Democrats' : 'Republicans'}</span>
            <span className="dashboard__need-seats num">{s.seats[p]}</span>
            <span className="dashboard__need-text small">
              {s.control === p ? <strong>{s.seats[p] >= s.majority ? 'Majority won' : 'Control won (VP tiebreak)'}</strong> : <>needs <strong className="num">{s.needed[p]}</strong> more{vp ? ` (${s.toWin[p]})` : ''}</>}
            </span>
          </div>
        ))}
      </div>
      <SeatBar chamber={chamber} summary={summary} />
    </article>
  )
}

function CalledList({ calledRaces, raceById }) {
  const [all, setAll] = useState(false)
  if (!calledRaces.length) return <p className="state">No races called yet.</p>
  const shown = all ? calledRaces : calledRaces.slice(0, CALLED_PREVIEW)
  return (
    <>
      <ol className="dashboard__called">
        {shown.map((r) => {
          const race = raceById.get(r.raceId)
          const w = winnerOf(race, r)
          const flip = w && race?.incumbent && sideOf(race.incumbent.party) !== sideOf(w.party)
          const t = Date.parse(r.calledAt)
          return (
            <li key={r.raceId} className={`dashboard__called-row party-bg-${w?.party || 'O'}`}>
              <time className="dashboard__called-time num muted" dateTime={r.calledAt || undefined}>{Number.isNaN(t) ? '—' : timeFmt.format(t)}</time>
              <span className="dashboard__called-race">
                {race ? <Link to={`/${race.chamber}#${race.id}`}>{raceLabel(race)}</Link> : r.raceId}
                <span className="muted small"> {race?.chamber === 'senate' ? 'Senate' : race ? 'House' : ''}</span>
              </span>
              <span className="dashboard__called-winner">
                <span className={`party-dot party-dot--${w?.party}`} aria-hidden="true" />
                {w ? <Link to={`/candidate/${w.id}`}>{w.name}</Link> : r.winner}
                {w && <span className={`party-${w.party}`}> ({partyInfo(w.party).short})</span>}
              </span>
              {flip && <span className="tag dashboard__flip">{sideOf(w.party) === 'D' ? 'D' : 'R'} gain</span>}
            </li>
          )
        })}
      </ol>
      {calledRaces.length > CALLED_PREVIEW && (
        <button type="button" className="btn dashboard__more" onClick={() => setAll(!all)}>
          {all ? 'Show fewer' : `Show all ${calledRaces.length} calls`}
        </button>
      )}
    </>
  )
}

function WatchList({ races, raceResult }) {
  if (!races.length) return <p className="state">No toss-up races in the race data.</p>
  return (
    <ul className="dashboard__watch">
      {races.map((race) => {
        const r = raceResult(race.id)
        const w = winnerOf(race, r)
        const lead = !w && leaderOf(race, r)
        const m = race.poll?.margin
        const [d, rep] = ['D', 'R'].map((p) => race.candidates.find((c) => c.party === p))
        return (
          <li key={race.id} className="dashboard__watch-row">
            <span className="dashboard__watch-race">
              <Link to={`/${race.chamber}#${race.id}`}>{raceLabel(race)}</Link>
              <span className="muted small">{race.chamber === 'senate' ? 'Senate' : 'House'}</span>
            </span>
            <RatingBadge rating={race.rating} />
            <span className="dashboard__watch-who small">
              {[d, rep].filter(Boolean).map((c, i) => (
                <span key={c.id}>{i > 0 && ' vs. '}<Link className={`party-${c.party}`} to={`/candidate/${c.id}`}>{c.name}</Link>{c.incumbent ? '*' : ''}</span>
              ))}
            </span>
            <span className="dashboard__watch-status small">
              {w ? <strong className={`party-${w.party}`}>✓ {w.name}</strong>
                : lead ? <>{lead.name} leads · {r.pctReporting}% in</>
                  : m ? <span className="muted">Polls: {m.party ? `${m.party} +${m.points}` : 'tied'}</span>
                    : <span className="muted">No results yet</span>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export default function Dashboard() {
  const { results, error, raceResult, chamberSummary, calledRaces } = useResults()
  const senate = useData('senate_races.json')
  const house = useData('house_races.json')
  const senateRaces = senate.data?.races || EMPTY
  const houseRaces = house.data?.races || EMPTY
  const allRaces = useMemo(() => [...senateRaces, ...houseRaces], [senateRaces, houseRaces])
  const raceById = useMemo(() => new Map(allRaces.map((r) => [r.id, r])), [allRaces])
  const tossUps = useMemo(() => allRaces.filter((r) => r.rating?.category === 'toss-up'), [allRaces])
  const racesFor = { senate: senateRaces, house: houseRaces }
  const raceError = senate.error || house.error
  const racesLoading = (senate.loading && !senate.data) || (house.loading && !house.data)
  const sample = senate.data?._sample || house.data?._sample

  return (
    <div className="page dashboard">
      <header className="page__header">
        <h1>2026 Midterm Elections</h1>
        <p className="page__lede">Who controls Congress? Live seat counts for the U.S. Senate and House, refreshed every 60 seconds.</p>
      </header>

      <StatusBanner results={results} error={error} />
      {sample && <p className="state state--warn small dashboard__sample">Race files are still sample data; seat maps fill in as the full race list lands.</p>}

      {results && (
        <section className="section grid--2" aria-label="Majority math">
          {CHAMBERS.map(([ch, name]) => {
            const s = chamberSummary(ch)
            return s && <MajorityCard key={ch} chamber={ch} name={name} summary={results.chambers[ch]} s={s} />
          })}
        </section>
      )}

      {results && (
        <section className="section" aria-labelledby="dash-seats">
          <h2 id="dash-seats">Seat map</h2>
          <p className="muted small dashboard__hint">One dot per seat. Hover, tap or use arrow keys to inspect a seat.</p>
          <div className="grid--2">
            {CHAMBERS.map(([ch, name]) => (
              <div key={ch} className="card">
                <h3>{name}</h3>
                <Hemicycle chamber={ch} summary={results.chambers[ch]} races={racesFor[ch]} raceResult={raceResult} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="dashboard__cols section">
        <section className="card" aria-labelledby="dash-called">
          <h2 id="dash-called">Races called <span className="muted small num">({calledRaces.length})</span></h2>
          {results ? <CalledList calledRaces={calledRaces} raceById={raceById} /> : <p className="state">Loading…</p>}
        </section>
        <section className="card" aria-labelledby="dash-watch">
          <h2 id="dash-watch">Races to watch <span className="muted small">Cook toss-ups</span></h2>
          {raceError ? <p className="state state--error">Couldn’t load race data: {raceError.message}</p>
            : racesLoading ? <p className="state">Loading races…</p>
              : <WatchList races={tossUps} raceResult={raceResult} />}
        </section>
      </div>

      {results && (
        <section className="section" aria-labelledby="dash-spectrum">
          <h2 id="dash-spectrum">How the seats are rated</h2>
          <p className="muted small dashboard__hint">Pre-election Cook Political Report ratings. Senate seats not up in 2026 count as Solid for their party.</p>
          <div className="grid--2">
            {CHAMBERS.map(([ch, name]) => (
              <div key={ch} className="card">
                <h3>{name}</h3>
                <RatingSpectrum chamber={ch} summary={results.chambers[ch]} races={racesFor[ch]} raceResult={raceResult} />
              </div>
            ))}
          </div>
        </section>
      )}

      {results && (
        <section className="section card" aria-labelledby="dash-builder">
          <h2 id="dash-builder">Path to a majority: what if…?</h2>
          <p className="muted small dashboard__hint">Pick winners in the toss-up and lean races and watch the majority math update.</p>
          <MajorityBuilder chambers={results.chambers} races={allRaces} raceResult={raceResult} />
        </section>
      )}

      <p className="small muted">How control is decided, runoffs and key dates: <Link to="/rules">Rules</Link>.</p>
    </div>
  )
}
