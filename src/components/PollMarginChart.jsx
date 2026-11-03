import { useId, useMemo, useState } from 'react'
import { absoluteTime, isThirdPartyLead, marginLabel, POLLING_ERROR_PTS, pollPct, raceLabel, raceShortLabel, signedMargin } from './pollUtils.js'
import './PollMarginChart.css'

// Session C. Diverging poll-margin chart: D+ bars extend left, R+ right; third-party leads (gray) plot opposite their major-party opponent.
// Props: { races: race objects with non-null poll, onSelect?: (raceId) => void }
export default function PollMarginChart({ races, onSelect }) {
  const [active, setActive] = useState(null)
  const tipId = useId()

  const rows = useMemo(() => races
    .map((r) => ({ race: r, m: signedMargin(r.poll?.margin, r) }))
    .filter((r) => r.m != null)
    .sort((a, b) => a.m - b.m || raceLabel(a.race).localeCompare(raceLabel(b.race))), [races])

  const scale = useMemo(() => {
    const vals = rows.flatMap(({ race, m }) => [m, ...(race.poll.others || []).map((o) => signedMargin(o.margin, race) ?? 0)])
    const max = Math.max(10, ...vals.map(Math.abs))
    return Math.min(30, Math.ceil(max / 5) * 5)
  }, [rows])

  if (!rows.length) return null

  const pos = (v) => 50 + (Math.max(-scale, Math.min(scale, v)) / scale) * 50
  const band = (POLLING_ERROR_PTS / scale) * 50
  const ticks = [-scale, -scale / 2, 0, scale / 2, scale]

  return (
    <figure className="poll-margin-chart">
      <figcaption className="poll-margin-chart__caption">
        <strong>Polling margin by race</strong>
        <span className="poll-margin-chart__legend">
          <span className="poll-margin-chart__key poll-margin-chart__key--D" /> Dem lead
          <span className="poll-margin-chart__key poll-margin-chart__key--R" /> Rep lead
          {rows.some(({ race }) => isThirdPartyLead(race.poll.margin)) && <><span className="poll-margin-chart__key poll-margin-chart__key--I" /> Independent/third-party lead (plotted opposite its main opponent)</>}
          <span className="poll-margin-chart__key poll-margin-chart__key--band" /> ±{POLLING_ERROR_PTS} pts (typical polling error)
          <span className="poll-margin-chart__key poll-margin-chart__key--dot" /> other aggregators
        </span>
      </figcaption>
      <div className="poll-margin-chart__axis" aria-hidden="true">
        <span className="poll-margin-chart__label" />
        <span className="poll-margin-chart__ticks">
          {ticks.map((t) => (
            <span key={t} className="poll-margin-chart__tick" style={{ left: `${pos(t)}%` }}>
              {t === 0 ? 'Even' : `${t < 0 ? 'D' : 'R'}+${Math.abs(t)}`}
            </span>
          ))}
        </span>
        <span className="poll-margin-chart__value" />
      </div>
      <ul className="poll-margin-chart__rows">
        {rows.map(({ race, m }) => {
          const p = race.poll
          const lo = Math.min(pos(m), 50)
          const hi = Math.max(pos(m), 50)
          const party = isThirdPartyLead(p.margin) ? 'I' : m < 0 ? 'D' : m > 0 ? 'R' : 'tie'
          const isActive = active === race.id
          const summary = (race.candidates || [])
            .filter((c) => pollPct(p, c.id) != null)
            .map((c) => `${c.name} (${c.party}) ${pollPct(p, c.id)}%`).join(', ')
          return (
            <li key={race.id} className="poll-margin-chart__row">
              <button
                type="button"
                className={`poll-margin-chart__btn${isActive ? ' is-active' : ''}`}
                aria-label={`${raceLabel(race)}: ${marginLabel(p.margin)}. ${summary}. Jump to race row.`}
                aria-describedby={isActive ? tipId : undefined}
                onMouseEnter={() => setActive(race.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(race.id)}
                onBlur={() => setActive(null)}
                onClick={() => onSelect?.(race.id)}
              >
                <span className="poll-margin-chart__label">{raceShortLabel(race)}</span>
                <span className="poll-margin-chart__track">
                  <span className="poll-margin-chart__band" style={{ left: `${50 - band}%`, width: `${band * 2}%` }} />
                  <span className="poll-margin-chart__center" />
                  <span className={`poll-margin-chart__bar poll-margin-chart__bar--${party}`} style={{ left: `${lo}%`, width: `${Math.max(hi - lo, 0.6)}%` }} />
                  {(p.others || []).map((o) => {
                    const om = signedMargin(o.margin, race)
                    return om == null ? null : (
                      <span key={o.source} className="poll-margin-chart__dot" style={{ left: `${pos(om)}%` }} title={`${o.source}: ${marginLabel(o.margin)}`} />
                    )
                  })}
                </span>
                <span className={`poll-margin-chart__value party-${party === 'tie' ? 'O' : party}`}>{marginLabel(p.margin)}</span>
              </button>
              {isActive && (
                <div role="tooltip" id={tipId} className="poll-margin-chart__tip">
                  <strong>{raceLabel(race)}</strong>
                  <ul>
                    {(race.candidates || []).filter((c) => pollPct(p, c.id) != null).map((c) => (
                      <li key={c.id}><span className={`party-${c.party}`}>{c.name}</span> {pollPct(p, c.id)}%</li>
                    ))}
                  </ul>
                  <div>{p.source}{p.asOf ? ` · ${absoluteTime(p.asOf)}` : ''}</div>
                  {(p.others || []).map((o) => <div key={o.source} className="muted">{o.source}: {marginLabel(o.margin)}</div>)}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
