// ============================================================
// TSG Salary & Cost Calculator - Country Tax Configuration
// All rates centralized here for annual updates.
// Tax Year: 2026
// ============================================================

export interface ContributionLine {
  name: string;
  key: string;
  employeeRate: number;
  employerRate: number;
  ceiling?: number;       // Annual ceiling on base
  floorMonthly?: number;  // Monthly minimum base
  ceilingMonthly?: number; // Monthly maximum base
  description: string;
}

// ============================================================
// SWITZERLAND (CHF) - 2026 Rules
// ============================================================
export const CH_CONFIG = {
  currency: 'CHF' as const,
  taxYear: 2026,
  includesIncomeTax: false,

  // Social contributions
  AVS_AI_APG: { employee: 0.053, employer: 0.053 },
  AC: {
    employee: 0.011,
    employer: 0.011,
    annualCeiling: 148200,
    solidarityRate: 0.005, // each side above ceiling
  },
  CAF: { employer: 0.0222 },
  LAMat: { employee: 0.00029, employer: 0.00029 },
  CPE: { employer: 0.0007 },
  LFP: { employer: 0.001, configurable: true }, // default 0.1%
  LPP: {
    defaultRate: 0.07,
    minimumSalary: 22680,
    coordinationDeduction: 26460,
    maxInsuredSalary: 90720,
  },
  LAA: {
    professional: 0.01,       // employer
    nonProfessional: 0.015,   // employee, configurable
  },

  workingDaysPerYear: 220,
};

// ============================================================
// ROMANIA (RON) - 2026 Rules
// ============================================================
export const RO_CONFIG = {
  currency: 'RON' as const,
  taxYear: 2026,
  includesIncomeTax: true,

  CAS: { employee: 0.25 },       // Social security
  CASS: { employee: 0.10 },      // Health insurance
  CAM: { employer: 0.0225 },     // Work insurance
  incomeTaxRate: 0.10,
  personalDeduction: 510,          // RON/month (base function)
  dependentDeduction: 110,         // RON/month per dependent

  workingDaysPerYear: 220,
};

// ============================================================
// SPAIN (EUR) - 2026 Rules
// ============================================================
export const ES_CONFIG = {
  currency: 'EUR' as const,
  taxYear: 2026,
  includesIncomeTax: true,

  commonContingencies: { employee: 0.047, employer: 0.236 },
  unemployment: { employee: 0.0155, employer: 0.058 },
  professionalTraining: { employee: 0.001, employer: 0.006 },
  FOGASA: { employer: 0.002 },

  contributionBase: {
    minMonthly: 1323,
    maxMonthly: 4720.50,
  },

  // IRPF progressive bands (simplified estimate)
  irpfBands: [
    { upTo: 12450, rate: 0.19 },
    { upTo: 20200, rate: 0.24 },
    { upTo: 35200, rate: 0.30 },
    { upTo: 60000, rate: 0.37 },
    { upTo: 300000, rate: 0.45 },
    { upTo: Infinity, rate: 0.47 },
  ],

  workingDaysPerYear: 220,
};

export type CountryCode = 'CH' | 'RO' | 'ES';
export type CalculationBasis = 'NET' | 'GROSS' | 'TOTAL_COST';
export type Period = 'MONTHLY' | 'YEARLY';
export type PensionPlanMode = 'MANDATORY_BVG' | 'SUPER_OBLIGATORY';

export interface CHAdvancedOptions {
  lppRate?: number;
  lfpRate?: number;
  laaNonProfessionalRate?: number;
  pensionPlanMode?: PensionPlanMode;
}

export interface ROAdvancedOptions {
  disabledTaxExemption?: boolean;
  monthlyMealBenefits?: number;
  baseFunctionToggle?: boolean;
  dependents?: number;
}

export interface ESAdvancedOptions {
  // Reserved for future use
}

export type AdvancedOptions = CHAdvancedOptions | ROAdvancedOptions | ESAdvancedOptions;

export interface EmployeeInput {
  country: CountryCode;
  calculationBasis: CalculationBasis;
  period: Period;
  amount: number;
  occupationRate: number;
  advancedOptions?: AdvancedOptions;
  clientDailyRate?: number;
}

export interface ContributionDetail {
  name: string;
  rate: number;
  base: number;
  amount: number;
}

export interface EmployeeResult {
  grossSalaryMonthly: number;
  grossSalaryYearly: number;
  netSalaryMonthly: number;
  netSalaryYearly: number;
  totalEmployerCostMonthly: number;
  totalEmployerCostYearly: number;
  employeeContributions: ContributionDetail[];
  employerContributions: ContributionDetail[];
  totalEmployeeContributions: number;
  totalEmployerContributions: number;
  taxableBase?: number;
  incomeTax?: number;
  incomeTaxMonthly?: number;
  dailyRate: number;
  marginVsClientRate?: number;
  currency: string;
  country: CountryCode;
  occupationRate: number;
}
