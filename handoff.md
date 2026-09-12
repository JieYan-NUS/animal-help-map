# Project Handoff

Last updated: 2026-09-12 (Asia/Singapore)

## Current repository state

- Repository: `animal-help-map` / pawscue.com
- Branch: `feature/google-analytics`
- HEAD before the current uncommitted work: `8f88aa644977686d020d94ab9f75d7038a211123`
- Upstream: `origin/feature/google-analytics`
- The live GitHub branch was verified at the same commit with zero ahead/behind commits.
- Remote: `https://github.com/JieYan-NUS/animal-help-map.git`
- Expected untracked file: `codex_session.md`
- No production data or account settings were changed during migration verification.

## Uncommitted work awaiting review

Two requested Mapbox consistency changes are present but have not been committed:

- `app/api/reports/route.ts` now reads `MAPBOX_ACCESS_TOKEN` instead of `MAPBOX_API_KEY`.
- `README.md` now documents `MAPBOX_ACCESS_TOKEN` instead of `MAPBOX_API_KEY`.

The three continuity documents (`handoff.md`, `session_log.md`, and `future_dev.md`) are also currently untracked until committed.

## Verified local environment

- `.env.local` exists, is ignored by Git, and all expected variables were confirmed nonempty without printing their values.
- Expected variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_GA_ID`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `MAPBOX_ACCESS_TOKEN`
  - `ADMIN_PASSWORD`
  - `ADMIN_COOKIE_SECRET`
- New Mac runtime: Node.js 22.23.2 and npm 10.9.8.
- Old Mac runtime: Node.js 24.12.0 and npm 11.6.2.
- Production builds succeeded on both runtime majors.

## Latest validation

After the Mapbox edits:

- `npm run lint`: passed with five existing `@next/next/no-img-element` warnings.
- `tsc --noEmit --incremental false`: passed.
- `npm run build`: passed.
- Local production smoke test returned HTTP 200 for `/`, `/care`, `/map`, `/report`, `/stories`, `/admin`, and the read-only GET `/api/reports` endpoint.
- No POST requests, uploads, or database mutations were performed.
- `git diff --check`: passed.

## Production architecture

- pawscue.com is served by Vercel behind Cloudflare.
- Supabase database records and Storage objects are hosted remotely and are not contained in this repository.
- The old Mac is not serving the production website.
- Vercel's configured Node.js major has not yet been verified.

## Immediate next steps

1. Review the current diff.
2. Decide whether to commit the Mapbox fix and these continuity documents together or separately.
3. Verify directly in GitHub Settings whether the classic personal access token named `animal-help-map` still exists and when it expires. An email reported that it would expire in seven days, but the notification and its timing have not been independently verified. Do not use links in the email for this check.
4. Configure fresh, narrowly scoped GitHub authentication on the new Mac and run `git push --dry-run origin HEAD`. Do not migrate or renew the stale Keychain credential merely to preserve it.
5. After fresh authentication succeeds, revoke the obsolete classic token if it is still active and no other workflow uses it.
6. Check the Vercel project's configured Node.js major before adding `.nvmrc` or `package.json` runtime fields.
7. Keep dependency upgrades in a separate branch/commit series.

The GitHub token issue affects Git pushes and possibly Git-triggered deployment administration; it does not affect the Vercel-hosted site that is already running.
