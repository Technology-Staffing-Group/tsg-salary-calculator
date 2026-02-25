// ============================================================
// TSG Salary & Cost Calculator - Spain Calculation Engine
// Currency: EUR | IRPF: Progressive bands (simplified estimate)
// ============================================================

import {
  ES_CONFIG,
  ESAdvancedOptions,
  ContributionDetail,
  EmployeeResult,
} from '../config/countries';
import { round2, clamp } from '../utils/math';

interface ESCalcOptions {
  grossYearly: number;
  occupationRate: number;
  advanced: ESAdvancedOptions;
}

function computeIRPF(taxableBase: number): number {
  const bands = ES_CONFIG.irpfBands;
  let tax = 0;
  let remaining = taxableBase;
  let previousLimit = 0;

  for (const band of bands) {
    const bandWidth = band.upTo - previousLimit;
    const taxableInBand = Math.min(remaining, bandWidth);
    tax += taxableInBand * band.rate;
    remaining -= taxableInBand;
    previousLimit = band.upTo;
    if (remaining <= 0) break;
  }

  return round2(tax);
}

function computeES(opts: ESCalcOptions): {
  employeeContribs: ContributionDetail[];
  employerContribs: ContributionDetail[];
  totalEmployeeContribs: number;
  totalEmployerContribs: number;
  taxableBase: number;
  incomeTax: number;
  netYearly: number;
  totalCostYearly: number;
} {
  const { grossYearly, occupationRate, advanced } = opts;
  const cfg = ES_CONFIG;
  const grossMonthly = grossYearly / 12;

  // Contribution base with min/max limits (monthly)
  const contributionBaseMonthly = clamp(
    grossMonthly,
    cfg.contributionBase.minMonthly,
    cfg.contributionBase.maxMonthly
  );
  const contributionBaseYearly = round2(contributionBaseMonthly * 12);

  const employeeContribs: ContributionDetail[] = [];
  const employerContribs: ContributionDetail[] = [];

  // --- Common Contingencies ---
  employeeContribs.push({
    name: 'Common Contingencies',
    rate: cfg.commonContingencies.employee,
    base: contributionBaseYearly,
    amount: round2(contributionBaseYearly * cfg.commonContingencies.employee),
  });
  employerContribs.push({
    name: 'Common Contingencies',
    rate: cfg.commonContingencies.employer,
    base: contributionBaseYearly,
    amount: round2(contributionBaseYearly * cfg.commonContingencies.employer),
  });

  // --- Unemployment ---
  employeeContribs.push({
    name: 'Unemployment',
    rate: cfg.unemployment.employee,
    base: contributionBaseYearly,
    amount: round2(contributionBaseYearly * cfg.unemployment.employee),
  });
  employerContribs.push({
    name: 'Unemployment',
    rate: cfg.unemployment.employer,
    base: contributionBaseYearly,
    amount: round2(contributionBaseYearly * cfg.unemployment.employer),
  });

  // --- Professional Training ---
  employeeContribs.push({
    name: 'Professional Training',
    rate: cfg.professionalTraining.employee,
    base: contributionBaseYearly,
    amount: round2(contributionBaseYearly * cfg.professionalTraining.employee),
  });
  employerContribs.push({
    name: 'Professional Training',
    rate: cfg.professionalTraining.employer,
    base: contributionBaseYearly,
    amount: round2(contributionBaseYearly * cfg.professionalTraining.employer),
  });

  // --- FOGASA (employer only) ---
  employerContribs.push({
    name: 'FOGASA',
    rate: cfg.FOGASA.employer,
    base: contributionBaseYearly,
    amount: round2(contributionBaseYearly * cfg.FOGASA.employer),
  });

  // --- Totals for social contributions ---
  const totalEmployeeSSContribs = round2(
    employeeContribs.reduce((sum, c) => sum + c.amount, 0)
  );
  const totalEmployerContribs = round2(
    employerContribs.reduce((sum, c) => sum + c.amount, 0)
  );

  // --- IRPF (income tax) ---
  // Taxable base = gross - employee SS contributions
  const taxableBase = round2(Math.max(grossYearly - totalEmployeeSSContribs, 0));
  const incomeTax = computeIRPF(taxableBase);

  const totalEmployeeContribs = round2(totalEmployeeSSContribs + incomeTax);
  const netYearly = round2(grossYearly - totalEmployeeContribs);
  const totalCostYearly = round2(grossYearly + totalEmployerContribs);

  return {
    employeeContribs,
    employerContribs,
    totalEmployeeContribs,
    totalEmployerContribs,
    taxableBase,
    incomeTax,
    netYearly,
    totalCostYearly,
  };
}

/** Forward: Gross → Net & Total Cost */
export function calculateESFromGross(
  grossYearly: number,
  occupationRate: number,
  advanced: ESAdvancedOptions = {}
): EmployeeResult {
  const result = computeES({ grossYearly, occupationRate, advanced });
  const workingDays = ES_CONFIG.workingDaysPerYear * (occupationRate / 100);

  return {
    grossSalaryMonthly: round2(grossYearly / 12),
    grossSalaryYearly: round2(grossYearly),
    netSalaryMonthly: round2(result.netYearly / 12),
    netSalaryYearly: round2(result.netYearly),
    totalEmployerCostMonthly: round2(result.totalCostYearly / 12),
    totalEmployerCostYearly: round2(result.totalCostYearly),
    employeeContributions: result.employeeContribs,
    employerContributions: result.employerContribs,
    totalEmployeeContributions: result.totalEmployeeContribs,
    totalEmployerContributions: result.totalEmployerContribs,
    taxableBase: result.taxableBase,
    incomeTax: result.incomeTax,
    incomeTaxMonthly: round2(result.incomeTax / 12),
    dailyRate: workingDays > 0 ? round2(result.totalCostYearly / workingDays) : 0,
    currency: 'EUR',
    country: 'ES',
    occupationRate,
  };
}

/** Reverse: Net → Gross using Newton-Raphson */
export function calculateESFromNet(
  targetNetYearly: number,
  occupationRate: number,
  advanced: ESAdvancedOptions = {}
): EmployeeResult {
  let gross = targetNetYearly * 1.5;
  const maxIter = 50;
  const tolerance = 0.01;

  for (let i = 0; i < maxIter; i++) {
    const result = computeES({ grossYearly: gross, occupationRate, advanced });
    const diff = result.netYearly - targetNetYearly;

    if (Math.abs(diff) <= tolerance) {
      return calculateESFromGross(round2(gross), occupationRate, advanced);
    }

    const h = 1;
    const resultH = computeES({ grossYearly: gross + h, occupationRate, advanced });
    const derivative = (resultH.netYearly - result.netYearly) / h;

    if (Math.abs(derivative) < 1e-10) break;
    gross = gross - diff / derivative;
    if (gross < 0) gross = targetNetYearly;
  }

  throw new Error('Reverse calculation (Net→Gross) did not converge. Please adjust inputs.');
}

/** Reverse: Total Cost → Gross using binary search */
export function calculateESFromTotalCost(
  targetTotalCostYearly: number,
  occupationRate: number,
  advanced: ESAdvancedOptions = {}
): EmployeeResult {
  let lo = 0;
  let hi = targetTotalCostYearly;
  const maxIter = 50;
  const tolerance = 0.01;

  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const result = computeES({ grossYearly: mid, occupationRate, advanced });
    const diff = result.totalCostYearly - targetTotalCostYearly;

    if (Math.abs(diff) <= tolerance) {
      return calculateESFromGross(round2(mid), occupationRate, advanced);
    }

    if (diff < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  throw new Error('Reverse calculation (TotalCost→Gross) did not converge. Please adjust inputs.');
}
