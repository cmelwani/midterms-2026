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

## Deploy

`.github/workflows/deploy.yml` validates, lints, builds with `BASE_PATH=/<repo>/` and deploys to
GitHub Pages on every push to `main` (Settings → Pages → Source must be "GitHub Actions").
`dist/404.html` is a copy of `index.html` so deep links work.
