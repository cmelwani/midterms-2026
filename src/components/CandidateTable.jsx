import { Link } from 'react-router-dom'

// Session B owns this file.
// Props: { candidates: race.candidates, poll: race.poll|null, result: results.races[id]|null }
export default function CandidateTable({ candidates, poll, result }) {
  const pollPct = (id) => poll?.average?.find((a) => a.candidateId === id)?.pct
  const votePct = (id) => result?.votes?.find((v) => v.candidateId === id)?.pct
  return (
    <table className="candidate-table">
      <tbody>
        {candidates.map((c) => (
          <tr key={c.id}>
            <td className={`party-${c.party}`}>
              {result?.winner === c.id ? '✓ ' : ''}
              <Link to={`/candidate/${c.id}`}>{c.name}</Link> ({c.party}){c.incumbent ? ' *' : ''}
            </td>
            <td>{pollPct(c.id) != null ? `${pollPct(c.id)}%` : '—'}</td>
            <td>{votePct(c.id) != null ? `${votePct(c.id)}%` : ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
