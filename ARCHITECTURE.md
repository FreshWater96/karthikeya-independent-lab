# Architecture & design

## Runtime

- Next.js App Router and TypeScript, with server-rendered reading pages.
- React only where interaction is useful: navigation, collections, the content studio, and lazy sculpture loading.
- Original raw Three.js procedural ribbons, orbital contours, geometric linking lines, environment lighting generated locally, and a dark reflective interior form.
- PostgreSQL with explicit parameterized SQL and transactions. A generated ORM layer was deliberately omitted to keep the self-hosted setup and test path smaller.
- Private S3-compatible object storage; local MinIO and PostgreSQL use named persistent volumes.
- GitHub OAuth is dedicated to this application, not connected to any other user website.
- Self-hosted Manrope and IBM Plex Mono fonts; no font requests to third-party services at page load.

Next.js implementation guidance informed the server/client boundaries, asynchronous route parameters, server metadata, private route checks, and standalone build output. The skill's supporting reference files were unavailable; official Next.js documentation was used where needed.

## Routes

| Route | Purpose |
| --- | --- |
| / | Sculpture and editorial overview |
| /work | Published project collection |
| /work/[slug] | Project case study |
| /research | Published website paper collection |
| /research/[slug] | Paper, academic status, PDF preview/download |
| /lab | Published experiments and notes |
| /lab/[slug] | Lab entry |
| /about | Published biography, portrait, CV and contact links |
| /studio | Owner-only editor or locked setup/sign-in |
| /studio/preview/[id] | Authenticated draft preview |
| /api/auth/* | OAuth and session handling |
| /api/studio/* | Owner-authorized CMS operations |
| /api/files/[id] | Request-time authorized file proxy |
| /sitemap.xml | Public, published routes only |
| /robots.txt | Preview exclusion and private-path rules |

## Content lifecycle

Create → private draft → upload private files → add descriptions → save → owner preview → publish snapshot.

After publication, draft edits are separate. Updating publication replaces the snapshot. Unpublishing removes it. Replaced files become publicly accessible only when included in a published snapshot; old file URLs then stop working for anonymous users.

Deleting an entry revokes all its file access and queues its storage keys for cleanup. Deleting unused files queues only those keys. Cleanup checks references before removing them.

## Visual system

The homepage is a typographic composition with an integrated sculpture, not a generic card grid. Work uses offset image-led layouts; Research favors readable text and indexed metadata; the Lab changes to a dark field with orbital line work. Empty collections intentionally show designed invitations, not fabricated records or zero-count dashboards.

The sculpture is an abstract form study, explicitly not scientific data. It uses no borrowed models or scientific claims. The reference sites influenced restraint, hierarchy, geometry, and motion principles; their source code and assets were not copied.

Native scrolling is preserved. The sculpture loads only near the viewport, stops its animation loop offscreen or in a hidden tab, and is disposed when disabled. Static illustration remains visible before WebGL initializes and when WebGL, hardware, or motion preferences call for it.

## Known scope

Settings preview shows the edited homepage text and About content; it is not a full navigable duplicate of the whole site. Videos are validated outbound links rather than third-party embeds. The site has no fake live copilot or analytics controls.

The application targets desktop, tablet, and mobile. Automated layout checks are supplemented by a manual device/browser review before launch. Awwwards-caliber is a creative goal, not a guarantee of an award.
