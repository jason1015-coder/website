# Developer profile

A dark, technical personal site for a hobbyist developer: an oversized name hero
with the portrait, a stack ticker, selected work with code-window covers, and a
contact panel that points at GitHub. Each project has an engineering case study
with facts, stack and a next-project link.

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

- `src/data/site.ts` is the whole site: name, role, socials and projects. Every
  page reads from it.
  It is filled in for Jason C (@jason1015-coder) from the public GitHub profile
  and repository READMEs — update the project links and facts there as the
  repos change.
- `src/app/components/CodeWindow.tsx` renders the project covers. Each project
  supplies its own `snippet` (file name and lines); `+` lines show green, `~`
  amber and `-` red, so a migration diff reads at a glance.
- `src/app/pages/*` are the two pages (home and case study); `src/app/components/motion.tsx` holds the
  reusable animation pieces (masked line reveals, parallax, magnetic buttons).
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
