This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Match security rollout (2026-11-02)

The application must not use the catalog administrator account in production.

1. Apply the reviewed migrations with `node --env-file=.env.local scripts/apply-match-security-migrations.mjs --apply`. These add age-access functions, a bounded catalog validation lock, a runtime role, and rate-limit counters; they do not rewrite catalog records or comments.
2. Provision and verify a dedicated login with `node --env-file=.env.local scripts/provision-match-runtime.mjs --apply`. Its secret is written only to ignored `.env.local`. Existing logins are never silently rotated. Set `WEBTOON_MATCH_RUNTIME_DATABASE_URL` in the hosting environment securely, redeploy, smoke-test reads and saves, then remove the administrative `WEBTOON_MATCH_DATABASE_URL` from the app's hosting environment. Keep it only in a separate administrative/import environment. Until cutover, the old variable remains a compatibility fallback.
3. Set a separate random `WEBTOON_MATCH_RATE_LIMIT_SECRET` on every instance. Never use a `NEXT_PUBLIC_` prefix for credentials. IP quota keys are HMACs, expire automatically, and cannot be reset by changing anonymous IDs. Vercel proxy IP headers are trusted only when `VERCEL=1`; local development uses one shared bucket.
4. Require MFA for hosting, source control and database administrators; review members and access logs in those dashboards. These account settings are not changed by repository code. No protection makes a public service impossible to attack; public response fields can still be collected within allowed access.
5. Create an encrypted catalog-only backup with `node --env-file=.env.local scripts/backup-catalog.mjs --create`. On later runs also load `--env-file=.env.backup.local`. Archives live in ignored `.private-backups/`; the key lives in ignored `.env.backup.local`. Both are sensitive: store the key separately and place an encrypted copy in an access-controlled off-site location. A decrypt/checksum round trip is verified automatically; a separate isolated database restore drill is still required. This catalog-only snapshot does not replace managed backups for user data.

`npm run build` checks public chunks for raw catalog audit markers. `/find` legacy pages no longer import the original catalog into Client Components. Never upload catalog source files, environment files or backup keys to a public directory.

The checked-in `vercel.json` requests Seoul (`icn1`) execution to match the current database location. Verify actual execution region and cold/warm timings after deployment. Individual runtime statements are capped at 8 seconds (locks: 1 second); work detail has its own cancellable read deadline. Fit responses remain private, uncached, and based on the viewer's latest taste. Only public, age-filtered search responses have a short shared cache. Bump the access-policy version and invalidate caches when changing catalog access rules.

Age policy (revised 2026-11-02): only the representative edition's `metadata.isAdult=true` blocks search, registration, public recommendation lists and work detail. Missing/false flags are allowed. `sexualCore` and free-text age labels do not decide access; contradictory metadata is exported for review, not silently rewritten. String true values are trimmed and case-normalized as a compatibility safeguard. The policy version and browser search storage key change when the rule changes. Source records and independent comments are retained.

Verification: `npm run test:match`, `npx tsc --noEmit`, `npm run build`; browser checks are under `tests/browser/feedback-improvements.smoke.cjs` and `tests/browser/work-detail-loading.smoke.cjs`.

## Personalized daily picks and deployment

Daily picks now use the verified 02 engine and latest original test snapshot plus current registered recommendations. The existing nine-genre projection is a soft preference, not a hard genre quota. Existing work-fit/square-root display is unchanged. Avoidance-free eligible alternatives are preferred; remaining matches show strong personal warnings. Refresh is at KST midnight and immediately on changed taste input, with no repeat-exposure cooldown and no fixed preview fallback.

The GitHub repository is public. Never commit `.private-daily-recommendations/`, original handoff archives, saved user histories, credentials or backups. Install the supplied verified 02 runtime locally with `node scripts/daily-recommendation/install-runtime.mjs --archive /absolute/path/to/02.zip` and run `npm run check:daily-runtime` and `npm run check:daily-avoidance`.

Deploy from a clean committed checkout with the private runtime installed, using the official Vercel CLI linked to the existing `sukhyangchoe/webtoon-recommend` project. `.vercelignore` excludes secrets/backups/QA but includes the verified runtime as server-only build input. Use a staged production deployment (`vercel deploy --prod --skip-domain`), verify it, then promote it to the production domain. Never use a temporary/unclaimed project or a different Vercel account. The hosting build refuses to deploy without the verified runtime, so a Git-only auto-build cannot replace production with a broken daily-picks API. Next output tracing includes the runtime only for the daily-picks server route; the public-client catalog-boundary check still runs after build. Preserve existing production environment variables and database permissions; deployment needs no data migration or user-data writes.
