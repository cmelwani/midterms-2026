import RatingBadge from './RatingBadge.jsx'
import CandidateTable from './CandidateTable.jsx'
import { formatDate, marginLabel, raceTitle } from './RatingBadge.lib.js'
import './RaceCard.css'

export function RaceStatus({ race, result }) {
  if (result?.called) {
    const w = race.candidates.find((c) => c.id === result.winner)
    return <span className="race-card__status race-card__status--called">✓ {w ? w.name : 'Called'}{w ? ` (${w.party})` : ''}</span>
  }
  if (result?.pctReporting > 0) return <span className="race-card__status">{result.pctReporting}% in</span>
  return <span className="race-card__status race-card__status--pending">Not called</span>
}

// Props: { race: entry from senate_races.json / house_races.json, result: results.races[race.id]|null }
export default function RaceCard({ race, result, highlighted = false }) {
  const open = !race.incumbent || !race.incumbent.running
  const poll = race.poll
  return (
    <article className={`race-card${highlighted ? ' race-card--highlight' : ''}${result?.called ? ' race-card--called' : ''}`} id={race.id} tabIndex={-1} aria-labelledby={`${race.id}-title`}>
      <header className="race-card__head">
        <h3 id={`${race.id}-title`} className="race-card__title">
          {raceTitle(race)}
          {race.chamber === 'senate' && <span className="race-card__tag">Class {race.seatClass}</span>}
          {race.special && <span className="race-card__tag race-card__tag--special">Special</span>}
          {open && <span className="race-card__tag race-card__tag--open">Open seat</span>}
        </h3>
        <RatingBadge rating={race.rating} />
      </header>
      <p className="race-card__inc">
        {race.incumbent
          ? <>Incumbent: <strong>{race.incumbent.name}</strong> ({race.incumbent.party}){race.incumbent.running ? '' : ' — not running'}</>
          : 'No incumbent (new or vacant seat)'}
        {race.pvi && <span className="race-card__pvi"> · PVI {race.pvi}</span>}
      </p>
      <CandidateTable candidates={race.candidates} poll={poll} result={result} />
      <footer className="race-card__foot">
        {poll
          ? <span title={(poll.others || []).map((o) => `${o.source}: ${marginLabel(o.margin)} (${formatDate(o.asOf)})`).join('\n') || undefined}>
              Poll avg <strong>{marginLabel(poll.margin)}</strong> · {poll.url ? <a href={poll.url} target="_blank" rel="noreferrer">{poll.source}</a> : poll.source}, {formatDate(poll.asOf)}
              {poll.others?.length ? ` (+${poll.others.length} more)` : ''}
            </span>
          : <span className="muted">No public polling average</span>}
        <RaceStatus race={race} result={result} />
      </footer>
    </article>
  )
}
