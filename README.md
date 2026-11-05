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

Performance regression: `npm run check:daily-performance` compares the original and optimized execution across every candidate score, gate and selection set, plus all four relation axes. The request-local adapter reuses immutable, verified relation indexes and avoids repeated pair-key sorting; it does not edit the private runtime, truncate candidates, change matching/score formulas or approximate the optimizer. The engine has a 45-second bound, its route a 60-second hosting budget, and its client request a 65-second budget. API failure logs contain only the public error code and elapsed time, never input, identities or database messages.

Daily picks persist one private batch (up to three canonical identities, no raw answers/vectors/fit scores) per profile in `match_daily_selections`. Reads validate the latest original taste evidence, question seed, engine/input policy versions, KST date and a constant-time catalog revision before reusing it. Catalog/detail writes conservatively bump that revision. Cached picks still pass current public eligibility/identity checks and get current avoidance warnings before projection. A conditional 90-second DB lease coalesces requests across instances; failures release it and expired workers cannot overwrite a newer claim. First requests await the existing bounded engine; concurrent requests receive owner-only `202 preparing` and poll. There is no fire-and-forget background job, automatic midnight bulk job, new ranking formula or cooldown. Bump `DAILY_SELECTION_VERSION` when changing the private engine/policy or relevant access rules.

Before deploying this storage change, run `node --env-file=.env.local scripts/check-daily-selection-storage.mjs --check` to test the schema/repository under the runtime role with all changes rolled back. Apply the additive migration explicitly with the same command and `--apply`. This creates only cache/revision tables, policies and catalog revision triggers; it does not rewrite existing recommendations, answers or catalog rows. Missing schema fails closed rather than silently restoring per-visit calculations.

After populating a current batch, `node --env-file=.env.local scripts/daily-recommendation/check-persisted-read.mjs` proves a fresh process can read it in a read-only transaction with engine calls and whole-catalog reads forbidden. `scripts/daily-recommendation/check-live.mjs` checks owner-only access, unchanged selection and first/repeat API timings; this live GET may populate the derived cache, but never edits original taste inputs or registered recommendations.

Deploy from a clean committed checkout with the private runtime installed, using the official Vercel CLI linked to the existing `sukhyangchoe/webtoon-recommend` project. `.vercelignore` excludes secrets/backups/QA but includes the verified runtime as server-only build input. Use a staged production deployment (`vercel deploy --prod --skip-domain`), verify it, then promote it to the production domain. Never use a temporary/unclaimed project or a different Vercel account. The hosting build refuses to deploy without the verified runtime, so a Git-only auto-build cannot replace production with a broken daily-picks API. Next output tracing includes the runtime only for the daily-picks server route; the public-client catalog-boundary check still runs after build. Preserve existing production environment variables and permissions; apply the reviewed cache migration before promoting this version.
