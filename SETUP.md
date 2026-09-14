# Setup

## 1. Local preview

Use a new clone of this repository, not a folder containing any other website.

```bash
git clone https://github.com/FreshWater96/karthikeya-independent-lab.git
cd karthikeya-independent-lab
npm install
npm run setup:local
docker compose --env-file .env.local up -d --wait
npm run db:migrate
npm run storage:init
npm run dev
```

Open http://127.0.0.1:3000. Node 22.14+ and a running Docker engine with Compose are required. The setup command creates random database and storage credentials in `.env.local` and refuses to overwrite an existing file.

Development mode shows only the public-facing collection locally, including its deliberate empty states. It never bypasses owner authorization for drafts, the studio, writes, or private files.

PostgreSQL and MinIO persist through restarts in named Docker volumes. Stopping containers does not delete those volumes. Do **not** use `docker compose down -v` unless you explicitly intend to destroy the local database and uploads.

## 2. Configure owner sign-in

Create a **new GitHub OAuth App** under your GitHub account's developer settings. Do not use your GitHub password or a personal access token.

For local development:

| Setting | Value |
| --- | --- |
| Application name | Karthikeya Independent Lab — Local |
| Homepage URL | `http://127.0.0.1:3000` |
| Authorization callback URL | `http://127.0.0.1:3000/api/auth/callback/github` |

Copy the OAuth client ID and client secret into `.env.local`:

```dotenv
GITHUB_CLIENT_ID=your-new-oauth-client-id
GITHUB_CLIENT_SECRET=your-new-oauth-client-secret
OWNER_GITHUB_ID=309612209
```

The numeric owner ID above was verified against the connected FreshWater96 account. The application does not derive ownership from a username, email address, first signup, or browser flag.

Keep the generated `AUTH_SECRET`; it must have at least 32 characters. Restart the development server after configuration. Open http://127.0.0.1:3000/studio and sign in with the configured owner's GitHub account.

If credentials, transport configuration, owner ID, or database configuration are missing, admin access stays locked. If the configured database is unreachable, operations fail closed.

Official OAuth setup and flow: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps

## 3. Use the studio

1. Create a project, paper, or lab entry.
2. Add text. Markdown headings, lists, links, and code are supported. Raw HTML is never rendered. Add images through the upload tools rather than Markdown image URLs.
3. Save the draft. Private preview requires your authenticated owner session.
4. Add images or a PDF under **Files & images**. Files go to private object storage, not browser storage or the application filesystem.
5. Add image alt text; publication is blocked without it.
6. Use **Details & links** for year, tags, academic status, links, display order, and featuring.
7. Publish after reviewing. This creates a snapshot; subsequent edits stay in the working draft.
8. Replacing a file changes only the draft. Publish again to expose the replacement and revoke public access to the old file.
9. Unpublish to make the entry and its files owner-only.
10. Detach unused files, save, and update any published snapshot before deleting them from the file library.

Website publication does **not** change a paper's academic status. Setting academic status to "published" does **not** publish it on the website.

Identity, biography, homepage copy, portrait, CV, and contact links are managed in **Identity & site settings**. Publish settings to apply them. Settings private preview includes editable homepage copy and About content.

Lower display-order numbers appear earlier; featured entries are shown first. Save and publish those changes to apply them publicly.

## 4. Private file storage

Local setup uses MinIO, an S3-compatible object store, with a named volume. Its console is available only on loopback at http://127.0.0.1:9001; use the generated S3 credentials from your private environment file.

For a future hosted installation, provision PostgreSQL and a **private** S3-compatible bucket in accounts you control. This repository does not provision or purchase hosting.

Configure:

```dotenv
DATABASE_URL=postgresql://...
S3_ENDPOINT=https://your-s3-compatible-endpoint
S3_REGION=your-region
S3_BUCKET=your-private-bucket
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FORCE_PATH_STYLE=true
```

For AWS S3, omit S3_ENDPOINT and generally set S3_FORCE_PATH_STYLE=false. Use TLS for hosted database and storage connections. Use least-privilege storage credentials scoped to this bucket.

Run storage initialization, then confirm anonymous bucket/object access is denied. Keep all public bucket policies, website hosting, public R2 URLs, and public ACLs disabled. The app deliberately does not issue public signed download URLs or mark objects public.

Images: JPEG, PNG, single-frame WebP, maximum 10 MB and 24 megapixels. They are decoded, metadata-stripped, and re-encoded into 640/1280/1920-width WebP variants without enlarging smaller originals. Original image bytes are not retained.

PDFs: maximum 15 MB, structurally parseable and unencrypted. They retain original bytes. PDF validation is not a malware scan. Upload documents you trust.

## 5. Before any public deployment

Do not deploy until you choose to publish the website. No workflow here deploys it.

The default is:

```dotenv
SITE_MODE=preview
```

Production preview requires owner sign-in. To test it locally:

```bash
npm run build
npm start
```

The production server binds to 127.0.0.1. A future hosting environment may use the generated Next.js standalone server behind a trusted HTTPS reverse proxy.

Only when you intentionally choose a public launch:

- Set SITE_URL to the exact HTTPS origin.
- Register a separate production OAuth app or update its callback to `https://your-domain/api/auth/callback/github`.
- Set SITE_MODE=public **before building and running** the production app.
- Back up the database and bucket, restrict storage access, configure operational monitoring and rate limits at your hosting boundary.
- Run the full manual verification checklist.
- Build and deploy using your chosen platform. Public source-code visibility alone does not deploy this application.

## 6. Maintenance

Run `npm run storage:gc` periodically or after deletions. It permanently deletes only keys already queued for deletion/abandoned uploads, older than one hour, and not referenced by an asset row. Until cleanup, access is still revoked at the application layer. Backups are your responsibility.

Run migrations during updates. Rotate credentials if exposed. To revoke all owner sessions immediately, delete rows from the `sessions` table using your database administration tool; never expose a reset endpoint.

Keep dependency patches current and review the dependency-security CI report.
