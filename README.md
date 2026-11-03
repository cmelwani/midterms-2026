# 2026 Midterms Tracker

React + Vite single-page app tracking the 2026 US Senate and House elections. Static site;
all data lives in `public/data/*.json` and is re-fetched on every route load and every 60 s.

```bash
npm install
npm run dev            # http://localhost:5173
npm run check          # validate data + lint + build
```

See [DATA_CONTRACT.md](DATA_CONTRACT.md) for the JSON schemas, ID conventions and file ownership.

## Election night

Edit `public/data/results.json` (calls, vote %, % reporting, per-chamber `called` counts and
`racesCalled`), run `npm run validate`, and push to `main`. The Pages workflow redeploys in about a
minute and open browsers pick it up on their next 60 s poll.

### Simulating election night (dev only)

`scripts/simulate-results.mjs` writes a plausible, **fake** `results.json` from whatever race files
exist (sample or full), with vote %, % reporting, `calledAt`, and recomputed `called` /
`racesCalled` aggregates. Output passes `npm run validate`.

```bash
npm run dev                          # keep the dashboard open
npm run simulate                     # call 5 more races (cumulative); dashboard updates within 60 s
npm run simulate -- --count 20       # call 20 more
npm run simulate -- --all            # call every race (status "final" once all 470 are called)
npm run simulate -- --fresh --seed 7 # restart from the seed; same race outcomes, current timestamps
npm run simulate:reset               # restore the real pre-election seed
```

Never commit simulated output: run `npm run simulate:reset` before committing.

## Deploy

`.github/workflows/deploy.yml` validates, lints, builds with `BASE_PATH=/<repo>/` and deploys to
GitHub Pages on every push to `main` (Settings → Pages → Source must be "GitHub Actions").
`dist/404.html` is a copy of `index.html` so deep links work.
