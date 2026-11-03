import { Link } from 'react-router-dom'
import { useResults } from '../hooks/useResults.jsx'
import './Rules.css'

// Session A owns this page. Facts verified 2026-11-03 against the sources listed at the bottom.
const S = {
  bpSenate: { n: 1, title: 'Ballotpedia — United States Senate elections, 2026', url: 'https://ballotpedia.org/United_States_Senate_elections,_2026' },
  bpHouse: { n: 2, title: 'Ballotpedia — United States House of Representatives elections, 2026', url: 'https://ballotpedia.org/United_States_House_of_Representatives_elections,_2026' },
  constitution: { n: 3, title: 'National Archives — U.S. Constitution, Art. I §§ 2–5', url: 'https://www.archives.gov/founding-docs/constitution-transcript' },
  amend20: { n: 4, title: 'National Archives — 20th Amendment', url: 'https://www.archives.gov/founding-docs/amendments-11-27' },
  bpGa: { n: 5, title: 'Ballotpedia — U.S. Senate election in Georgia, 2026 (general runoff Dec. 1)', url: 'https://ballotpedia.org/United_States_Senate_election_in_Georgia,_2026' },
  bpLa: { n: 6, title: 'Ballotpedia — U.S. House elections in Louisiana, 2026', url: 'https://ballotpedia.org/United_States_House_of_Representatives_elections_in_Louisiana,_2026' },
  bpLaSen: { n: 7, title: 'Ballotpedia — U.S. Senate election in Louisiana, 2026', url: 'https://ballotpedia.org/United_States_Senate_election_in_Louisiana,_2026' },
  maineRcv: { n: 8, title: 'Maine Secretary of State — Ranked-choice voting', url: 'https://www.maine.gov/sos/cec/elec/upcoming/rcv.html' },
  bpRecount: { n: 9, title: 'Ballotpedia — Election recount laws and procedures in the 50 states', url: 'https://ballotpedia.org/Election_recount_laws_and_procedures_in_the_50_states' },
  bpCert: { n: 10, title: 'Ballotpedia — Election results certification dates, 2026', url: 'https://ballotpedia.org/Election_results_certification_dates,_2026' },
  bpAk: { n: 11, title: 'Ballotpedia — U.S. Senate election in Alaska, 2026', url: 'https://ballotpedia.org/United_States_Senate_election_in_Alaska,_2026' },
}
const SOURCES = Object.values(S).sort((a, b) => a.n - b.n)

function Cite({ s }) {
  return <sup className="rules__cite"><a href={`#src-${s.n}`} aria-label={`Source ${s.n}: ${s.title}`}>[{s.n}]</a></sup>
}

const DATES = [
  ['2026-11-03', 'Tue, Nov 3, 2026', 'Election Day. All 435 House seats and 35 Senate seats. Louisiana’s House races are an all-candidate first round.', [S.bpHouse, S.bpLa]],
  ['2026-11-17', 'Nov 17 – Dec 11', 'States certify results on their own schedules — e.g. Florida and Louisiana Nov 17, Georgia Nov 20, Alabama and Alaska Nov 25, Colorado Nov 30, Oregon Dec 10, California Dec 11. Recounts can move these.', [S.bpCert]],
  ['2026-12-01', 'Tue, Dec 1, 2026', 'Georgia general-election runoff, if no candidate wins a majority on Nov 3.', [S.bpGa]],
  ['2026-12-12', 'Sat, Dec 12, 2026', 'Louisiana U.S. House runoffs (top two), where no candidate cleared 50% on Nov 3.', [S.bpLa]],
  ['2027-01-03', 'Sun, Jan 3, 2027', 'Noon: terms of the 120th Congress begin — newly elected senators and representatives are sworn in.', [S.amend20, S.bpHouse]],
]

export default function Rules() {
  const { chamberSummary } = useResults()
  const sen = chamberSummary('senate')
  return (
    <div className="page rules">
      <header className="page__header">
        <h1>How the midterms work</h1>
        <p className="page__lede">What it takes to control each chamber in 2026, what’s on the ballot, how ties and runoffs are settled, and the dates that matter after Election Day.</p>
      </header>

      <nav className="rules__toc card" aria-label="On this page">
        <a href="#control">Winning control</a>
        <a href="#ballot">What’s up in 2026</a>
        <a href="#ties">Ties, runoffs &amp; ranked choice</a>
        <a href="#dates">Key dates</a>
        <a href="#sources">Sources</a>
      </nav>

      <section id="control" className="section">
        <h2>Winning control</h2>
        <div className="grid--2">
          <article className="card rules__chamber rules__chamber--house">
            <h3>House of Representatives</h3>
            <p className="rules__big num">218 <span>of 435</span></p>
            <p>A majority of the 435 voting seats controls the House and elects the Speaker. Every seat is up every two years.<Cite s={S.constitution} /> (The six non-voting delegates don’t count toward a majority.)<Cite s={S.bpHouse} /></p>
          </article>
          <article className="card rules__chamber rules__chamber--senate">
            <h3>Senate</h3>
            <p className="rules__big num">51 <span>of 100</span> <em>or 50 + VP</em></p>
            <p>
              The Vice President is President of the Senate and casts the deciding vote when senators are evenly divided.<Cite s={S.constitution} />{' '}
              With Vice President <strong>JD Vance (R)</strong>, a 50–50 Senate is Republican-controlled — so <span className="party-R"><strong>Republicans need 50</strong></span> seats and <span className="party-D"><strong>Democrats need 51</strong></span>.
            </p>
          </article>
        </div>
        <p className="small muted rules__note">
          How this site counts: independents who caucus with Democrats (Angus King, Bernie Sanders) are counted with Democrats. Any other independent who wins in 2026 is also shown on the Democratic side of the seat bars until their caucus is known, so check the race page for independents.<Cite s={S.bpSenate} />
        </p>
      </section>

      <section id="ballot" className="section">
        <h2>What’s up in 2026</h2>
        <div className="grid--2">
          <article className="card">
            <h3>Senate: 35 seats</h3>
            <ul className="rules__list">
              <li><strong>33 regular Class II seats</strong> — 13 held by Democrats, 20 by Republicans.<Cite s={S.bpSenate} /></li>
              <li><strong>2 special elections</strong> for Class III seats, both Republican-held: <strong>Ohio</strong> (JD Vance’s former seat; appointed Sen. Jon Husted) and <strong>Florida</strong> (Marco Rubio’s former seat; appointed Sen. Ashley Moody). Winners serve until 2029.<Cite s={S.bpSenate} /></li>
              <li><strong>Current Senate:</strong> 53 Republicans, 45 Democrats, 2 independents caucusing with Democrats.<Cite s={S.bpSenate} /></li>
              <li><strong>Not on the ballot:</strong> {sen ? <>{sen.notUp.R} Republican and {sen.notUp.D} Democratic/independent seats</> : '31 Republican and 34 Democratic/independent seats'} (32 D + 2 I).</li>
              <li>Democrats need a <strong>net gain of 4 seats</strong> to win a majority.<Cite s={S.bpSenate} /> A net Democratic gain of 3 gives a 50–50 Senate, which Republicans control through the VP.</li>
            </ul>
          </article>
          <article className="card">
            <h3>House: all 435 seats</h3>
            <ul className="rules__list">
              <li><strong>Current House (119th Congress):</strong> 218 Republicans, 214 Democrats, 1 independent, 2 vacancies.<Cite s={S.bpHouse} /></li>
              <li>Whoever wins <strong>218 districts</strong> on Nov 3 controls the 120th Congress — the current split doesn’t carry over.</li>
              <li><strong>New maps:</strong> California, Florida, Missouri, North Carolina, Tennessee and Texas redrew their districts mid-decade; Ohio uses a new map because of state law, and Alabama, Louisiana and Utah because of litigation. This site uses the districts in effect for Nov 3, 2026.<Cite s={S.bpHouse} /></li>
            </ul>
          </article>
        </div>
      </section>

      <section id="ties" className="section">
        <h2>Ties, runoffs &amp; ranked choice</h2>
        <div className="grid">
          <article className="card">
            <h3>A 50–50 Senate</h3>
            <p>The Vice President breaks tied votes, so the party holding the vice presidency (Republicans, through Jan 2029) controls an evenly split chamber.<Cite s={S.constitution} /></p>
          </article>
          <article className="card">
            <h3>A tied race</h3>
            <p>Close and tied races are settled under state law. Many states order an automatic recount for a tie or a very narrow margin; if a tie survives the recount, state law decides the next step. Ultimately each chamber is the judge of its own members’ elections.<Cite s={S.bpRecount} /><Cite s={S.constitution} /> (For example, Alaska, Maine and Montana recount automatically on a tie vote.)</p>
          </article>
          <article className="card">
            <h3>Georgia runoff</h3>
            <p>Georgia requires a majority. If no candidate tops 50% on Nov 3, the top two meet again in a general-election runoff on <strong>Dec 1, 2026</strong>.<Cite s={S.bpGa} /></p>
          </article>
          <article className="card">
            <h3>Louisiana’s 2026 system</h3>
            <p>Louisiana switched to closed party primaries for Congress in 2026, and its Senate nominees were chosen that way (May 16 primary, June 27 runoff).<Cite s={S.bpLaSen} /> But after the Supreme Court’s <em>Louisiana v. Callais</em> ruling and a new map, the <strong>U.S. House primaries were canceled</strong>: House candidates of all parties run together on Nov 3, and if nobody clears 50% the top two meet on <strong>Dec 12, 2026</strong>. Some Louisiana House seats may stay uncalled until then.<Cite s={S.bpLa} /></p>
          </article>
          <article className="card">
            <h3>Ranked choice: Maine &amp; Alaska</h3>
            <p><strong>Maine</strong> uses ranked-choice voting in its U.S. Senate race: if no one has a majority of first choices, last-place candidates are eliminated and their ballots move to the next choice.<Cite s={S.maineRcv} /> <strong>Alaska</strong> sends the top four primary finishers to a ranked-choice general election (Senate and its at-large House seat).<Cite s={S.bpAk} /> Ranked-choice tabulation waits for absentee ballots, so these calls can take days.</p>
          </article>
        </div>
      </section>

      <section id="dates" className="section">
        <h2>Key dates</h2>
        <ol className="rules__timeline">
          {DATES.map(([iso, label, text, cites]) => (
            <li key={iso}>
              <time dateTime={iso}>{label}</time>
              <p>{text}{cites.map((c) => <Cite key={c.n} s={c} />)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="sources" className="section">
        <h2>Sources</h2>
        <ol className="rules__sources small">
          {SOURCES.map((s) => (
            <li key={s.n} id={`src-${s.n}`}><a href={s.url}>{s.title}</a></li>
          ))}
        </ol>
        <p className="small muted">Composition and calendar facts checked on Nov 3, 2026. Live seat counts are on the <Link to="/">Dashboard</Link>.</p>
      </section>
    </div>
  )
}
