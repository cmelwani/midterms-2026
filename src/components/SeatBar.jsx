// Session A owns this file.
// Props: { chamber: 'senate'|'house', summary: results.chambers[chamber] }
export default function SeatBar({ chamber, summary }) {
  if (!summary) return null
  const { total, majority, called = {}, notUp = {} } = summary
  const seats = (p) => (called[p] || 0) + (notUp[p] || 0)
  return (
    <div className="seat-bar" data-chamber={chamber}>
      D {seats('D') + seats('I')} · R {seats('R')} · {majority} for majority of {total}
    </div>
  )
}
