# Technical Service Intelligence Lite (TSI Lite)

An educational web application prototype for ATM fault-call analysis and technical service-history review, developed as part of a Claude Code coursework assignment.

## Project purpose

TSI Lite helps ATM monitoring personnel review active fault calls, access relevant device maintenance history and technician visit records, and examine basic factual summaries.

The application is a decision-support prototype, not a production maintenance management system or an AI diagnostic tool.

## Version V0.1 — Claude Code coursework

The first version will provide:

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
- `prisma/seed.ts` — idempotent persistence (`npm run db:seed`), see [Seeding the database](#seeding-the-database).

## Seeding the database

### What the seed changes

- Synthetic records are identified by IDs starting with `syn-` (and source system `TSI-SYNTH` for work orders). These are reserved for the synthetic dataset; imported data must not use them.
- The seed **creates or updates only `syn-` records**, matched by ID, so it can be rerun safely without creating duplicates.
- The seed **never deletes anything**. If a synthetic record is removed from the dataset in a later version, the seed lists it as obsolete and leaves it in place; remove it manually if required.
- Before writing, the seed checks whether any ATM number, `TSI-SYNTH` work-order ID or dictionary code it needs already belongs to a non-synthetic record. If so, it **aborts without changes** and lists the conflicts.
- All writes run in one transaction: either the whole dataset is written or nothing is.

### When it runs

Only when someone runs `npm run db:seed`. It is **not** part of `npm install`/`postinstall` (which only runs `prisma generate`), `npm run build`, `npm start`, or Prisma's own commands (no seed is registered in `prisma.config.ts`). Do **not** add it to Railway build, pre-deploy or start commands.

### `tsx` is a development dependency

The seed is TypeScript and runs through `tsx`, which is listed in `devDependencies`. It is therefore meant to be run from a development machine that has run a full `npm install`, not from the deployed Railway service, where development dependencies may be pruned.

### Running it against Railway PostgreSQL (once available)

1. In Railway, open the PostgreSQL service and copy its **public** connection URL (`DATABASE_PUBLIC_URL`). The internal URL only works inside Railway's private network.
2. Put it in your local, Git-ignored `.env.local` as `DATABASE_URL=…`. Never commit it or paste it into chat or tickets.
3. Apply the schema, then seed. (No migration files exist yet; the initial migration is created in the database stage before this step can run.)

   ```bash
   npm run db:migrate:deploy
   ```

   ```bash
   npm run db:seed
   ```

   The seed prints the target host and database name (no credentials) before writing — check it is the intended database.
4. Optionally run `npm run db:seed` a second time and confirm that the reported counts are unchanged (7 ATMs, 38 work orders, 37 technician visits, 12 codes).
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

**Current stage:** V0.1 Development Stage 5 — basic factual analysis.

**Completed:**

- Development environment, GitHub repository and project documentation (`CLAUDE.md`).
- Next.js (App Router), TypeScript and Tailwind CSS application shell in Estonian, with **Rikketeated** and **Seadmed** placeholder pages.
- Prisma schema for `Atm`, `WorkOrder`, `TechnicianVisit` and `CodeDictionary`, prepared for PostgreSQL.
- `.env.example` with required variable names; the production build runs without a database connection.
- Shared-password authentication with a signed, HTTP-only session cookie and **Logi välja** (Stage 2).
- Deterministic synthetic dataset with automated tests and an idempotent seed script (Stage 3). The seed has **not** yet been run against PostgreSQL.
- **Rikketeated** (active fault calls, search, detail with technician visits) and **Seadmed** (ATM search, work-order history, factual summary) views, served from a **temporary synthetic data adapter** (Stage 4).
- Basic factual analysis on the device page: fixed reference date, exact 30-day period, linked list of counted fault calls, latest registered work, and a synthetic-data / not-AI label (Stage 5).

**Pending:**

- Railway PostgreSQL setup, database connectivity and migrations (not yet run or tested).
- Running `npm run db:seed` against PostgreSQL.
- PostgreSQL (Prisma) implementation of the data repository, replacing the synthetic adapter.
- Railway deployment and testing.

## Data access

The views read data only through `getServiceRepository()` in `src/lib/dal.ts`, which verifies the session on the server first and returns a read-only `ServiceRepository` (`src/lib/data/repository.ts`). Factual rules (active fault calls, the 30-day period, latest work date, latest technician comment) live in `src/lib/domain/analysis.ts` and are shared by all implementations.

### Temporary synthetic data adapter

Until PostgreSQL is available, `src/lib/data/synthetic-repository.ts` serves the deterministic synthetic dataset from server memory.

- It is **temporary** and must be **replaced by the PostgreSQL adapter, or explicitly disabled, before the production Railway deployment**.
- It is selected with `DATA_SOURCE=synthetic`. In development it is the default; in production (`NODE_ENV=production`) `DATA_SOURCE` must be set explicitly, otherwise data pages fail closed with an error. The server logs a warning whenever the synthetic source is in use.
- It is server-only and read-only. No dataset records are included in client JavaScript bundles, and there is no API that exposes the dataset in bulk.

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
| `npm run db:migrate` | Create/apply migrations (development) | Yes |
| `npm run db:seed` | Load the synthetic dataset | Yes |

Configure local environment variables in `.env.local` (ignored by Git), using `.env.example` as the template:

- `APP_ACCESS_PASSWORD` — shared login password of your choice.
- `SESSION_SECRET` — random string of at least 32 characters, used to sign session cookies. Generate one with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

- `DATABASE_URL` — only needed once a database is available.
- `DATA_SOURCE` — optional in development (defaults to `synthetic`); must be set explicitly for `npm start` / production. See [Temporary synthetic data adapter](#temporary-synthetic-data-adapter).

Without `APP_ACCESS_PASSWORD` and `SESSION_SECRET` the login page shows a configuration error and all pages stay locked. Never commit `.env` files.

## Repository

https://github.com/blackregistryof/technical-service-intelligence-lite

## Important limitations

- Educational prototype using synthetic data only.
- No live Dynamics AX integration.
- No live AI diagnosis or automatic dispatching.
- No modification of operational work orders.
- Application functionality remains under development.

## Authentication: known limitations

Access uses one shared password (`APP_ACCESS_PASSWORD`) and a stateless session cookie signed with `SESSION_SECRET` (HMAC-SHA256, `HttpOnly`, `SameSite=Lax`, `Secure` with the `__Host-` prefix in production, 8-hour lifetime). There are no individual user accounts, so sessions cannot be attributed to a person. Changing `APP_ACCESS_PASSWORD` or `SESSION_SECRET` signs out every session.

### In-memory logout blocklist and login rate limiter

Without a database, both are kept in the memory of the running Node.js process (`src/lib/auth/session.ts`, `src/lib/auth/rate-limit.ts`):

- **Lost on restart or redeploy.** After a restart, a cookie that was logged out but copied beforehand becomes valid again until its 8-hour expiry, and failed-attempt counters reset to zero.
- **Not shared between instances.** If the Railway service is scaled to more than one replica, a logout on one instance is unknown to the others, and the attempt limit applies per instance (an attacker gets 5 attempts per window *per replica*).
- **Railway guidance until this is replaced:** run a **single replica**; rotate `SESSION_SECRET` to force-invalidate all sessions if a cookie may have leaked.
- **Planned fix:** once PostgreSQL is available, move the session blocklist (or server-side session records) and failed-attempt counters into the database.

The logout action always deletes the cookie in the browser; the limitations above concern only a cookie that was copied before logout.

### Trusting `X-Forwarded-For`

The rate limiter identifies clients by the first address in the `X-Forwarded-For` header (falling back to `X-Real-IP`). This header is **not verified**: any client can send its own value.

- A client can **bypass the attempt limit** by sending a different `X-Forwarded-For` value with each request. (Memory use is capped at 10,000 tracked addresses.)
- A client can **lock out another address** for 15 minutes by sending that address with 5 wrong passwords.
- If no header is present (e.g. direct local access), all clients share one counter, so 5 failures lock everyone out for 15 minutes.

Before relying on the limiter on Railway, verify how Railway's edge proxy sets these headers (whether it overwrites or appends to a client-supplied `X-Forwarded-For`) and derive the client address only from the entry added by the trusted proxy. The limiter slows down password guessing; it is not a substitute for a long, random `APP_ACCESS_PASSWORD`.