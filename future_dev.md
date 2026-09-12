# Future Development and Open Problems

Last updated: 2026-09-12

This file records problems encountered during the Mac migration and the planned way to resolve them. Keep security upgrades separate from the migration/Mapbox commit.

## 1. GitHub authentication is missing

### Problem

- The repository uses an HTTPS GitHub remote.
- `git push --dry-run` fails on the new Mac because no valid username/token is available.
- The old Mac's osxkeychain credential is also invalid, so it should not be migrated.
- GitHub CLI is not installed on either machine.
- An email reported that a classic personal access token named `animal-help-map`, with broad `repo` scope, would expire in seven days. This is relevant evidence but does not establish that the token is the credential currently stored in Keychain; verify it directly in GitHub rather than through an email link.
- Token expiry affects authenticated Git operations and potentially Git-triggered deployment administration. It does not affect the Vercel-hosted production process already serving pawscue.com.

### Plan

1. Sign in to GitHub directly and inspect Settings > Developer settings > Personal access tokens. Confirm whether the classic token named `animal-help-map` exists, its actual expiration, recent use, and whether any other workflow depends on it. Do not follow links from the notification email.
2. Configure fresh authentication on the new Mac using one supported method:
   - install and authenticate GitHub CLI;
   - configure a fine-grained personal access token through the macOS credential helper; or
   - switch the remote to SSH after creating/registering a new SSH key.
3. Prefer least privilege: for a fine-grained token, grant access only to the required repository and repository permissions instead of re-creating a broad classic `repo` token.
4. Never paste a token into Codex/chat, source code, `.env.local`, or a shell command that would retain it in history. Supply credentials only through the chosen authentication tool's protected prompt or Keychain integration.
5. Verify access without changing the remote using `git push --dry-run origin HEAD`.
6. After the dry run succeeds, revoke the obsolete classic token if it still exists and no other workflow uses it; do not renew it indefinitely by default.
7. Only retire the old Mac after the new authentication and account recovery methods are confirmed.

## 2. Mapbox environment-variable mismatch

### Problem

- The valid transferred variable is `MAPBOX_ACCESS_TOKEN`.
- `MAPBOX_API_KEY` does not exist.
- The API report POST route previously used the absent name and silently skipped reverse geocoding.
- The main server action and admin geocoding already used `MAPBOX_ACCESS_TOKEN`.

### Plan and current status

- Standardize on the single name `MAPBOX_ACCESS_TOKEN`; do not add a duplicate variable.
- The API route and README have been corrected locally and validated.
- Review and commit these changes before deployment.
- After deployment, test reverse geocoding with explicitly approved test data in a non-production environment. Do not create a production report solely for testing.

## 3. Node.js runtime is not pinned

### Problem

- The new Mac builds with Node 22/npm 10.
- The old Mac builds with Node 24/npm 11.
- The repository has no `.nvmrc`, `.node-version`, `engines`, or `packageManager` declaration.
- Vercel's configured Node.js major is not yet known.

### Plan

1. Open the Vercel project settings and record the configured Node.js major without changing it.
2. Choose one supported runtime for local development, CI, and Vercel.
3. Recommended target: Node 24/npm 11 if Vercel supports and is already configured for it, because it has the longer support horizon and the old Mac build already passed with it.
4. Install/test that runtime on the new Mac.
5. After approval, add an `.nvmrc` (or equivalent), `package.json` `engines`, and optionally an exact `packageManager` npm version.
6. Re-run clean install, lint, types, build, and smoke tests before committing runtime configuration.

## 4. Production dependency vulnerabilities

### Problem

- Current audit totals: 1 moderate, 11 high, and 1 critical.
- Production audit totals: 3 high and 1 critical.
- Vulnerable production paths include Next.js and its PostCSS/nanoid dependencies, plus Supabase Realtime's `ws` dependency.
- npm's suggested Next.js fix is 16.3.5, a major upgrade that may require application and lint configuration changes.

### Staged upgrade plan

1. Create a dedicated security-upgrade branch after the migration changes are committed.
2. Record baseline behavior and audit output.
3. Confirm the chosen Node runtime supports the target Next.js release.
4. Upgrade Next.js and the compatible React/ESLint stack together; review official migration notes and required codemods.
5. Upgrade Supabase to a version that brings in a patched `ws`. Avoid a package override unless compatibility is established.
6. Regenerate `package-lock.json` through a normal reviewed install. Do not use `npm audit fix` or `npm audit fix --force`.
7. Run lint, strict TypeScript checks, production build, and local smoke tests.
8. Re-run both full and production-only audits and document residual findings.
9. Deploy to a Vercel preview and test App Router pages, Server Actions, image optimization, admin authentication, Mapbox, and Supabase integrations.
10. Promote to production only after review and an agreed rollback plan.

## 5. External-service ownership and backups are not fully verified

### Problem

The repository does not prove ownership, recovery access, or backups for Supabase, Vercel, Cloudflare, the domain registrar, Mapbox, Google Analytics, GitHub, email, and MFA systems. Supabase database and Storage data are external to Git.

### Plan before retiring the old Mac

- Verify at least two appropriate administrators/recovery paths for each critical account.
- Securely preserve MFA recovery codes, passkeys, authenticator entries, recovery email/phone access, and billing access.
- Confirm Supabase database backups and export Storage objects; include Auth/configuration, RLS policies, functions, triggers, and project secrets in the recovery plan.
- Export or document Cloudflare DNS and verify registrar ownership, renewal, DNSSEC, and transfer settings.
- Verify Vercel project/team ownership, Git integration, environment variables for every environment, domains, billing, and deployment history.
- Verify Mapbox token restrictions/quotas and GA4 property/data-stream administrator access.
- Preserve local-only SSH/GPG keys, shell/Git configuration, CLI sessions, scheduled jobs, scripts, and secure backups of `.env.local` outside Git.

## 6. Existing lint warnings

### Problem

Five `@next/next/no-img-element` warnings remain in admin and map views. They do not currently fail the build.

### Plan

- Review each image separately; some dynamically sourced or map-popup images may intentionally use native `<img>`.
- Convert suitable cases to `next/image` and document/locally disable the rule only where native images are technically necessary.
- Validate layout, remote image host rules, performance, and provider image-optimization costs before deployment.
