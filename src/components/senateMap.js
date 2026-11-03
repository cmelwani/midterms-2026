import { marginLabel, partyFill, ratingFill, ratingLabel, ratingScore, ratingTextColor, SPECTRUM_FILLS, SPECTRUM_LABELS, SPECTRUM_ORDER } from './RatingBadge.lib.js'

export const SENATE_MAP_LEGEND = [
  ...SPECTRUM_ORDER.map((k) => ({ fill: SPECTRUM_FILLS[k], label: SPECTRUM_LABELS[k] })),
  { fill: 'var(--ind-light)', label: 'No race' },
  { fill: '#111827', label: '✓ = called' },
]

// USTileMap values for Senate races: rating color, or the winner's color once every race in the state is called.
// extra(state) may return { label, tooltip } to append (e.g. House context on the dashboard).
export function senateMapValues(races, raceResult, extra) {
  const v = {}
  for (const st of new Set(races.map((r) => r.state))) {
    const rs = races.filter((r) => r.state === st)
    const winners = rs.map((r) => { const x = raceResult(r.id); return x?.called && r.candidates.find((c) => c.id === x.winner) }).filter(Boolean)
    const main = rs.reduce((a, b) => (Math.abs(ratingScore(b.rating)) < Math.abs(ratingScore(a.rating)) ? b : a))
    const allCalled = winners.length === rs.length
    const tooltip = rs.map((r) => {
      const x = raceResult(r.id)
      const w = x?.called && r.candidates.find((c) => c.id === x.winner)
      return `${r.stateName}${r.special ? ' (special)' : ''}: ${ratingLabel(r.rating)}${r.poll ? `, poll ${marginLabel(r.poll.margin)}` : ''}\n${r.candidates.map((c) => `${c.name} (${c.party})`).join(' vs ')}${w ? `\n✓ ${w.name} wins` : ''}`
    }).join('\n\n')
    v[st] = allCalled
      ? { fill: partyFill(winners[0].party), label: '✓', tooltip }
      : { fill: ratingFill(main.rating), textColor: ratingTextColor(main.rating), label: rs.length > 1 ? '2 races' : undefined, tooltip }
  }
  if (extra) {
    for (const st of Object.keys(v)) {
      const e = extra(st)
      if (e?.tooltip) v[st] = { ...v[st], tooltip: `${v[st].tooltip}\n\n${e.tooltip}` }
    }
  }
  return v
}
