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

**Pending:**

- Railway PostgreSQL setup, database connectivity and migrations (not yet run or tested).
- Synthetic demo data seed.
- Shared-password authentication.
- Fault-call, device-history and basic analysis views.
- Railway deployment and testing.

## Local development

Requires Node.js 20.19 or later. On Windows PowerShell, use `npm.cmd` if `npm` is blocked by the execution policy.

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in values when a database is available. Never commit `.env` files.

## Repository

https://github.com/blackregistryof/technical-service-intelligence-lite

## Important limitations

- Educational prototype using synthetic data only.
- No live Dynamics AX integration.
- No live AI diagnosis or automatic dispatching.
- No modification of operational work orders.
- Application functionality remains under development.