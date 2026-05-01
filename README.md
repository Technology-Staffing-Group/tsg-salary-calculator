# TSG Salary & Cost Calculator

A production-ready salary and cost calculation web application for **Technology Staffing Group (TSG)**. Supports employee payroll cost estimation for Switzerland, Romania, and Spain, B2B contractor cost modeling, and multi-client allocation profitability analysis.

---

## Features

### Three Engagement Modes

1. **Employee Mode (TSG Payroll)**
   - Bi-directional calculations: Net ↔ Gross ↔ Total Employer Cost
   - Country-specific social contributions and tax rules for:
     - 🇨🇭 **Switzerland (CHF)** – 2026 rules (AVS, AC with ceiling, LPP/BVG, LAA, etc.)
     - 🇷🇴 **Romania (RON)** – CAS, CASS, CAM, income tax with deductions
     - 🇪🇸 **Spain (EUR)** – SS contributions with base limits, progressive IRPF
   - Configurable advanced options per country
   - Occupation rate (part-time) support
   - Daily rate and margin calculations

2. **B2B Mode (Independent Contractor)**
   - Three pricing modes: Target Margin %, Client Daily Rate, Client Budget
   - Multi-currency support (CHF, EUR, RON)
   - Margin and markup analysis with visual indicators
   - Annual profit projections

3. **Allocation Mode (Multi-Client Profitability)**
   - Model profitability when one employee serves multiple clients
   - Baseline vs incremental profit calculation
   - Dynamic client list with validation
   - "Load Sample" button with the spec's reference scenario

### Additional Features

- **Multi-currency FX** with live rates from exchangerate-api.com and 24h caching
- **Display in EUR** global toggle
- **PDF Export** for all three modes with TSG branding
- **Help tooltips** (?) for all key inputs and outputs
- **Local storage persistence** for last-used inputs per mode
- **Responsive design** (desktop, tablet, mobile)
- **Disclaimer** visible in UI and PDFs

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + TypeScript + Vite        |
| Styling    | Tailwind CSS                        |
| Backend    | Node.js + Express                   |
| PDF        | jsPDF + jspdf-autotable             |
| Testing    | Vitest                              |
| Container  | Docker + docker-compose             |

---

## Project Structure

```
webapp/
├── client/                    # React frontend
│   ├── src/
│   │   ├── App.tsx            # Main app with header, tabs, FX toggle
│   │   ├── components/
│   │   │   ├── EmployeeMode.tsx    # Employee tab
│   │   │   ├── B2BMode.tsx         # B2B tab
│   │   │   ├── AllocationMode.tsx  # Allocation tab
│   │   │   └── UIComponents.tsx    # Shared UI components
│   │   ├── services/
│   │   │   ├── api.ts              # Backend API client
│   │   │   └── pdfExport.ts        # PDF generation
│   │   └── types/
│   │       └── index.ts            # Shared TypeScript types
│   ├── public/
│   │   └── tsg-logo.svg
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/                    # Express backend
│   ├── src/
│   │   ├── index.ts               # Express entry point
│   │   ├── config/
│   │   │   └── countries.ts        # ⭐ All tax rates & rules (update annually)
│   │   ├── routes/
│   │   │   └── api.ts              # API endpoints
│   │   ├── services/
│   │   │   ├── calculatorCH.ts     # Switzerland engine
│   │   │   ├── calculatorRO.ts     # Romania engine
│   │   │   ├── calculatorES.ts     # Spain engine
│   │   │   ├── calculatorB2B.ts    # B2B engine
│   │   │   ├── calculatorAllocation.ts  # Allocation engine
│   │   │   ├── calculatorEmployee.ts    # Unified employee router
│   │   │   └── fxService.ts        # FX rate service with caching
│   │   ├── utils/
│   │   │   └── math.ts             # Rounding utilities
│   │   └── __tests__/              # Unit tests (36 tests)
│   │       ├── calculatorCH.test.ts
│   │       ├── calculatorRO.test.ts
│   │       ├── calculatorES.test.ts
│   │       ├── calculatorB2B.test.ts
│   │       └── calculatorAllocation.test.ts
│   └── tsconfig.json
│
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.cjs       # PM2 config (sandbox)
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- A **Firebase project** with Authentication (Email/Password sign-in) and Firestore enabled

### Firebase configuration

The frontend uses Firebase for sign-in and Firestore for audit logs and saved calculations.

1. Create a Firebase project (or reuse an existing one) and enable **Authentication → Email/Password** and **Cloud Firestore**.
2. Copy [client/.env.example](client/.env.example) to `client/.env` and fill in the six `VITE_FIREBASE_*` values from **Firebase Console → Project Settings → General → Your apps → SDK setup and configuration**.
3. Create at least one user in **Authentication → Users** so you can sign in.

> ⚠️ **Vercel deployments:** Vite bakes `VITE_*` variables into the bundle at build time. Set all six `VITE_FIREBASE_*` variables under **Vercel → Project → Settings → Environment Variables** (Production / Preview / Development as appropriate) **before** the build runs. Changing them later requires a fresh deploy.

### Development Setup

```bash
# Clone the repository
git clone <repo-url>
cd webapp

# Install dependencies
cd server && npm install
cd ../client && npm install

# Set up Firebase env vars (see above)
cp client/.env.example client/.env
# …then edit client/.env with your project's values

# Start the backend (port 4000)
cd ../server
npm run dev

# In a new terminal, start the frontend (port 3000, proxies /api to :4000)
cd client
npm run dev

# Open http://localhost:3000 in your browser
```

### Production Build

```bash
# Build the frontend
cd client && npm run build

# Build the backend
cd ../server && npm run build

# Start the server (serves both API and frontend)
cd ../server
PORT=3000 npm start

# Open http://localhost:3000
```

### Docker

```bash
# Build and run with docker-compose
docker-compose up --build

# Or build manually
docker build -t tsg-calculator .
docker run -p 3000:3000 tsg-calculator

# Access at http://localhost:3000
```

---

## API Endpoints

### Employee Mode
```
POST /api/calculate/employee
```
**Request Body:**
```json
{
  "country": "CH",
  "calculationBasis": "GROSS",
  "period": "YEARLY",
  "amount": 100000,
  "occupationRate": 100,
  "advancedOptions": {
    "lppRate": 0.07,
    "pensionPlanMode": "MANDATORY_BVG"
  },
  "clientDailyRate": 1200
}
```

### B2B Mode
```
POST /api/calculate/b2b
```
**Request Body:**
```json
{
  "costRate": 800,
  "rateType": "DAILY",
  "costCurrency": "CHF",
  "pricingMode": "TARGET_MARGIN",
  "targetMarginPercent": 20,
  "workingDaysPerYear": 220
}
```

### Allocation Mode
```
POST /api/calculate/allocation
```
**Request Body:**
```json
{
  "salary100": 160000,
  "engagementPercent": 80,
  "employerMultiplier": 1.20,
  "workingDaysPerYear": 220,
  "currency": "CHF",
  "clients": [
    { "clientName": "Client A", "allocationPercent": 60, "dailyRate": 1250 },
    { "clientName": "Client B", "allocationPercent": 20, "dailyRate": 1250 }
  ]
}
```

### FX Rates
```
GET  /api/fx/rates       # Get current rates (24h cache)
POST /api/fx/convert     # Convert between currencies
POST /api/fx/refresh     # Force refresh rates
```

### Health Check
```
GET /api/health
```

---

## Running Tests

```bash
cd server
npm test        # Run all 36 tests
npm run test:watch  # Watch mode
```

**Test Coverage:**
- Switzerland: AC ceiling, LPP caps (mandatory vs super-obligatory), reverse calculations
- Romania: Deductions, disabled exemption, meal benefits, reverse calculations
- Spain: Contribution base min/max, progressive IRPF, reverse calculations
- B2B: All 3 pricing modes, hourly-to-daily conversion, edge cases
- Allocation: Spec example scenario (exact values), validation

---

## Updating Tax Rules Annually

All country-specific tax rates and rules are centralized in a single file:

**`server/src/config/countries.ts`**

This file contains:
- Swiss social contribution rates (AVS, AC, CAF, LPP thresholds, etc.)
- Romanian CAS/CASS rates, income tax, deductions
- Spanish SS rates, contribution base limits, IRPF bands

To update for a new tax year:
1. Open `server/src/config/countries.ts`
2. Update the relevant rates and thresholds
3. Update the `taxYear` field
4. Run `npm test` to verify calculations still converge
5. Rebuild and deploy

---

## Algorithms

| Operation | Algorithm | Details |
|-----------|-----------|---------|
| Gross → Net | Forward calculation | Apply contributions, deductions, tax |
| Net → Gross | Newton-Raphson | Initial estimate: Net × 1.5, tolerance: 0.01, max 50 iterations |
| Total Cost → Gross | Binary Search | Range: 0 to TotalCost, tolerance: 0.01, max 50 iterations |
| Rounding | `Math.round(value * 100) / 100` | Applied at end of each major step |

---

## License

Internal use only - Technology Staffing Group (TSG).
