// ============================================================
// TSG Salary & Cost Calculator - Romania Calculation Engine
// Currency: RON | Income tax: 10% flat
// ============================================================

import {
  RO_CONFIG,
  ROAdvancedOptions,
  ContributionDetail,
  EmployeeResult,
} from '../config/countries';
import { round2 } from '../utils/math';

interface ROCalcOptions {
  grossYearly: number;
  occupationRate: number;
  advanced: ROAdvancedOptions;
}

function computeRO(opts: ROCalcOptions): {
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
  const cfg = RO_CONFIG;
  const grossMonthly = grossYearly / 12;

  const employeeContribs: ContributionDetail[] = [];
  const employerContribs: ContributionDetail[] = [];

  // --- CAS (Social Security) - employee ---
  const casAmount = round2(grossYearly * cfg.CAS.employee);
  employeeContribs.push({
    name: 'CAS (Social Security)',
    rate: cfg.CAS.employee,
    base: grossYearly,
    amount: casAmount,
  });

  // --- CASS (Health Insurance) - employee ---
  const cassAmount = round2(grossYearly * cfg.CASS.employee);
  employeeContribs.push({
    name: 'CASS (Health Insurance)',
    rate: cfg.CASS.employee,
    base: grossYearly,
    amount: cassAmount,
  });

  // --- CAM (Work Insurance) - employer ---
  const camAmount = round2(grossYearly * cfg.CAM.employer);
  employerContribs.push({
    name: 'CAM (Work Insurance)',
    rate: cfg.CAM.employer,
    base: grossYearly,
    amount: camAmount,
  });

  // --- Deductions ---
  const dependents = advanced.dependents ?? 0;
  const useBaseFunction = advanced.baseFunctionToggle !== false; // default true
  const personalDeductionMonthly = useBaseFunction ? cfg.personalDeduction : 0;
  const dependentDeductionMonthly = dependents * cfg.dependentDeduction;
  const totalDeductionMonthly = personalDeductionMonthly + dependentDeductionMonthly;
  const totalDeductionYearly = totalDeductionMonthly * 12;

  // --- Income Tax ---
  const totalEmployeeContribsBeforeTax = casAmount + cassAmount;
  let taxableBase = round2(grossYearly - totalEmployeeContribsBeforeTax - totalDeductionYearly);
  taxableBase = Math.max(taxableBase, 0);

  let incomeTax: number;
  if (advanced.disabledTaxExemption) {
    incomeTax = 0;
  } else {
    incomeTax = round2(taxableBase * cfg.incomeTaxRate);
  }

  // --- Totals ---
  const totalEmployeeContribs = round2(totalEmployeeContribsBeforeTax + incomeTax);
  const totalEmployerContribs = round2(camAmount);

  const netYearly = round2(grossYearly - totalEmployeeContribs);
  const totalCostYearly = round2(grossYearly + totalEmployerContribs);

  // Add meal benefits to net if applicable
  const mealBenefitsYearly = (advanced.monthlyMealBenefits ?? 0) * 12;

  return {
    employeeContribs,
    employerContribs,
    totalEmployeeContribs,
    totalEmployerContribs,
    taxableBase,
    incomeTax,
    netYearly: round2(netYearly + mealBenefitsYearly),
    totalCostYearly: round2(totalCostYearly + mealBenefitsYearly),
  };
}

/** Forward: Gross → Net & Total Cost */
export function calculateROFromGross(
  grossYearly: number,
  occupationRate: number,
  advanced: ROAdvancedOptions = {}
): EmployeeResult {
  const result = computeRO({ grossYearly, occupationRate, advanced });
  const workingDays = RO_CONFIG.workingDaysPerYear * (occupationRate / 100);

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
    currency: 'RON',
    country: 'RO',
    occupationRate,
  };
}

/** Reverse: Net → Gross using Newton-Raphson */
export function calculateROFromNet(
  targetNetYearly: number,
  occupationRate: number,
  advanced: ROAdvancedOptions = {}
): EmployeeResult {
  let gross = targetNetYearly * 1.5;
  const maxIter = 50;
  const tolerance = 0.01;

  for (let i = 0; i < maxIter; i++) {
    const result = computeRO({ grossYearly: gross, occupationRate, advanced });
    const diff = result.netYearly - targetNetYearly;

    if (Math.abs(diff) <= tolerance) {
      return calculateROFromGross(round2(gross), occupationRate, advanced);
    }

    const h = 1;
    const resultH = computeRO({ grossYearly: gross + h, occupationRate, advanced });
    const derivative = (resultH.netYearly - result.netYearly) / h;

    if (Math.abs(derivative) < 1e-10) break;
    gross = gross - diff / derivative;
    if (gross < 0) gross = targetNetYearly;
  }

  throw new Error('Reverse calculation (Net→Gross) did not converge. Please adjust inputs.');
}

/** Reverse: Total Cost → Gross using binary search */
export function calculateROFromTotalCost(
  targetTotalCostYearly: number,
  occupationRate: number,
  advanced: ROAdvancedOptions = {}
): EmployeeResult {
  let lo = 0;
  let hi = targetTotalCostYearly;
  const maxIter = 50;
  const tolerance = 0.01;

  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const result = computeRO({ grossYearly: mid, occupationRate, advanced });
    const diff = result.totalCostYearly - targetTotalCostYearly;

    if (Math.abs(diff) <= tolerance) {
      return calculateROFromGross(round2(mid), occupationRate, advanced);
    }

    if (diff < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  throw new Error('Reverse calculation (TotalCost→Gross) did not converge. Please adjust inputs.');
}
