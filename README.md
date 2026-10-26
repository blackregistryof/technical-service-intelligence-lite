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

V0.1 will use a small, deterministic synthetic dataset representing approximately 5–8 ATMs, 30–50 registered work orders and associated technician visits.

No real customer, employee or confidential company data will be included.

## Future development — V0.2

The planned usability-test version will extend the prototype with:

- A larger synthetic ATM history dataset.
- Two controlled test scenarios.
- Configurable analysis periods and transparent period suggestions.
- Traceable source references and structured illustrative interpretations.
- An editable technician-instruction draft.

V0.2 will support a formative usability study, not an evaluation of diagnostic accuracy or proven operational savings.

## Project status

**Current stage:** V0.1 Development Stage 1 — application foundation.

**Completed:**

- Development environment, GitHub repository and project documentation (`CLAUDE.md`).
- Next.js (App Router), TypeScript and Tailwind CSS application shell in Estonian, with **Rikketeated** and **Seadmed** placeholder pages.
- Prisma schema for `Atm`, `WorkOrder`, `TechnicianVisit` and `CodeDictionary`, prepared for PostgreSQL.
- `.env.example` with required variable names; the production build runs without a database connection.
- Shared-password authentication with a signed, HTTP-only session cookie and **Logi välja** (Stage 2).

**Pending:**

- Railway PostgreSQL setup, database connectivity and migrations (not yet run or tested).
- Synthetic demo data seed.
- Fault-call, device-history and basic analysis views.
- Railway deployment and testing.

## Local development

Requires Node.js 20.19 or later. On Windows PowerShell, use `npm.cmd` if `npm` is blocked by the execution policy.

```bash
npm install
npm run dev
```

Configure local environment variables in `.env.local` (ignored by Git), using `.env.example` as the template:

- `APP_ACCESS_PASSWORD` — shared login password of your choice.
- `SESSION_SECRET` — random string of at least 32 characters, used to sign session cookies. Generate one with:

  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
  ```

- `DATABASE_URL` — only needed once a database is available.

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