# Verification record

## Current status

Implementation committed. GitHub Actions verification has been requested; see the latest run for the actual result. No successful build, browser run, real OAuth login, or hosted-storage test is implied by this document until recorded below.

## Automated coverage defined in this repository

- TypeScript validation and production build.
- Unit tests for owner identity, fail-closed ownership, allowed URLs, schema bounds, publication requirements, and no fake defaults.
- Production preview gate and noindex/robots/sitemap exclusion.
- Unauthorized API reads/writes, non-owner sessions, missing CSRF, cross-origin requests, and forged OAuth callbacks.
- Create, edit, save, reload, private preview access, publication, replacement, unpublication, and confirmed deletion.
- Real uploads to a disposable private MinIO bucket; PostgreSQL persistence across requests/refreshes.
- Invalid and oversized image rejection; image re-encoding and required alt text.
- PDF upload, private access, public download, and separation of academic status from website publication.
- Anonymous direct object-store access denied, including for files attached to published entries.
- Published snapshot isolation while draft content changes.
- Old and new attachment URL behavior during replacement.
- Desktop/mobile overflow, menu navigation, keyboard skip link, reduced-motion fallback, WebGL failure fallback.
- Automated WCAG 2 A/AA checks on tested pages.
- Review screenshots of the empty desktop/mobile design.
- A dependency-security report.

The workflow creates disposable local credentials. It never uses account secrets or deploys a website. End-to-end tests refuse to run against any database not explicitly named lab_test and marked LAB_TEST_DATABASE=1.

## Not automatically verified

- Real GitHub OAuth consent/token exchange with your configured app.
- Actual hosted database/storage credentials, production TLS and reverse-proxy behavior.
- Long-term provider durability, disaster recovery, malware scanning, backups.
- Human visual review on real iOS/Android/Safari hardware, assistive-technology review, and hardware-specific 3D smoothness.
- Browser PDF preview support on every platform.

## Manual acceptance checklist

1. Configure your new local OAuth app and sign in as the owner.
2. Attempt sign-in with a different GitHub account; confirm rejection.
3. Upload your own PDF/image, refresh, restart the application and containers without deleting volumes, and confirm persistence.
4. Save a draft; inspect its entry and file URLs in an incognito window.
5. Publish; confirm the published title and attachments load in incognito.
6. Edit the draft and replace a file; confirm visitors still see the previous published snapshot.
7. Publish the update; confirm the old file URL is denied.
8. Unpublish; confirm the entry and files are no longer public.
9. Check image descriptions, mobile menu, keyboard focus, motion toggle, reduced motion, and a disabled-WebGL browser.
10. Confirm external links, DOI, CV, contact links, metadata, sitemap, and errors after adding real content.
11. Review backup and cleanup procedures before any public launch.

## Sources used for implementation checks

- https://nextjs.org/docs/app/api-reference/file-conventions/route
- https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- https://nextjs.org/docs/app/guides/self-hosting
- https://nextjs.org/blog/august-2026-security-release
- https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
