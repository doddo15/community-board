# Commons — Community Board

A local community posting board: events, calls to action, and notices,
sorted and filtered without any likes, comments, or feed algorithm.

## Running it locally

```
npm install
npm run dev
```

## Data

Posts currently save to your browser's `localStorage` — they're local
to your own device for now, not shared with visitors. This is a
placeholder until the board is connected to a real database.

## Deploying

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds
the site and publishes it to GitHub Pages automatically.

If you rename this repository, update the `base` path in
`vite.config.js` to match, or the deployed site will load blank.
