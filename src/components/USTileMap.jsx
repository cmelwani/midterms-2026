import { useState } from 'react'
import './USTileMap.css'

// Standard 11x8 tile-grid layout (one square per state + DC).
const TILE_LAYOUT = {
  AK: [0, 0], ME: [10, 0], VT: [9, 1], NH: [10, 1],
  WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2], IL: [5, 2], WI: [6, 2], MI: [7, 2], NY: [8, 2], RI: [9, 2], MA: [10, 2],
  OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3], IN: [5, 3], OH: [6, 3], PA: [7, 3], NJ: [8, 3], CT: [9, 3],
  CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4], KY: [5, 4], WV: [6, 4], VA: [7, 4], MD: [8, 4], DE: [9, 4],
  AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5], NC: [6, 5], SC: [7, 5], DC: [8, 5],
  OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6],
  HI: [0, 7], TX: [3, 7], FL: [8, 7],
}
const S = 40
const G = 3

// Props: { values: { [state]: { fill, label?, tooltip?, textColor?, mark? } }, onSelect?(state), selected?, title, legend?: [{ fill, label }] }
export default function USTileMap({ values = {}, onSelect, selected, title = 'US map', legend, emptyFill = 'var(--ind-light)' }) {
  const [hover, setHover] = useState(null)
  const tip = hover && (values[hover]?.tooltip || hover)
  const pos = hover && TILE_LAYOUT[hover]
  return (
    <figure className="us-tile-map">
      <div className="us-tile-map__wrap">
        <svg viewBox={`0 0 ${11 * S} ${8 * S}`} role="group" aria-label={title} className="us-tile-map__svg">
          {Object.entries(TILE_LAYOUT).map(([st, [x, y]]) => {
            const v = values[st]
            const interactive = Boolean(v && onSelect)
            const act = () => interactive && onSelect(st)
            return (
              <g
                key={st}
                transform={`translate(${x * S + G / 2} ${y * S + G / 2})`}
                className={`us-tile-map__tile${v ? '' : ' us-tile-map__tile--empty'}${selected === st ? ' us-tile-map__tile--selected' : ''}${interactive ? ' us-tile-map__tile--interactive' : ''}`}
                role={interactive ? 'button' : 'img'}
                tabIndex={interactive ? 0 : undefined}
                aria-label={typeof v?.tooltip === 'string' ? v.tooltip : `${st}${v?.label ? `: ${v.label}` : ''}`}
                aria-pressed={interactive ? selected === st : undefined}
                onMouseEnter={() => setHover(st)}
                onMouseLeave={() => setHover((h) => (h === st ? null : h))}
                onFocus={() => setHover(st)}
                onBlur={() => setHover((h) => (h === st ? null : h))}
                onClick={act}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act() } }}
              >
                <rect width={S - G} height={S - G} rx="4" fill={v?.fill || emptyFill} />
                <text x={(S - G) / 2} y={v?.label != null ? 15 : (S - G) / 2 + 4} textAnchor="middle" className="us-tile-map__abbr" fill={v?.textColor || (v ? '#fff' : 'var(--text-muted)')}>{st}</text>
                {v?.label != null && <text x={(S - G) / 2} y={29} textAnchor="middle" className="us-tile-map__label" fill={v?.textColor || '#fff'}>{v.label}</text>}
              </g>
            )
          })}
        </svg>
        {tip && pos && (
          <div className="us-tile-map__tip" role="status" style={{ left: `${((pos[0] + 0.5) / 11) * 100}%`, top: `${((pos[1] + 1) / 8) * 100}%`, transform: `translateX(${pos[0] > 7 ? '-85%' : pos[0] < 3 ? '-15%' : '-50%'})` }}>
            {tip}
          </div>
        )}
      </div>
      {legend?.length > 0 && (
        <figcaption className="us-tile-map__legend">
          {legend.map((l) => (
            <span key={l.label} className="us-tile-map__key"><span className="us-tile-map__swatch" style={{ background: l.fill }} aria-hidden="true" />{l.label}</span>
          ))}
        </figcaption>
      )}
    </figure>
  )
}
