# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

TSG Salary & Cost Calculator — a two-package web app (`client/` React + Vite, `server/` Express + TypeScript) for Swiss/Romanian/Spanish payroll cost modeling, B2B contractor pricing, multi-client allocation profitability, and Geneva/Vaud withholding-tax (impôt à la source) lookups. Tax year is **2026** throughout.

The `README.md` is the canonical user-facing doc and is largely accurate, but lags the code in a few places (component list, test count, withholding modes). Treat the code as authoritative.

## Common commands

Run from the corresponding package directory unless noted:

```bash
# Server (port 4000 in dev)
cd server
npm install
npm run dev          # tsx watch src/index.ts
npm run build        # tsc → dist/
npm start            # node dist/index.js
npm test             # vitest run (all suites)
npm run test:watch
npx vitest run src/__tests__/calculatorCH.test.ts        # single file
npx vitest run -t "AC ceiling"                           # by test name

# Client (port 3000 in dev, proxies /api → :4000)
cd client
npm install
npm run dev
npm run build        # tsc -b && vite build
npm run preview
```

There is no monorepo root `package.json` — install deps in each package separately. The root has no lint/format script.

### Required env vars

**Server:**
- `PORT` — defaults to 4000 dev / 3000 prod
- `VERCEL` — when set, the server skips static file serving and `app.listen()` (Vercel serverless mode)
- `APP_SESSION_SECRET` / `APP_USERNAME` / `APP_PASSWORD` — **no longer used** during the Firebase migration. The legacy JWT login route was removed; the [middleware/auth.ts](server/src/middleware/auth.ts) file is preserved but unwired, ready for the future Microsoft Entra ID rollout.

**Client (Vite, baked at build time):**
- `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` — see [client/.env.example](client/.env.example). On Vercel these must be set under **Project → Settings → Environment Variables** before the build runs (Vite bakes them; runtime changes require a new deploy).

## Deployment surfaces

Three are wired up; all run the same Express app:

- **Standalone Node** — `npm start` in `server/`, serves both API and `client/dist` static files (production).
- **Docker** — `Dockerfile` is a 3-stage build (client → server → production), exposes port 3000, healthcheck hits `/api/health`. `docker-compose up --build`.
- **Vercel** — [api/index.js](api/index.js) wraps the compiled Express app as a serverless function; [vercel.json](vercel.json) rewrites `/api/*` to it and falls back to `index.html`. Set `VERCEL=1` so `index.ts` skips `app.listen` and static file serving.
- **PM2** — [ecosystem.config.cjs](ecosystem.config.cjs) targets a sandbox path (`/home/user/webapp/server`); update `cwd` before using.

## Architecture

### Calculation engines (server)

Each country/mode has a self-contained engine in [server/src/services/](server/src/services/). They are pure functions over inputs from [server/src/config/countries.ts](server/src/config/countries.ts) and produce the shared `EmployeeResult`/`B2BResult`/`AllocationResult` shapes.

```
routes/api.ts
   └── calculatorEmployee.ts   (router: dispatches by country + calculationBasis)
         ├── calculatorCH.ts   ← CH_CONFIG (no income tax — varies by canton)
         ├── calculatorRO.ts   ← RO_CONFIG (includes flat 10% income tax)
         └── calculatorES.ts   ← ES_CONFIG (includes progressive IRPF)
   └── calculatorB2B.ts        (TARGET_MARGIN | CLIENT_RATE | CLIENT_BUDGET)
   └── calculatorAllocation.ts (legacy multiplier mode + new calculateAllocationCH using real CH social charges)
   └── withholdingGE.ts        (Geneva barème — reads JSON tables at runtime)
   └── withholdingVD.ts        (Vaud barème — annualised model, linear interpolation between anchors)
   └── fxService.ts            (24h in-memory cache, base currency = RON)
```

Three calculation directions per country: `calculate{Country}FromGross`, `FromNet` (Newton-Raphson, est × 1.5, tol 0.01, ≤50 iters), `FromTotalCost` (binary search). Rounding is `round2()` from [utils/math.ts](server/src/utils/math.ts).

### Cost envelope (TOTAL_COST + clientDailyRate)

When `calculationBasis === 'TOTAL_COST'` and `clientDailyRate > 0`, [calculatorEmployee.ts](server/src/services/calculatorEmployee.ts) computes a **cost envelope** *before* invoking the country engine:

1. Effective working days = `workingDaysPerYear × occupationRate/100`
2. Annual revenue = `clientDailyRate × effectiveWorkingDays`
3. Daily margin = `clientDailyRate × marginPercent/100`, **floored** at `minDailyMargin` (default 120 CHF, FX-converted to local currency for RO/ES in [routes/api.ts](server/src/routes/api.ts))
4. Total employer cost = `annualRevenue − marginAmount`, then fed into `FromTotalCost` reverse calc.

The min-margin floor is also applied in B2B (`TARGET_MARGIN` / `CLIENT_BUDGET`) and Allocation modes; floor lives in CHF and is FX-converted at the route layer.

### Allocation: two modes

`calculateAllocation` (legacy) takes a hand-tuned `employerMultiplier` (e.g. 1.20). `calculateAllocationCH` (used when `grossAnnualSalary` is present in the request) routes through the real CH engine for accurate social charges. Route detection is a runtime branch in [routes/api.ts](server/src/routes/api.ts).

### Withholding tax (Geneva + Vaud)

- Geneva: rates loaded from `baremes_ABCH_2026.json` and `bareme_G_2026.json` via `fs.readFileSync` at startup. Tariffs A/B/C/G/H lookup-by-bracket; E/L/M/N/P/Q are flat rates from `tar26ge.txt` directives. `determineTariffCode()` derives the code from personal info (nationality, permit, marital status, dependents).
- Vaud: annualised model per Circulaire AFC n°45 — floor monthly to franc, ×12 to find rate, apply to monthly, round tax to nearest 0.05 CHF. Rate data is **anchor points with linear interpolation** in [withholdingVD.ts](server/src/services/withholdingVD.ts) — for production accuracy the anchors should be replaced with the full `tar26vd.txt` tariff file. French frontaliers are exempt unless conditions are not met.

### Auth flow

Auth is **client-side only** during the Firebase migration. The server's `requireAuth` middleware is intentionally **not** applied to the API router — see the comment block in [server/src/routes/api.ts](server/src/routes/api.ts). The middleware file itself is preserved for the upcoming Entra ID work.

- Login is via Firebase Authentication (email + password). Configuration lives in [client/src/config/firebase.ts](client/src/config/firebase.ts); SDK is the modular v9+ tree-shakeable build.
- [AuthGuard.tsx](client/src/components/AuthGuard.tsx) subscribes to `onAuthStateChanged` and exposes `useCurrentUser()` (a `useSyncExternalStore`-backed hook) so any component can read the live `User` without prop-drilling. `signOutUser()` is exported for the header sign-out button.
- The API client ([services/api.ts](client/src/services/api.ts)) sends no Bearer token. When Entra ID is wired up, it will forward the Firebase ID token and the server middleware will validate it via `firebase-admin`.

### Firestore writes

[client/src/services/firestore.ts](client/src/services/firestore.ts) handles two collections:

- **`audit_logs`** — written when the user clicks "Download PDF" in any of the 3 modes. Fields: `userId` (email), `uid`, `action: 'pdf_export'`, `mode`, `country` (when applicable), `timestamp` (server timestamp).
- **`calculations`** — written after every successful `api.calculate*` response. Fields: `userId`, `uid`, `mode`, `country`, `inputs`, `results`, `timestamp`. **PII is stripped** before persisting: `employeeName` and `dateOfBirth` are removed recursively from both `inputs` and `results` (PII keys defined in `PII_KEYS` in firestore.ts).

All Firestore writes are **fire-and-forget** — they are not awaited in the UI hot path and failures are logged to console rather than surfaced. Both `userId` (email) and `uid` are stored in every document so we can switch the primary identifier later without a migration.

The PDF export adds a "Generated by &lt;email&gt; on &lt;date&gt;" footer line just above the disclaimer. The user email flows through the existing `generatedBy` parameter on each `export*PDF` function.

### Frontend state model

Each tab (Employee / B2B / Allocation) is a self-contained component that persists its inputs in `localStorage` under its own key (`tsg_employee_inputs`, etc.). Employee identity (name, DOB, role) is shared across Employee + B2B via a key in [App.tsx](client/src/App.tsx) (`tsg_employee_identity`). FX data is fetched once in `App` and passed down. The Employee tab age is computed from DOB and used to pick the LPP age band.

### Currency handling

FX service ([fxService.ts](server/src/services/fxService.ts)) uses **RON as base** (open.er-api.com), 24h cache, with hard-coded fallback rates if the API is unreachable. The `convertCHFFloor` helper in [routes/api.ts](server/src/routes/api.ts) converts CHF → RON → target by dividing then multiplying — it depends on `rates.CHF` being CHF-per-RON.

## Updating tax rules annually

All rates live in [server/src/config/countries.ts](server/src/config/countries.ts) (CH/RO/ES) — see the README "Updating Tax Rules Annually" section. Withholding bareme JSON files in [server/src/services/](server/src/services/) must be regenerated from the official cantonal PDFs (`21034-10_Employeurs_2026.pdf` etc. are kept at the repo root for reference). Bump `taxYear` and re-run `npm test`.

## Tests

Vitest, in [server/src/__tests__/](server/src/__tests__/). Suites: `calculatorCH`, `calculatorRO`, `calculatorES`, `calculatorB2B`, `calculatorAllocation`, `costEnvelope`, `withholdingGE`, `withholdingVD`. The README's "36 tests" figure is stale. No client-side tests.

## Things to know

- Server uses **CommonJS** (`module: commonjs` in [tsconfig.json](server/tsconfig.json)); client is **ESM** (`"type": "module"`). Don't mix import styles across packages.
- The repo root holds reference PDFs and `tar26ge.txt` (~2 MB) used as documentation/source data — do not delete.
- `data/*.db*` is gitignored, but no SQLite is currently wired up; `@neondatabase/serverless`, `bcryptjs`, and `jsonwebtoken` are listed in `server/package.json` but currently unused (auth has moved to Firebase on the client).
- All API responses are wrapped as `{ success: boolean, data?: T, error?: string }`. The client's `apiCall` unwraps `data` and throws on `success: false`.
