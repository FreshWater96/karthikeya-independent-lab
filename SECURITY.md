# Security model

## Authorization

- The allowed owner is an explicitly configured immutable GitHub numeric ID.
- OAuth uses state, PKCE S256, a short-lived encrypted HttpOnly flow cookie, and a fresh GitHub profile lookup after token exchange.
- Provider access tokens are used on the server to check identity; they are not sent to the browser or stored as public content.
- Owner sessions are opaque random tokens with only their SHA-256 hashes stored in PostgreSQL; lifetime is 12 hours.
- Every content mutation, upload, delete, publication action, private preview, and private-file read is checked on the server.
- Mutations also require an owner-bound CSRF token and the configured exact Origin.
- Production HTTPS cookies use the __Host- prefix, Secure, HttpOnly, SameSite=Lax, and path=/.
- No default password, anonymous write endpoint, first-signup administrator, or application test-login bypass exists.
- Integration tests insert short-lived sessions directly into a disposable test database. That fixture is not a route in the application and requires an explicit lab_test database.

## Data exposure

Each entry holds independent `draft` and `published` JSON snapshots. Public pages select only the published snapshot. Draft saving does not change the published text or its attachment references. Live slugs are locked until unpublishing to avoid changing a public URL by saving a draft.

Files are stored in a private bucket and read through a server route that checks the referencing entry's published snapshot or owner session. Knowledge of a UUID is insufficient authorization. No redirect to a public or long-lived signed storage URL is used.

All file responses use private/no-store caching and noindex headers. Never put the file proxy behind a cache that overrides those headers. Unpublishing cannot revoke bytes a visitor already downloaded or a response authorized before unpublishing.

The operator must keep the bucket private. Storage initialization checks supported public-policy/ACL metadata; the integration tests also verify direct anonymous object access is denied.

## Validation

- Zod bounds content, validates slugs, IDs, URLs, and allowed input fields.
- SQL values are parameterized.
- Upload bodies are consumed with strict streaming byte limits after authentication and CSRF checks.
- Image formats are verified by decoding, then re-encoded to WebP with EXIF metadata removed. SVG, AVIF, and animations are not accepted.
- PDFs require valid magic/EOF and successful structural parsing. A sandboxed native-browser frame is used for previews. Parsing is not malware detection.
- Markdown raw HTML and inline external images are disabled. Executable URL schemes are rejected.
- Publication verifies attachment ownership, file-role compatibility, required paper metadata, and alt text.
- Optimistic revision checks prevent silent overwrites from another tab.
- Deletes require confirmation and disallow deletion of files referenced by any current snapshot.

## Operational limitations

This is a single-owner portfolio, not a multi-tenant CMS. There is no role invitation system, billing, telemetry, automated offsite backup, antivirus service, email login, or public write API.

The CSP is a baseline restrictive policy with inline-script support required by the current Next.js rendering configuration. It is not a fully nonce-based strict CSP. Script evaluation is permitted only in development. Keep raw HTML disabled.

Preview mode and robots rules serve different purposes: authentication enforces privacy; robots/noindex are merely indexing instructions. Local development intentionally exposes the public-facing collection on a loopback-only server, without unlocking drafts or administration.

Set a canonical SITE_URL; don't trust user-provided forward headers for authorization decisions. Use HTTPS when hosted. Put your reverse proxy's request-size and request-rate limits in front of the application. Runtime rate limits and body bounds are included, but infrastructure-level controls remain useful.

Unlinked storage objects may remain until the cleanup command is run. The database and bucket need regular backups. Session revocation is a database operation, not an exposed endpoint.

## Verification caveat

An implementation and automated checks are not a security certification. Real OAuth login, deployment-specific storage privacy, TLS/proxy behavior, and operational recovery must be tested in your configured environment before public launch.
