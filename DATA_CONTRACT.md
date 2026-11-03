# Data contract & file ownership

All data is static JSON under `public/data/`, fetched at runtime with `fetchJson()` / `useData()`
(`src/lib/data.js`, `src/hooks/useData.js`): on every route load, every 60 s, and when the tab
regains focus, with a cache-busting query string. `npm run validate` checks every file below,
including cross-file references; `npm run validate:strict` also requires 35 Senate races,
435 House races and a profile for every Senate / competitive-House candidate. While the race
files still have `"_sample": true`, references into them from `candidates.json`, `links.json` and
`results.json` are reported as warnings instead of errors, so those files can be built in parallel.

Every file has a top-level `"updated"` ISO-8601 timestamp. Remove `"_sample": true` once a
file holds real data.

## Conventions

- **Party codes**: `D`, `R`, `I`, `L`, `G`, `O` (other). Colors: D blue, R red, everything else gray
  (`src/lib/ids.js` `PARTIES`, CSS vars in `src/styles/tokens.css`). Independents who caucus with
  Democrats (King, Sanders) are `I` and count toward the Democratic side in seat math.
- **Race IDs**: Senate `sen-<st>-<class>` (e.g. `sen-ga-2`, `sen-oh-3` for the Ohio special);
  House `house-<st>-<NN>` with a 2-digit district, `al` for at-large (`house-pa-07`, `house-ak-al`).
- **Candidate IDs**: `<st>-sen-<lastname>` / `<st>-<NN|al>-<lastname>`, lowercase ASCII slug of
  the last name with suffixes (Jr., III) dropped, e.g. `ga-sen-ossoff`, `pa-07-mackenzie`,
  `ak-al-begich`. On a collision within one race append `-<firstname>`. Use `candidateId()` in
  `src/lib/ids.js` — every session must derive IDs the same way so files join up.
- **Rating**: `{ "category": "toss-up"|"lean"|"likely"|"solid", "party": "D"|"R"|"I"|null,
  "source": "Cook Political Report", "asOf": "YYYY-MM-DD" }`; `party` is `null` only for toss-ups.
  Use the Cook Political Report's latest rating as the canonical one.
- **Competitive House race** = Cook rating is toss-up, lean or likely (not solid).
- Timestamps are ISO-8601 (`2026-11-02T12:00:00-05:00` or a date `2026-11-02`).

## `senate_races.json` (Session B)

```jsonc
{
  "updated": "ISO",
  "sources": [{ "name": "Ballotpedia", "url": "..." }],
  "races": [{
    "id": "sen-ga-2",
    "chamber": "senate",
    "state": "GA", "stateName": "Georgia",
    "seatClass": 2,            // 1|2|3
    "special": false,           // true for OH and FL specials (class 3)
    "incumbent": { "name": "Jon Ossoff", "party": "D", "candidateId": "ga-sen-ossoff", "running": true },
                                // candidateId null + running false if retiring; incumbent null if vacant
    "candidates": [{ "id": "ga-sen-ossoff", "name": "Jon Ossoff", "party": "D", "incumbent": true }],
                                // general-election nominees (major party first, D then R, then others)
    "rating": { "category": "toss-up", "party": null, "source": "Cook Political Report", "asOf": "2026-10-30" },
    "poll": {                   // null if no public polling
      "average": [{ "candidateId": "ga-sen-ossoff", "pct": 48.0 }],
      "margin": { "party": "D", "points": 1.5 },   // party null if tied
      "source": "RealClearPolling", "url": "https://...", "asOf": "ISO",
      "others": [{ "source": "Split Ticket", "url": "...", "asOf": "ISO", "margin": { "party": "D", "points": 2.0 } }]  // optional
    },
    "winner": null               // candidateId once called (results.json is the live source of truth)
  }]
}
```

## `house_races.json` (Session B)

Same race schema with `"chamber": "house"`, `"district": 7` (0 = at-large) and
`"competitive": true|false` instead of `seatClass`/`special`. All 435 districts.

## `candidates.json` (Session C)

```jsonc
{
  "updated": "ISO",
  "partyPlatforms": {          // used for candidates without a full profile (non-competitive House)
    "D": { "summary": "…", "priorities": ["…", "…", "…"], "source": "https://..." },
    "R": { "summary": "…", "priorities": ["…", "…", "…"], "source": "https://..." }
  },
  "candidates": [{             // every Senate nominee + every nominee in a competitive House race
    "id": "ga-sen-ossoff",     // must match the race file
    "name": "Jon Ossoff", "party": "D",
    "raceId": "sen-ga-2",
    "incumbent": true,
    "currentOffice": "U.S. Senator from Georgia (2021–present)",  // or null
    "bio": "1–3 sentence factual bio",
    "priorities": ["…", "…", "…"],  // exactly 3, from the campaign site / Ballotpedia survey
    "prioritiesSource": "campaign",  // campaign | ballotpedia | party-platform
    "links": { "campaign": "https://...", "ballotpedia": "https://..." }
  }]
}
```

`/candidate/:id` resolves a profile from `candidates.json`; if absent it falls back to the
candidate entry in the race files plus `partyPlatforms[party]`.

## `results.json` (Session A — the file edited on election night)

```jsonc
{
  "updated": "ISO",
  "status": "pre-election",   // pre-election | live | final
  "chambers": {
    "senate": { "total": 100, "majority": 51, "tiebreak": "R",  // VP's party breaks 50-50 ties
                "racesUp": 35, "racesCalled": 0,
                "notUp": { "D": 32, "I": 2, "R": 31 },          // seats not on the 2026 ballot
                "called": { "D": 0, "I": 0, "R": 0 } },         // 2026 races called so far
    "house":  { "total": 435, "majority": 218, "racesUp": 435, "racesCalled": 0,
                "called": { "D": 0, "I": 0, "R": 0 } }
  },
  "races": {                  // keyed by race id; races with no entry are uncalled / 0% reporting
    "sen-ga-2": { "called": false, "winner": null, "calledAt": null, "calledBy": null,
                  "pctReporting": 0, "votes": [{ "candidateId": "ga-sen-ossoff", "pct": 0 }] }
  }
}
```

`racesCalled` must equal the number of `races` entries with `called: true` (validator enforces).

## `links.json` (Session C)

```jsonc
{ "updated": "ISO",
  "links": [{ "id": "cook-senate", "title": "…", "publisher": "Cook Political Report",
              "url": "https://...", "description": "…",
              "category": "ratings",   // ratings | forecasts | polling | reference | news
              "raceIds": [] }] }       // optional: race-specific analysis
```

## Shared hooks & component props (keep these stable)

| Export | Owner | Contract |
| --- | --- | --- |
| `useData(file)` | contract | `{ data, error, loading, lastFetched, stale, refresh }` |
| `useResults()` / `<ResultsProvider>` | A | `{ results, raceResult(raceId), loading, error, lastFetched, stale, refresh }` |
| `<LastUpdated>` | A | `{ lastFetched, updated, stale, loading, error, onRefresh }` |
| `<SeatBar>` | A | `{ chamber: 'senate'\|'house', summary: results.chambers[chamber] }` |
| `<RatingBadge>` | B | `{ rating }` |
| `<CandidateTable>` | B | `{ candidates, poll, result }` |
| `<RaceCard>` | B | `{ race, result }` |

## File ownership (to avoid merge conflicts between parallel sessions)

| Session | Owns |
| --- | --- |
| A | `src/components/Layout.*`, `LastUpdated.*`, `SeatBar.*`, `src/hooks/useResults.jsx`, `src/pages/Dashboard.*`, `src/pages/Rules.*`, `src/styles/tokens.css`, `src/index.css`, `public/data/results.json` |
| B | `src/components/RaceCard.*`, `RatingBadge.*`, `CandidateTable.*`, `src/pages/Senate.*`, `src/pages/House.*`, `public/data/senate_races.json`, `public/data/house_races.json`, any `scripts/build-*races*` |
| C | `src/pages/Candidate.*`, `src/pages/Polls.*`, `src/pages/Analysis.*`, `public/data/candidates.json`, `public/data/links.json`, any `scripts/build-candidates*` |

Each component/page keeps its styles in a sibling `.css` file (e.g. `RaceCard.css`) with
class names prefixed by the component name. Don't edit files you don't own; if a contract
change is needed, note it in your PR description for the integration pass.
