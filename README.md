# Developer profile

A dark, technical personal site for a hobbyist developer: an oversized name hero
with the portrait, a stack ticker, and a live 3D sand table of the GitHub account
— every repository a district, every file a building, height by lines of code —
with a tamagotchi sitting on the desk beside it.

## Run it

```sh
bun install
bun run dev        # http://localhost:5173
bun run build      # dist/client (assets) + dist/portfolio/index.js (Worker)
bun run build:pages # same, built for the /website/ subpath (GitHub Pages)
bun run typecheck
bun test tests
```

## Make it yours

- `src/data/site.ts` is the site copy: name, role, socials and the short
  project blurbs. It is filled in for Jason C (@jason1015-coder).
- `src/app/lib/githubCity.ts` fetches the whole public repo list (paginated),
  each repo's file tree and the raw text of every text file in it — binaries and
  files over 1.5 MB are skipped — so each building's height is a real line
  count. Files stream in per repo, so districts rise as they are counted, and
  results cache in localStorage for 30 minutes. If GitHub's anonymous
  API is rate-limited (60 requests/hour per IP), `src/data/cityRepos.ts` supplies
  the repo list and file data falls back to jsDelivr.
- `src/app/components/city/scene.ts` is the three.js sand table: wooden tray,
  procedural sand, one treemap district per repo, one instanced box per file,
  orbit/zoom, raycast hover and click-through to GitHub. `CitySection.tsx`
  loads the data and renders the stats, legend and tooltip; `tamagotchi.ts` is
  the pet (its LCD mirrors what you hover); `textures.ts` draws the sand, wood,
  district labels and brass plaque on canvas.
- `src/app/pages/Home.tsx` is the single page; `src/app/components/motion.tsx`
  holds the reusable animation pieces (masked line reveals, parallax, magnetic
  buttons).
- `src/styles.css` holds the tokens: near-black canvas, GitHub-blue accent, Bricolage
  Grotesque for display type and the system monospace stack for code.
- There is no contact form: the nav and footer link to GitHub. The small Hono
  worker still exposes `/api/health` and a validated `/api/contact` stub that the
  UI no longer calls; delete it or wire it to an email API if you ever want one.

Motion respects `prefers-reduced-motion`, and the preloader runs once per tab.

## Deploy

**GitHub Pages (automatic).** Every push to `main` runs
`.github/workflows/deploy.yml`: it installs with Bun, typechecks, tests, builds
with `build:pages`, adds a `404.html` SPA fallback and publishes `dist/client`.
Enable it once under Settings → Pages → Build and deployment → Source:
**GitHub Actions**. The site is then served from
`https://jason1015-coder.github.io/website/`, which is why the Pages build uses
the `/website/` base path and the router reads its basename from it.

**Freebuff Sites.** `deploy.json` points at the build output. After `bun run
build`, deploy with the `sites_deploy` tool from this directory.
