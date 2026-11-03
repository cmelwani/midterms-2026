import { useMemo, useState } from 'react'
import { buildSeats, RATING_LABELS, seatStatus } from './seatModel.js'
import { summarizeChamber } from '../hooks/useResults.jsx'
import './Hemicycle.css'

// Session A owns this file.
// Props: { chamber: 'senate'|'house', summary: results.chambers[chamber], races: race[], raceResult: fn }
// Parliament arc: one dot per seat, D (incl. independents) on the left, R on the right.

const R0 = 0.42 // inner radius (outer = 1)
const VB = { x: -1.06, y: -1.1, w: 2.12, h: 1.16 }

function layout(n) {
  if (!n) return { pts: [], dot: 0 }
  const rows = Math.max(3, Math.min(12, Math.round(Math.sqrt(n / 4))))
  const radii = Array.from({ length: rows }, (_, i) => R0 + ((1 - R0) * i) / (rows - 1))
  const sum = radii.reduce((a, b) => a + b, 0)
  const counts = radii.map((r) => Math.max(1, Math.round((n * r) / sum)))
  counts[rows - 1] += n - counts.reduce((a, b) => a + b, 0)
  const pts = []
  radii.forEach((r, i) => {
    const c = counts[i]
    for (let j = 0; j < c; j++) {
      const t = c === 1 ? Math.PI / 2 : Math.PI - (Math.PI * j) / (c - 1)
      pts.push({ t, r, x: r * Math.cos(t), y: -r * Math.sin(t) })
    }
  })
  pts.sort((a, b) => b.t - a.t || b.r - a.r)
  const radial = (1 - R0) / (rows - 1)
  const arc = Math.PI / counts[rows - 1]
  return { pts, dot: Math.min(radial, arc) * 0.42 }
}

export default function Hemicycle({ chamber, summary, races = [], raceResult = () => null }) {
  const seats = useMemo(() => buildSeats(summary, races, raceResult), [summary, races, raceResult])
  const { pts, dot } = useMemo(() => layout(seats.length), [seats.length])
  const [active, setActive] = useState(null)
  const s = summarizeChamber(summary)
  if (!s || !seats.length) return null

  const name = chamber === 'senate' ? 'Senate' : 'House'
  const seat = active != null ? seats[active] : null
  const pt = active != null ? pts[active] : null
  const move = (i) => setActive(Math.max(0, Math.min(seats.length - 1, i)))
  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (step) { e.preventDefault(); move((active ?? -1) + step) }
    else if (e.key === 'Home') { e.preventDefault(); move(0) }
    else if (e.key === 'End') { e.preventDefault(); move(seats.length - 1) }
    else if (e.key === 'Escape') setActive(null)
  }
  const seatIndex = (e) => {
    const i = e.target?.dataset?.i
    return i == null ? null : Number(i)
  }
  const toWin = s.toWin.D === s.toWin.R ? `${s.toWin.D} to win` : `${s.toWin.D} to win (R: ${s.toWin.R} + VP)`

  return (
    <div className="hemicycle">
      <div className="hemicycle__wrap">
        <svg
          className="hemicycle__svg"
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          role="group"
          tabIndex={0}
          aria-label={`${name} seat map: Democrats ${s.seats.D}, Republicans ${s.seats.R}, ${s.seats.uncalled} uncalled. Use arrow keys to inspect seats.`}
          onKeyDown={onKeyDown}
          onFocus={() => active == null && setActive(0)}
          onBlur={() => setActive(null)}
          onMouseOver={(e) => { const i = seatIndex(e); if (i != null) setActive(i) }}
          onMouseLeave={() => setActive(null)}
          onClick={(e) => { const i = seatIndex(e); if (i != null) setActive(i) }}
        >
          <line className="hemicycle__majority" x1="0" y1={-R0 + 0.1} x2="0" y2={-1.07} />
          {pts.map((p, i) => {
            const st = seats[i]
            const cls = st.kind === 'uncalled' ? 'uncalled' : `${st.kind}-${st.side}`
            return (
              <circle
                key={i}
                data-i={i}
                cx={p.x}
                cy={p.y}
                r={dot}
                className={`hemicycle__seat hemicycle__seat--${cls}${active === i ? ' hemicycle__seat--active' : ''}`}
              />
            )
          })}
          <text className="hemicycle__count hemicycle__count--D" x={-0.06} y={-0.02} textAnchor="end">{s.seats.D}</text>
          <text className="hemicycle__count hemicycle__count--R" x={0.06} y={-0.02} textAnchor="start">{s.seats.R}</text>
          <text className="hemicycle__win" x={0} y={-0.2} textAnchor="middle">{s.toWin.D} to win</text>
        </svg>
        {seat && pt && (
          <div
            className={`hemicycle__tip${pt.x > 0.45 ? ' hemicycle__tip--left' : pt.x < -0.45 ? ' hemicycle__tip--right' : ''}`}
            style={{ left: `${((pt.x - VB.x) / VB.w) * 100}%`, top: `${((pt.y - VB.y) / VB.h) * 100}%` }}
            role="tooltip"
          >
            <strong>{seat.label}</strong>
            <span>{seatStatus(seat)}</span>
            {seat.raceId && seat.ratingKey !== 'unrated' && <span className="muted">Cook: {RATING_LABELS[seat.ratingKey]}</span>}
          </div>
        )}
      </div>
      <p className="sr-only" aria-live="polite">{seat ? `${seat.label}. ${seatStatus(seat)}` : ''}</p>
      <div className="hemicycle__legend small muted" aria-hidden="true">
        <span><i className="hemicycle__key hemicycle__key--won-D" />D won</span>
        {s.notUp.D > 0 && <span><i className="hemicycle__key hemicycle__key--notup-D" />D not up</span>}
        <span><i className="hemicycle__key hemicycle__key--uncalled" />Uncalled</span>
        {s.notUp.R > 0 && <span><i className="hemicycle__key hemicycle__key--notup-R" />R not up</span>}
        <span><i className="hemicycle__key hemicycle__key--won-R" />R won</span>
        <span className="hemicycle__legend-win">| {toWin}</span>
      </div>
    </div>
  )
}
