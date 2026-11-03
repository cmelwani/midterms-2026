import { Link } from 'react-router-dom'
import './CandidateTable.css'

const PARTY_NAME = { D: 'Democratic', R: 'Republican', I: 'Independent', L: 'Libertarian', G: 'Green', O: 'Other' }

// Props: { candidates: race.candidates, poll: race.poll|null, result: results.races[id]|null }
export default function CandidateTable({ candidates = [], poll, result }) {
  const pollPct = (id) => poll?.average?.find((a) => a.candidateId === id)?.pct
  const votePct = (id) => result?.votes?.find((v) => v.candidateId === id)?.pct
  const hasVotes = Boolean(result?.votes?.length)
  if (!candidates.length) return <p className="candidate-table__empty muted">No general-election candidates listed.</p>
  return (
    <table className="candidate-table">
      <thead>
        <tr>
          <th scope="col">Candidate</th>
          <th scope="col" className="candidate-table__num">Poll</th>
          {hasVotes && <th scope="col" className="candidate-table__num">Vote</th>}
        </tr>
      </thead>
      <tbody>
        {candidates.map((c) => {
          const won = result?.called && result?.winner === c.id
          const p = pollPct(c.id)
          const v = votePct(c.id)
          return (
            <tr key={c.id} className={won ? 'candidate-table__row--winner' : undefined}>
              <th scope="row" className="candidate-table__name">
                <span className={`candidate-table__chip candidate-table__chip--${c.party}`} title={PARTY_NAME[c.party] || c.party} aria-hidden="true" />
                <Link to={`/candidate/${c.id}`}>{c.name}</Link>
                <span className="candidate-table__party"> ({c.party})</span>
                {c.incumbent && <abbr className="candidate-table__inc" title="Incumbent">inc.</abbr>}
                {won && <span className="candidate-table__check" aria-label="Projected winner" title="Projected winner">✓</span>}
              </th>
              <td className="candidate-table__num" data-label="Poll">{p != null ? `${p}%` : '—'}</td>
              {hasVotes && <td className="candidate-table__num" data-label="Vote">{v != null ? `${v}%` : '—'}</td>}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
