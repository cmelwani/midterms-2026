import RatingBadge from './RatingBadge.jsx'
import CandidateTable from './CandidateTable.jsx'

// Session B owns this file.
// Props: { race: entry from senate_races.json / house_races.json, result: results.races[race.id]|null }
export default function RaceCard({ race, result }) {
  const title = race.chamber === 'senate'
    ? `${race.stateName}${race.special ? ' (special)' : ''}`
    : `${race.state}-${race.district === 0 ? 'AL' : race.district}`
  return (
    <article className="race-card" id={race.id}>
      <header>
        <h3>{title}</h3>
        <RatingBadge rating={race.rating} />
      </header>
      <CandidateTable candidates={race.candidates} poll={race.poll} result={result} />
    </article>
  )
}
