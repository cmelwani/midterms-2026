import { summarizeChamber } from '../hooks/useResults.jsx'
import './SeatBar.css'

// Session A owns this file.
// Props: { chamber: 'senate'|'house', summary: results.chambers[chamber] }
// D (incl. caucusing independents) fills from the left, R from the right, uncalled in the middle.
export default function SeatBar({ chamber, summary }) {
  const s = summarizeChamber(summary)
  if (!s || !s.total) return null
  const pct = (x) => `${(x / s.total) * 100}%`
  const hasNotUp = s.notUp.D + s.notUp.R > 0
  const toWinLabel = s.toWin.D === s.toWin.R
    ? `${s.toWin.D} to win`
    : `${s.majority} to win · ${Math.min(s.toWin.D, s.toWin.R)} + VP`
  const segs = [
    ['d-notup', s.notUp.D, `Democrats + independents not up in 2026: ${s.notUp.D}`],
    ['d-won', s.won.D, `Democrats + independents won in 2026: ${s.won.D}`],
    ['uncalled', s.seats.uncalled, `Uncalled: ${s.seats.uncalled}`],
    ['r-won', s.won.R, `Republicans won in 2026: ${s.won.R}`],
    ['r-notup', s.notUp.R, `Republicans not up in 2026: ${s.notUp.R}`],
  ]
  const aria = `${chamber === 'senate' ? 'Senate' : 'House'}: Democrats ${s.seats.D}, Republicans ${s.seats.R}, ${s.seats.uncalled} uncalled. ${toWinLabel}.`

  return (
    <figure className="seat-bar" data-chamber={chamber}>
      <figcaption className="seat-bar__labels num">
        <span className="seat-bar__party seat-bar__party--D"><abbr title="Democrats (incl. independents who caucus with them)">D</abbr> <b>{s.seats.D}</b></span>
        <span className="seat-bar__mid muted">{s.seats.uncalled} uncalled</span>
        <span className="seat-bar__party seat-bar__party--R"><b>{s.seats.R}</b> <abbr title="Republicans">R</abbr></span>
      </figcaption>
      <div className="seat-bar__track" role="img" aria-label={aria}>
        {segs.map(([k, v, t]) => v > 0 && (
          <span key={k} className={`seat-bar__seg seat-bar__seg--${k}`} style={{ width: pct(v) }} title={t} />
        ))}
        <span className="seat-bar__marker" aria-hidden="true" />
      </div>
      <div className="seat-bar__foot small muted">
        <span className="seat-bar__legend" aria-hidden="true">
          {hasNotUp && <><i className="seat-bar__key seat-bar__key--notup" /> Not up</>}
          <i className="seat-bar__key seat-bar__key--won" /> Won 2026
          <i className="seat-bar__key seat-bar__key--uncalled" /> Uncalled
        </span>
        <span className="seat-bar__majority">▲ {toWinLabel}</span>
      </div>
    </figure>
  )
}
