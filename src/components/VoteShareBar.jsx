import { partyInfo } from '../lib/ids.js'
import './VoteShareBar.css'

// Session C. Horizontal stacked share bar for one race.
// Props: { candidates: [{ id, name, party }], shares: [{ candidateId, pct }], highlightId?, label, note? }
export default function VoteShareBar({ candidates, shares, highlightId, label, note }) {
  const rows = (candidates || [])
    .map((c) => ({ c, pct: shares?.find((s) => s.candidateId === c.id)?.pct }))
    .filter((r) => r.pct != null && r.pct > 0)
  if (!rows.length) return null
  const total = rows.reduce((a, r) => a + r.pct, 0)
  const rest = Math.max(0, 100 - total)
  const desc = rows.map((r) => `${r.c.name} ${r.pct}%`).join(', ')
  return (
    <figure className="vote-share-bar">
      <figcaption className="vote-share-bar__label">{label}{note && <span className="muted"> · {note}</span>}</figcaption>
      <div className="vote-share-bar__track" role="img" aria-label={`${label}: ${desc}`}>
        {rows.map(({ c, pct }) => (
          <span
            key={c.id}
            className={`vote-share-bar__seg vote-share-bar__seg--${partyInfo(c.party) === partyInfo('O') ? 'O' : c.party}${highlightId === c.id ? ' is-highlight' : ''}${highlightId && highlightId !== c.id ? ' is-dim' : ''}`}
            style={{ flexBasis: `${(pct / Math.max(100, total)) * 100}%` }}
            title={`${c.name}: ${pct}%`}
          >
            {pct >= 12 && <span className="vote-share-bar__pct">{pct}%</span>}
          </span>
        ))}
        {rest > 0 && <span className="vote-share-bar__seg vote-share-bar__seg--rest" style={{ flexBasis: `${rest}%` }} title={`Other / undecided: ${rest.toFixed(1)}%`} />}
        <span className="vote-share-bar__half" aria-hidden="true" />
      </div>
      <ul className="vote-share-bar__legend">
        {rows.map(({ c, pct }) => (
          <li key={c.id} className={highlightId === c.id ? 'is-highlight' : undefined}>
            <span className={`vote-share-bar__swatch vote-share-bar__seg--${['D', 'R'].includes(c.party) ? c.party : 'O'}`} />
            {c.name} <strong>{pct}%</strong>
          </li>
        ))}
      </ul>
    </figure>
  )
}
