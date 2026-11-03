import { Link, useParams } from 'react-router-dom'
import { useData } from '../hooks/useData.js'
import { useResults } from '../hooks/useResults.jsx'
import { partyInfo } from '../lib/ids.js'
import RatingBadge from '../components/RatingBadge.jsx'
import RatingScale from '../components/RatingScale.jsx'
import VoteShareBar from '../components/VoteShareBar.jsx'
import { absoluteTime, isStalePoll, marginLabel, pollPct, raceLabel, relativeTime } from '../components/pollUtils.js'
import './Candidate.css'

const SOURCE_LABEL = {
  campaign: 'From the candidate’s campaign website',
  ballotpedia: 'From the candidate’s Ballotpedia Candidate Connection survey',
  'party-platform': 'Party platform, not candidate-specific',
}

function findRace(races, raceId, candidateId) {
  if (raceId) {
    const r = races.find((x) => x.id === raceId)
    if (r) return r
  }
  return races.find((x) => x.candidates?.some((c) => c.id === candidateId)) || null
}

function partyClass(code) {
  return ['D', 'R'].includes(code) ? code : 'O'
}

export default function Candidate() {
  const { id } = useParams()
  const cands = useData('candidates.json')
  const senate = useData('senate_races.json')
  const house = useData('house_races.json')
  const { raceResult } = useResults()

  const races = [...(senate.data?.races || []), ...(house.data?.races || [])]
  const profile = cands.data?.candidates?.find((c) => c.id === id) || null
  const race = findRace(races, profile?.raceId, id)
  const raceEntry = race?.candidates?.find((c) => c.id === id) || null

  const waiting = (!cands.data && cands.loading) || (!profile && ((!senate.data && senate.loading) || (!house.data && house.loading)))
  if (waiting) return <div className="page"><p className="muted" role="status">Loading candidate…</p></div>

  const base = profile || raceEntry
  if (!base) {
    const failed = cands.error || senate.error || house.error
    return (
      <div className="page candidate candidate--missing">
        <h1>Candidate not found</h1>
        {failed
          ? <p role="alert" className="candidate__error">Couldn&apos;t load candidate data ({failed.message}). Try refreshing.</p>
          : <p>We don&apos;t have a candidate with the ID <code>{id}</code>. They may not be a general-election nominee, or the link may be out of date.</p>}
        <p><Link to="/senate">Browse Senate races</Link> · <Link to="/house">Browse House races</Link> · <Link to="/polls">Polls</Link></p>
      </div>
    )
  }

  const usesPlatform = !profile || profile.prioritiesSource === 'party-platform'
  const platform = usesPlatform ? cands.data?.partyPlatforms?.[base.party] || null : null
  const priorities = profile?.priorities || platform?.priorities || []
  const prioritiesSource = profile?.prioritiesSource || (platform ? 'party-platform' : null)
  const party = partyInfo(base.party)
  const result = race ? raceResult(race.id) : null
  const others = (race?.candidates || []).filter((c) => c.id !== id)
  const isWinner = result?.winner === id
  const hasVotes = result?.votes?.some((v) => v.pct > 0)
  const incumbent = profile?.incumbent ?? raceEntry?.incumbent ?? false

  return (
    <div className="page candidate">
      <nav className="candidate__crumbs" aria-label="Breadcrumb">
        {race ? <Link to={race.chamber === 'senate' ? '/senate' : '/house'}>{race.chamber === 'senate' ? 'Senate' : 'House'}</Link> : <Link to="/">Home</Link>}
        {race && <> › <span>{raceLabel(race)}</span></>}
      </nav>

      <header className={`candidate__header candidate__header--${partyClass(base.party)}`}>
        <div>
          <h1 className="candidate__name">
            {base.name}
            {isWinner && <span className="candidate__winner" title="Projected winner"> ✓ Winner</span>}
          </h1>
          <p className="candidate__meta">
            <span className={`candidate__party candidate__party--${partyClass(base.party)}`}>{party.name}</span>
            {incumbent && <span className="candidate__tag">Incumbent</span>}
            {race && <span className="candidate__tag candidate__tag--plain">{raceLabel(race)}</span>}
          </p>
          {profile?.currentOffice && <p className="candidate__office">{profile.currentOffice}</p>}
        </div>
      </header>

      <div className="candidate__grid">
        <section className="candidate__card candidate__about" aria-labelledby="cand-about">
          <h2 id="cand-about">About</h2>
          {profile?.bio
            ? <p>{profile.bio}</p>
            : <p className="muted">No detailed profile for this candidate yet. Showing the {party.name} platform below.</p>}

          <h3>{profile ? 'Top priorities' : `${party.name} platform priorities`}</h3>
          {prioritiesSource === 'party-platform' && (
            <p className="candidate__platform-note">Party platform, not candidate-specific.{platform?.summary ? ` ${platform.summary}` : ''}</p>
          )}
          {priorities.length > 0 ? (
            <ol className="candidate__priorities">
              {priorities.map((p) => <li key={p}>{p}</li>)}
            </ol>
          ) : <p className="muted">Priorities not available.</p>}
          {prioritiesSource && (
            <p className="candidate__source muted">
              Source: {SOURCE_LABEL[prioritiesSource] || prioritiesSource}
              {prioritiesSource === 'party-platform' && (platform?.source || cands.data?.partyPlatforms?.[base.party]?.source) && (
                <> · <a href={platform?.source || cands.data.partyPlatforms[base.party].source} target="_blank" rel="noopener noreferrer">platform</a></>
              )}
            </p>
          )}

          {(profile?.links?.campaign || profile?.links?.ballotpedia) && (
            <ul className="candidate__links">
              {profile.links.campaign && <li><a href={profile.links.campaign} target="_blank" rel="noopener noreferrer">Campaign website ↗</a></li>}
              {profile.links.ballotpedia && <li><a href={profile.links.ballotpedia} target="_blank" rel="noopener noreferrer">Ballotpedia ↗</a></li>}
            </ul>
          )}
        </section>

        <section className="candidate__card candidate__race" aria-labelledby="cand-race">
          <h2 id="cand-race">The race</h2>
          {!race ? (
            <p className="muted">Race details aren&apos;t available yet.</p>
          ) : (
            <>
              <p className="candidate__race-title">
                <Link to={race.chamber === 'senate' ? `/senate#${race.id}` : `/house#${race.id}`}>{raceLabel(race)}</Link>
                {' '}<RatingBadge rating={race.rating} />
              </p>
              {race.rating && (
                <>
                  <RatingScale rating={race.rating} />
                  <p className="muted candidate__small">{race.rating.source}{race.rating.asOf ? `, ${absoluteTime(race.rating.asOf)}` : ''}</p>
                </>
              )}

              {hasVotes && (
                <VoteShareBar
                  candidates={race.candidates}
                  shares={result.votes}
                  highlightId={id}
                  label={result.called ? 'Result' : 'Live vote count'}
                  note={`${result.pctReporting ?? 0}% reporting${result.called && result.calledBy ? ` · called by ${result.calledBy}` : ''}`}
                />
              )}

              {race.poll ? (
                <>
                  <VoteShareBar
                    candidates={race.candidates}
                    shares={race.poll.average}
                    highlightId={id}
                    label={`Polling average: ${marginLabel(race.poll.margin)}`}
                    note={pollPct(race.poll, id) != null ? `${base.name.split(' ').slice(-1)[0]} ${pollPct(race.poll, id)}%` : undefined}
                  />
                  <p className="muted candidate__small">
                    {race.poll.url ? <a href={race.poll.url} target="_blank" rel="noopener noreferrer">{race.poll.source}</a> : race.poll.source}
                    {race.poll.asOf && <> · <time dateTime={race.poll.asOf} title={absoluteTime(race.poll.asOf)}>{relativeTime(race.poll.asOf)}</time></>}
                    {isStalePoll(race.poll) && <span className="candidate__stale"> · stale</span>}
                  </p>
                </>
              ) : <p className="muted candidate__small">No public polling average for this race.</p>}

              <h3>Candidates</h3>
              <ul className="candidate__others">
                {race.candidates?.map((c) => (
                  <li key={c.id} className={c.id === id ? 'is-self' : undefined}>
                    <span className={`candidate__dot candidate__dot--${partyClass(c.party)}`} aria-hidden="true" />
                    {c.id === id ? <strong>{c.name}</strong> : <Link to={`/candidate/${c.id}`}>{c.name}</Link>}
                    {' '}<span className="muted">({c.party}{c.incumbent ? ', inc.' : ''})</span>
                    {result?.winner === c.id && <span className="candidate__check" aria-label="winner"> ✓</span>}
                    {result?.votes?.find((v) => v.candidateId === c.id)?.pct > 0 && (
                      <span className="candidate__vote">{result.votes.find((v) => v.candidateId === c.id).pct}%</span>
                    )}
                  </li>
                ))}
              </ul>
              {others.length === 0 && <p className="muted">No other candidates listed.</p>}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
