# Technical Service Intelligence Lite (TSI Lite)

An educational web application prototype for ATM fault-call analysis and technical service-history review, developed as part of a Claude Code coursework assignment.

## Project purpose

TSI Lite helps ATM monitoring personnel review active fault calls, access relevant device maintenance history and technician visit records, and examine basic factual summaries.

The application is a decision-support prototype, not a production maintenance management system or an AI diagnostic tool.

## Version V0.1 — Claude Code coursework

V0.1 is deployed on Railway: https://technical-service-intelligence-lite-production.up.railway.app (shared-password login). See [Deployment and verification status](#deployment-and-verification-status) for what has and has not been verified.

The first version provides:

- Shared-password access.
- A list of active (`Open` and `Hold`) ATM fault calls.
- Fault-call search and detailed views.
- ATM search and chronological service history.
- Technician visit records, including comments for `Hold` work orders.
- Basic factual analysis using a fixed demonstration reference date.
- Responsive user interface in Estonian.

## Technology

- Next.js (App Router) and TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL hosted on Railway
- GitHub for version control and deployment

## Demonstration data

V0.1 uses a small, deterministic synthetic dataset (fixed reference date **2026-10-25**, all timestamps UTC):

| Records | Count |
|---|---|
| ATMs (`ATM-0101` … `ATM-0107`) | 7 |
| Work orders | 38 — 26 fault calls (5 `OPEN`, 4 `HOLD`, 17 `CLOSED`) and 12 maintenance orders |
| Technician visits | 37 |
| Code dictionary entries | 12 (7 fault codes, 5 resolution codes) |

It includes `HOLD` fault calls with technician comments (and one whose visit has no comment), closed historical fault calls, maintenance orders (including one still open), fault calls with two and three technician visits, and a device with limited fault history.

All identifiers, models, codes, descriptions and comments are fictional. No real customer, employee or company data is included.

- `prisma/synthetic/dataset.ts` — pure data definition and validation; no database, clock or randomness.
- `prisma/synthetic/dataset.test.ts` — automated dataset tests (`npm test`).
- `prisma/seeding.ts` — seeding rules (opt-in, plan, conflict check, transactional upserts); creates no database client.
- `prisma/seeding.test.ts` — offline seeding tests against an in-memory fake (`npm test`).
- `prisma/seed.ts` — command-line entry point (`npm run db:seed`), see [Seeding the database](#seeding-the-database).

## Seeding the database

### What the seed changes

- Synthetic records are identified by IDs starting with `syn-` (and source system `TSI-SYNTH` for work orders). These are reserved for the synthetic dataset; imported data must not use them.
- The seed **creates or updates only `syn-` records**, matched by ID (upsert), so it can be rerun without creating duplicates.
- A rerun **overwrites** each existing `syn-` record's dataset fields with the dataset values: every field except `id`, `createdAt` and `updatedAt`. Manual edits to synthetic records are therefore reverted. The seed never supplies `createdAt` (set by the database default on insert) or `updatedAt`. `updatedAt` is an `@updatedAt` field, which Prisma Client sets itself on insert and update, so it changes on every rerun even when no values differ. This was observed on Railway PostgreSQL on 2026-11-04: after a rerun, `updatedAt` had changed on every row and `createdAt` on none.
- The seed **never deletes anything**. If a synthetic record is removed from the dataset in a later version, the seed lists it as obsolete and leaves it in place; remove it manually if required.
- Before writing, the seed checks whether any ATM number, `TSI-SYNTH` work-order ID or dictionary code it needs already belongs to a non-synthetic record. If so, it **aborts without changes** and lists the conflicts.
- All reads and writes run in one interactive transaction, parents before children (codes, ATMs, work orders, technician visits): either the whole dataset is written or nothing is.

### When it runs

Writing requires an explicit opt-in:

| Command | Effect |
|---|---|
| `npm run db:seed` | Prints the plan (counts, "delete nothing") and exits. **No database connection.** |
| `npm run db:seed -- --apply` | Prints the target host/database (no credentials) and writes to `DATABASE_URL`. |

- Unknown arguments are rejected.
- The seed refuses to run when the `npm_lifecycle_event` variable names an npm script other than `db:seed`, for example when another script calls `tsx prisma/seed.ts` directly. This is **accidental-execution protection, not a security boundary**:
  - a nested `npm run db:seed -- --apply` inside another script passes, because npm sets the variable to `db:seed` for it;
  - running `tsx prisma/seed.ts --apply` outside npm (variable absent) passes;
  - anyone can set the variable themselves;
  - code that imports `seedDatabase` from `prisma/seeding.ts` bypasses the opt-in entirely.
- It is **not** part of `npm install`/`postinstall` (which only runs `prisma generate`), `npm run build`, `npm start`, or Prisma's own commands: no seed is registered in `prisma.config.ts`, and the migrations contain no data. A test checks this for the repository: it fails if any `package.json` script other than `db:seed` mentions the seed. Commands configured outside the repository, such as Railway build, pre-deploy or start commands in the dashboard, are **not** checked.
- Do **not** add it to Railway build, pre-deploy or start commands.

### What is tested offline, and what is not

`npm test` runs `prisma/seeding.test.ts` against an in-memory fake of the four tables. No database client is created and no connection is made. The fake enforces foreign keys and unique keys, rejects any method other than `findMany`, `count` and `upsert`, and simulates a rollback. The tests verify:

- the opt-in;
- the plan and its dataset checks;
- that every read and write happens inside one transaction, in parent-to-child order;
- that a second run creates no duplicates and keeps the counts stable, in the fake (the fake has no `updatedAt` handling);
- that unrelated records are untouched and nothing is deleted;
- the abort on natural-key conflicts with zero writes;
- that a failure mid-seed propagates out of the transaction (the fake then restores its own snapshot; this does not prove that PostgreSQL rolls back);
- that obsolete synthetic records are reported but kept;
- that the target description contains no credentials.

**Checked against Railway PostgreSQL** (historical result, 2026-11-04; see [Deployment and verification status](#deployment-and-verification-status)):

- The seed completed against the migrated database, and again on reruns. This exercised the conflict-check and obsolete-record queries (both found nothing), the upserts by ID, and the parallel queries inside the interactive transaction.
- After the reruns: 7 ATMs, 38 work orders, 37 technician visits and 12 codes, all synthetic. There were no duplicate natural keys, the record IDs were unchanged, `createdAt` was kept and `updatedAt` changed.
- The stored records, including the `TIMESTAMPTZ(3)` timestamps, are read back identically by the PostgreSQL repository (see [PostgreSQL adapter](#postgresql-adapter)).

**Not verified against real PostgreSQL:**

- the abort when a natural key belongs to a non-synthetic record (no such records existed);
- the rollback after a failed write;
- whether the 60-second transaction timeout leaves enough margin on a slower connection.

### `tsx` is a development dependency

The seed is TypeScript and runs through `tsx`, which is listed in `devDependencies`. It is therefore meant to be run from a development machine that has run a full `npm install`, not from the deployed Railway service, where development dependencies may be pruned.

### Running it against Railway PostgreSQL

The synthetic dataset has already been loaded into the Railway database (2026-11-04). Rerunning the seed is safe but not needed; it reverts manual edits to synthetic records.

1. In Railway, open the PostgreSQL service and copy its **public** connection URL (`DATABASE_PUBLIC_URL`). The internal URL only works inside Railway's private network.
2. Put it in your local, Git-ignored `.env.local` as `DATABASE_URL=…`. Never commit it or paste it into chat or tickets.
3. Apply the migrations (`prisma/migrations`), check the plan, then seed:

   ```bash
   npm run db:migrate:deploy
   ```

   ```bash
   npm run db:seed
   ```

   ```bash
   npm run db:seed -- --apply
   ```

   With `--apply`, the seed prints the target host and database name (no credentials) before writing. Check it is the intended database.
4. Optionally run `npm run db:seed -- --apply` a second time and confirm that the reported counts are unchanged (7 ATMs, 38 work orders, 37 technician visits, 12 codes).
5. Remove or comment out `DATABASE_URL` in `.env.local` afterwards if you do not want local commands to target Railway.

Alternatively, the Railway CLI (`railway run`) can inject service variables for a single command without storing them in a file. Note that a service's `DATABASE_URL` usually points to the private network address, which is not reachable from a local machine; use the public URL for local seeding.

## Future development — V0.2

The planned usability-test version will extend the prototype with:

- A larger synthetic ATM history dataset.
- Two controlled test scenarios.
- Configurable analysis periods and transparent period suggestions.
- Traceable source references and structured illustrative interpretations.
- An editable technician-instruction draft.

V0.2 will support a formative usability study, not an evaluation of diagnostic accuracy or proven operational savings.

## Project status

**Current stage:** V0.1 complete and deployed on Railway, reading the synthetic dataset from Railway PostgreSQL. V0.2 has not been started.

**Completed:**

- Development environment, GitHub repository and project documentation (`CLAUDE.md`).
- Next.js (App Router), TypeScript and Tailwind CSS application shell in Estonian (Stage 1).
- Prisma schema for `Atm`, `WorkOrder`, `TechnicianVisit` and `CodeDictionary`.
- `.env.example` with required variable names; the production build runs without a database connection.
- Shared-password authentication with a signed, HTTP-only session cookie and **Logi välja** (Stage 2).
- Deterministic synthetic dataset with automated tests and an idempotent seed script (Stage 3).
- **Rikketeated** (active fault calls, search, detail with technician visits) and **Seadmed** (ATM search, work-order history, factual summary) views (Stage 4).
- Basic factual analysis on the device page: fixed reference date, exact 30-day period, linked list of counted fault calls, latest registered work, and a synthetic-data / not-AI label (Stage 5).
- Production data-source guard (synthetic data is never served by a production build; `postgres` is the only accepted production value), a startup data-source log line and production-only HSTS (Stage 6B).
- `TIMESTAMPTZ(3)` timestamp columns and the initial migration in `prisma/migrations`, generated offline (Stage 6C), now applied to Railway PostgreSQL.
- Opt-in synthetic seeding: `npm run db:seed` only plans; `--apply` writes in one transaction (Stage 6D). The dataset is loaded into Railway PostgreSQL.
- PostgreSQL (Prisma) repository adapter selected with `DATA_SOURCE=postgres` (Stage 6E). See [PostgreSQL adapter](#postgresql-adapter).
- Railway deployment of the application at https://technical-service-intelligence-lite-production.up.railway.app.
- Footer "TSI Lite V0.1 · Sünteetilised andmed · Built with Claude Code" on the authenticated pages, added through pull request #1 (`feature/homework-footer`, merged into `main` on 2026-11-04).

**Open points (not blocking V0.1):**

- Mobile views show too much information and need further refinement (user feedback).
- No formal usability testing has been carried out; that is the purpose of V0.2.
- Not verified on Railway: how the proxy sets `X-Forwarded-For` (see [Authentication: known limitations](#authentication-known-limitations)).
- The logout blocklist and login rate limiter are still kept in server memory (single replica only).

## Deployment and verification status

**Deployment:** https://technical-service-intelligence-lite-production.up.railway.app

- Railway project with a PostgreSQL service and the application service, set up to deploy from the GitHub `main` branch (project setup; the Railway trigger settings were not inspected here).
- **Railway commands (user-provided screenshot):** pre-deploy command `npm run db:migrate:deploy`, start command `npm start`.
- The application runs with `DATA_SOURCE=postgres`.
- Access requires the shared password; no passwords, connection strings or other secrets are recorded in this repository.

The results below are **historical**: they were reported when the work was done and are not rerun automatically.

### Technical checks (historical)

The database checks ran from a development machine against the Railway PostgreSQL database through its public URL on 2026-11-04, **not** through the deployed application:

- **Migration:** `prisma migrate status` reported the initial migration (`20261104085337_init`) applied and the schema up to date. This confirms that the migration was applied, but not which execution first applied it. The Railway pre-deploy command above is the likely route, but that was not independently established.
- **Seeding:** `npm run db:seed` printed the plan, then `npm run db:seed -- --apply` stored 7 ATMs, 38 work orders, 37 technician visits and 12 codes.
- **Repeat runs:** the seed was applied three times in total. Afterwards:
  - the counts were unchanged and every record was synthetic;
  - there were no duplicate ATM numbers, work-order keys or codes;
  - the record IDs were identical before and after the last rerun;
  - `createdAt` was unchanged, and `updatedAt` had changed on every row.
- **PostgreSQL repository compared with the synthetic adapter:** results were identical for:
  - the active fault-call list (9 calls, newest first) and ATM search, across 12 search inputs including literal `%`, `_` and `\` (these matched nothing, so they did not act as wildcards);
  - all 38 work-order detail records;
  - all 7 device histories and their factual summaries, including lowercase and space-padded ATM numbers.

  Unknown IDs and wildcard ATM numbers (`%`, `ATM-010_`) returned "not found".

Before deployment (Stage 6E), with database access disabled, all of these passed:

- unit tests (284), lint, typecheck and the production build;
- `npm run test:production` (112 checks across 7 production configurations).

On the public application (2026-11-05, after the merge of pull request #2), a request to `/login` over HTTPS returned status 200 with the new footer and the header `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

### User-reported observations

- The public application shows the footer from pull request #1.
- On an iPhone, filters, navigation, links, login and logout worked.
- Mobile views contain too much information and need further refinement.

### Not established

- Formal usability testing has not been carried out.
- No business benefit (for example time savings or better decisions) has been measured or proven.
- No load, performance or security testing of the deployed application has been done.

## Data access

The views read data only through `getServiceRepository()` in `src/lib/dal.ts`, which verifies the session on the server first and returns a read-only `ServiceRepository` (`src/lib/data/repository.ts`). Factual rules (active fault calls, the 30-day period, latest work date, latest technician comment) live in `src/lib/domain/analysis.ts` and are shared by all implementations.

### Temporary synthetic data adapter

`src/lib/data/synthetic-repository.ts` serves the deterministic synthetic dataset from server memory.

- It is **temporary** and is available in development and tests only. It is **never served by a production build**.
- It is server-only and read-only. No dataset records are included in client JavaScript bundles, and there is no API that exposes the dataset in bulk.

### PostgreSQL adapter

`src/lib/data/postgres-repository.ts` implements the same `ServiceRepository` contract with Prisma. It is selected with `DATA_SOURCE=postgres` and reads `DATABASE_URL`.

- **Read-only and server-only.** The Prisma client (`src/lib/prisma.ts`) is injected by the server-only entry point `src/lib/data/index.ts`. It is created on the first data request, never on import or during the build, and the startup log does not contact the database.
- **Work in the database.** Filtering, ordering and counting run in PostgreSQL, and only the rows a page needs are loaded:
  - active fault calls are filtered by type and status;
  - ATM counts use grouped counts;
  - a device history loads one ATM's work orders;
  - code descriptions are loaded only for the codes on those records.
- **Same semantics as the synthetic adapter.**
  - Search is case-insensitive and trimmed, and limited to 50 characters.
  - Order is newest registration first; visits are oldest first; ATMs follow `atmNumber` order. Equal timestamps are ordered by ID.
  - Unknown records return `null`.
  - The 30-day count and the latest-work and latest-comment rules reuse the same domain functions.
- **Literal search text.** Prisma compiles `contains` and case-insensitive `equals` to `ILIKE` without escaping, so the adapter escapes `\`, `%` and `_`. Searching for `%` therefore matches a literal `%`, and `/seadmed/%` cannot resolve to an arbitrary ATM.
- **No fallback.**
  - A missing `DATABASE_URL` fails as a `DataSourceConfigError`.
  - A failed query fails as a `DataSourceUnavailableError`, with any connection string or `password=` parameter redacted from the message.
  - Either way the page shows the error view. Synthetic data is never served instead.

Offline tests (`src/lib/data/postgres-repository.test.ts`, run by `npm test`) cover three layers. None contacts a database:

1. **Compiled SQL:** the real Prisma client and query compiler with a recording driver adapter that captures each SQL statement and returns no rows. This pins the filters, ordering, LIKE escaping and read-only statements.
2. **Parity:** an in-memory fake of the Prisma calls, backed by the synthetic dataset and using PostgreSQL `ILIKE` semantics. The adapter's results are compared deep-equal with the synthetic adapter's for every work order, every ATM and a set of search inputs, including `%`, `_` and `\`.
3. **Failures:** errors are redacted, and nothing falls back to other data.

**Checked against Railway PostgreSQL** (historical result, 2026-11-04): with the synthetic dataset loaded, every repository method returned results identical to the synthetic adapter. This included the grouped ATM counts, the 30-day summaries for all 7 ATMs, and literal `%`, `_` and `\` searches. See [Deployment and verification status](#deployment-and-verification-status).

**Not verified against real PostgreSQL:**

- `ILIKE` and collation behaviour for non-ASCII text (the synthetic identifiers are ASCII);
- analysis-period boundary cases beyond those in the synthetic dataset;
- connection pooling under load;
- error messages from real connection and authentication failures;
- performance with larger data.

### Data source selection (`DATA_SOURCE`)

| `DATA_SOURCE` | Development / test (`npm run dev`, `npm test`) | Production (`npm start`, Railway) |
|---|---|---|
| unset or empty | synthetic | rejected |
| `synthetic` | synthetic | **rejected** |
| `postgres` | PostgreSQL adapter (needs `DATABASE_URL`) | PostgreSQL adapter (needs `DATABASE_URL`) |
| any other value | rejected | rejected |

- `postgres` is the only value accepted in production. There is deliberately **no override** that allows the synthetic data in production.
- "Rejected" and "fails closed" mean that every data page shows the Estonian error view and no records. Login, logout and access control keep working. The server log shows the reason as a `DataSourceConfigError`. The browser only sees a generic error with a digest, and the configured value is never echoed in error messages.
- With `postgres`, a missing `DATABASE_URL` or an unreachable database also fails closed; the synthetic data is never used as a fallback.
- At startup the server logs one line (`src/instrumentation.ts`) naming:
  - the selected source type, e.g. `[data] Data source: synthetic (TEMPORARY …)`;
  - for `postgres`, whether `DATABASE_URL` is set;
  - or the configuration error.

  It does not contact the database, and it never logs connection strings, passwords or other environment values.
- Consequence: a local production build (`npm run build && npm start`) shows data only with `DATA_SOURCE=postgres` and a reachable, migrated database. Use `npm run dev` to view the synthetic data.

### HTTPS security header

Production builds send `Strict-Transport-Security: max-age=31536000; includeSubDomains`, but only on responses to requests that arrived over HTTPS. In practice that means requests with `X-Forwarded-Proto: https`, which Railway's TLS-terminating edge sets. Plain-HTTP requests (localhost `npm start`) and `npm run dev` never get the header. Behind Railway's proxy the header was observed on the public `/login` page on 2026-11-05 (historical check; see [Deployment and verification status](#deployment-and-verification-status)).

### Analysis rules

All rules are implemented as pure functions in `src/lib/domain/analysis.ts` and are independent of the data source.

- Reference date: **25.10.2026** (fixed; the current clock is never used). It is shown in the header of every protected page and in the device summary.
- Analysis period: the 30 calendar days ending on, and including, the reference date in Estonian time: **26.09.2026 00:00 – 25.10.2026 23:59:59.999** (Europe/Tallinn). The period is derived from the reference date (`periodEndingOn`), including the daylight-saving change on 25.10.2026 (that day has 25 hours). Timestamps are stored in UTC and displayed in Estonian time.
- Counted: `FAULT_CALL` work orders registered within the period, regardless of status (`OPEN`, `HOLD` or `CLOSED`). Not counted: maintenance orders and technician visits; a fault call with several visits counts once, and work orders are de-duplicated by ID.
- The counted fault calls are listed with links to their existing detail pages, so every number can be traced to its records.
- Latest registered work: the most recent work order of any type (fault call or maintenance) registered up to the end of the reference date, shown with date, time, type, status and a link to the record (fault-call page, or the history entry for maintenance).
- Zero and missing cases are stated in words (“Analüüsiperioodil ei registreeritud … ühtegi rikketeadet”, “… ei ole registreeritud ühtegi tööd”).
- The summary is labelled as synthetic demonstration data and a rule-based count, not an AI diagnosis or root-cause assessment.
- For `HOLD` calls, only the comment of the most recent technician visit is shown. If it is missing, the page says so; older comments are not substituted.

### Known UI limitation

Unknown fault-call or ATM URLs show the Estonian “not found” view, but the HTTP status is 200 (with a `noindex` robots tag) rather than 404, and the view is rendered by the browser's JavaScript.

Reason: with Cache Components enabled, protected pages send a prerendered shell (layout, navigation, loading state) before the page's data is read, and the status code cannot change once the response has started. Moving the loading state and marking the detail routes as blocking (`export const instant = false`) was tested and did not change the status, because the shell is still sent first. The only documented alternative, an existence check in `proxy.ts`, would move data access out of the authenticated data-access layer and add a lookup to every request, so it was not adopted for V0.1. This affects only the HTTP status; access control and the visible not-found message are unaffected.

## Local development

Requires Node.js 22 or later. On Windows PowerShell, use `npm.cmd` if `npm` is blocked by the execution policy.

```bash
npm install
npm run dev
```

Other commands:

| Command | Purpose | Needs database |
|---|---|---|
| `npm test` | Dataset, analysis-rule, formatting and repository tests | No |
| `npm run typecheck` / `npm run lint` | Static checks | No |
| `npm run build` | Production build | No |
| `npm run test:production` | After `npm run build`: production data-source policy, fail-closed pages and HSTS against `next start` (no network or database access) | No |
| `npm run db:migrate` | Create/apply migrations (development) | Yes |
| `npm run db:seed` | Print the synthetic seed plan (no connection) | No |
| `npm run db:seed -- --apply` | Load the synthetic dataset | Yes |

Configure local environment variables in `.env.local` (ignored by Git), using `.env.example` as the template:

- `APP_ACCESS_PASSWORD` — shared login password of your choice.
- `SESSION_SECRET` — random string of at least 32 characters, used to sign session cookies. Generate one with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

- `DATABASE_URL` — needed for `DATA_SOURCE=postgres`, migrations and `npm run db:seed -- --apply`; not needed for the synthetic data in `npm run dev`. If it points at Railway, local database commands change the deployed data.
- `DATA_SOURCE` — optional in development (defaults to `synthetic`); production accepts only `postgres`. See [Data source selection](#data-source-selection-data_source).

Without `APP_ACCESS_PASSWORD` and `SESSION_SECRET` the login page shows a configuration error and all pages stay locked. Never commit `.env` files.

## Repository

https://github.com/blackregistryof/technical-service-intelligence-lite

## Important limitations

- Educational prototype using **synthetic data only**; no real customer, employee or company data.
- **Read-only records:** work orders and technician visits cannot be created, edited or closed in the application.
- **Shared-password access:** one password for everyone, no individual user accounts (see below).
- Mobile views show too much information and need further refinement (user feedback).
- No formal usability testing and no proven business benefit.
- No live Dynamics AX integration.
- No live AI diagnosis or automatic dispatching.

## Authentication: known limitations

Access uses one shared password (`APP_ACCESS_PASSWORD`) and a stateless session cookie signed with `SESSION_SECRET` (HMAC-SHA256, `HttpOnly`, `SameSite=Lax`, `Secure` with the `__Host-` prefix in production, 8-hour lifetime). There are no individual user accounts, so sessions cannot be attributed to a person. Changing `APP_ACCESS_PASSWORD` or `SESSION_SECRET` signs out every session.

### In-memory logout blocklist and login rate limiter

Both are kept in the memory of the running Node.js process (`src/lib/auth/session.ts`, `src/lib/auth/rate-limit.ts`), also in the deployed application:

- **Lost on restart or redeploy.** After a restart, a cookie that was logged out but copied beforehand becomes valid again until its 8-hour expiry, and failed-attempt counters reset to zero.
- **Not shared between instances.** If the Railway service is scaled to more than one replica, a logout on one instance is unknown to the others, and the attempt limit applies per instance (an attacker gets 5 attempts per window *per replica*).
- **Railway guidance until this is replaced:** run a **single replica**; rotate `SESSION_SECRET` to force-invalidate all sessions if a cookie may have leaked.
- **Possible fix (not part of V0.1):** move the session blocklist (or server-side session records) and failed-attempt counters into PostgreSQL, which is now available.

The logout action always deletes the cookie in the browser; the limitations above concern only a cookie that was copied before logout.

### Trusting `X-Forwarded-For`

The rate limiter identifies clients by the first address in the `X-Forwarded-For` header (falling back to `X-Real-IP`). This header is **not verified**: any client can send its own value.

- A client can **bypass the attempt limit** by sending a different `X-Forwarded-For` value with each request. (Memory use is capped at 10,000 tracked addresses.)
- A client can **lock out another address** for 15 minutes by sending that address with 5 wrong passwords.
- If no header is present (e.g. direct local access), all clients share one counter, so 5 failures lock everyone out for 15 minutes.

Before relying on the limiter on Railway, verify how Railway's edge proxy sets these headers (whether it overwrites or appends to a client-supplied `X-Forwarded-For`) and derive the client address only from the entry added by the trusted proxy. The limiter slows down password guessing; it is not a substitute for a long, random `APP_ACCESS_PASSWORD`.