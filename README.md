# Karthikeya — Independent Lab

An original personal research and project portfolio for **Tammineedi Srirama Karthikeya**. Warm ivory, near-black editorial typography, electric cobalt, and a custom procedural Three.js sculpture. No fabricated papers, projects, affiliations, achievements, or contact details.

**Not deployed.** Production defaults to an owner-private preview. This repository itself was public when implementation began; repository visibility is separate from website visibility.

## Run locally

Requires Node.js 22.14+ and Docker with Compose.

```bash
npm install
npm run setup:local
docker compose --env-file .env.local up -d --wait
npm run db:migrate
npm run storage:init
npm run dev
```

Open **http://127.0.0.1:3000**. The development server binds only to loopback. The public-facing design can be explored locally before OAuth setup; this does not unlock the content studio.

Then follow [SETUP.md](SETUP.md) to configure the owner-only studio. Do not commit `.env.local`, paste credentials into chat, or reuse credentials from other applications.

## Application

- Home, Work, Research, Lab, About, collection filtering, detailed case-study and paper pages.
- A custom real-time ribbon sculpture with pointer response, restrained native-scroll movement, and static SVG fallback.
- Lazy-loaded WebGL; reduced-motion and low-power fallback; explicit motion preference; animation suspended offscreen and in hidden tabs.
- Owner-only content studio: create/edit, persistent draft saves, private preview, publish/unpublish, featured/order controls, file replacement, captions/alt text, and confirmed deletion.
- Separate academic paper status and website publication.
- Immutable published snapshots: editing a live entry never exposes the working draft.
- GitHub OAuth with state and PKCE; server-side immutable owner ID checks, opaque database-backed sessions, CSRF/origin checks, and rate limits.
- PostgreSQL content/session persistence; private S3-compatible file storage; local MinIO uses named Docker volumes.
- Validated PDF uploads and re-encoded responsive WebP image variants; protected file proxy with no-store headers. No anonymous storage URLs.
- Route metadata, sharing image, favicon, sitemap excluding drafts, deliberate empty/error/404 pages, keyboard navigation.

The visual work is original procedural geometry and CSS. No proprietary code, assets, or branding were copied from the visual references. No paid assets, external analytics, AI APIs, or Replit services are used.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local-only design preview |
| `npm run build` | Production build |
| `npm start` | Local-only production server, private by default |
| `npm run typecheck` | TypeScript validation |
| `npm test` | Pure schema and security-policy unit tests |
| `npm run test:e2e` | Playwright integration tests; requires disposable `lab_test` database |
| `npm run db:migrate` | Initialize/update the schema without fake content |
| `npm run storage:init` | Initialize and check private object storage |
| `npm run storage:gc` | Permanently clean previously queued, unreferenced objects older than one hour |

## Verification

See [VERIFICATION.md](VERIFICATION.md) and the [GitHub Actions runs](https://github.com/FreshWater96/karthikeya-independent-lab/actions). The workflow builds and tests; it never deploys. Real GitHub OAuth sign-in and a real hosted storage account still require owner configuration and a live smoke test.

## Documentation

- [Local setup, OAuth, and storage](SETUP.md)
- [Security boundaries and operational notes](SECURITY.md)
- [Verification scope and remaining checks](VERIFICATION.md)
- [Architecture and design notes](ARCHITECTURE.md)

The website is intended to be refined with actual content and device testing; no award outcome is implied.
