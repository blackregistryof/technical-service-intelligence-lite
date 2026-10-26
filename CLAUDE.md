# CLAUDE.md — Technical Service Intelligence Lite

## Project overview

Technical Service Intelligence Lite (TSI Lite) is an educational web application prototype for reviewing ATM fault calls and technical service history.

The current implementation target is **V0.1 — Claude Code coursework**.

A later **V0.2 — usability study version** will extend the same project. Do not implement V0.2 features unless explicitly instructed.

The user-facing application must be **in Estonian**. Source-code identifiers and developer documentation may be in English.

## Technology

- Next.js with App Router and TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL hosted on Railway
- GitHub repository: `blackregistryof/technical-service-intelligence-lite`
- Deployment from the GitHub `main` branch to Railway

Use compatible stable package versions. Avoid unnecessary dependencies.

## Hosting and environment

The deployed application must run on Railway and use Railway PostgreSQL.

- Read database credentials from `DATABASE_URL`.
- Read the shared application password from `APP_ACCESS_PASSWORD`.
- Read the session-cookie signing secret from `SESSION_SECRET` (at least 32 characters).
- Never hard-code or commit passwords, tokens, or database URLs.
- Provide `.env.example` containing variable names but no secret values.
- Ensure `.env`, `.env.local`, and other secret-bearing files are ignored by Git.
- Do not install or require a local PostgreSQL server.
- Do not claim the deployment works until it has been verified.

Railway setup is currently pending. Prepare the implementation so it can be deployed when Railway is available.

## V0.1 functional scope

### Access

Provide shared-password access with server-side validation and a secure, HTTP-only session cookie.

Protect application pages and server-side data access. Include a logout action.

### Rikketeated

This is the default page after login. The Estonian navigation label is "Rikketeated" (route `/rikketeated`); internal identifiers stay in English (e.g. `WorkOrder`, `FAULT_CALL`).

- Show only fault work orders with status `Open` or `Hold`.
- Sort by registration timestamp, newest first.
- Search by work-order ID or ATM number.
- Show ATM identifier, registration date, fault code, short description and status.
- Open a detail page showing the original fault description.
- For a `Hold` work order, show the latest technician visit comment without inventing missing information.

### Seadmed

- Search ATMs by identifier.
- Display ATM number and model.
- Show chronological work-order history, including closed fault calls and maintenance work.
- Show technician visits under their parent work orders.
- Distinguish fault calls, maintenance orders and technician visits.

### Basic factual analysis

- Use a fixed synthetic reference date: `2026-10-25`.
- Display the reference date prominently.
- Calculate the number of registered fault work orders in the preceding 30 days.
- Show the latest registered work date.
- Retrieve and calculate all information from PostgreSQL.
- Count work orders, not individual technician visits.
- Do not invent technical root causes or imply that AI diagnosis has occurred.

Operational records remain read-only in V0.1.

## Data model

Use a general domain model that can later be mapped to anonymized source-system data:

- `ATM`: stable ID, unique ATM number, model.
- `WorkOrder`: stable ID, ATM reference, external ID, source system, work type, status, registered timestamp, fault code and original description.
- `TechnicianVisit`: stable ID, parent work order, visit timestamp, actions, original technician comment, optional resolution code and outcome.
- `CodeDictionary`: code type, code and description.

A work order is either a fault call or a maintenance order.

One ATM can have many work orders. One work order can have many technician visits.

Preserve original source descriptions and comments. Keep source-system import mapping separate from domain and presentation logic.

## Synthetic demo data

Create approximately 5–8 synthetic ATMs and 30–50 registered work orders with associated technician visits.

Include:
- Open fault calls.
- Hold fault calls with technician comments.
- Closed fault calls visible in device history.
- Maintenance orders.
- At least one fault call with multiple technician visits.
- At least one device with limited fault history.

Use a deterministic, idempotent Prisma seed command, such as `npm run db:seed`.

Do not generate real customer, employee or company information.

## Implementation approach

Work in small, verifiable stages.

For every stage:
1. Explain the files and functionality to be changed.
2. Implement only the agreed stage.
3. Run appropriate checks.
4. Run the production build (`npm.cmd run build` on Windows PowerShell, or equivalent).
5. Fix errors before proceeding.
6. Explain what was verified and what remains unverified.
7. Commit and push completed work as required by the coursework workflow, after GitHub access is configured.

Do not report a stage as deployed or tested unless it was actually deployed or tested.

If a missing external service blocks verification, record the blocker and continue only with independent preparatory work.

## Security and usability

- Responsive desktop and mobile layout.
- Estonian labels, navigation, errors and empty states.
- Server-side protection for sensitive pages and data.
- No real operational data.
- No credentials in source control.
- No unsupported diagnostic certainty.
- Accessible controls and clear navigation.

## Out of scope for V0.1

Do not implement:
- Live AI model integrations or RAG.
- Dynamics AX integration.
- Automatic fault diagnosis.
- Dispatching or technician scheduling.
- Changes to operational work-order statuses.
- Editable technician-instruction drafts.
- Automatic period recommendations.
- Detailed 14/30/90-day comparison workflows.
- Role-based application accounts.

## Planned V0.2 extension

The later usability-test version will expand to approximately 25 ATMs, 12 months of synthetic history, two controlled test scenarios, configurable analysis periods, transparent rule-based period suggestions, traceable record references, illustrative interpretations and editable technician-instruction drafts.

Keep V0.1 extendable, but do not build these functions prematurely.