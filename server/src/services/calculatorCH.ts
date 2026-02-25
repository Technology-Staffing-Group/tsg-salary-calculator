// ============================================================
// TSG Salary & Cost Calculator - Switzerland Calculation Engine
// Tax Year: 2026 | Currency: CHF
// Income tax NOT included (varies by canton/commune/church)
// ============================================================

import {
  CH_CONFIG,
  CHAdvancedOptions,
  ContributionDetail,
  EmployeeResult,
} from '../config/countries';
import { round2 } from '../utils/math';

interface CHCalcOptions {
  grossYearly: number;
  occupationRate: number;
  advanced: CHAdvancedOptions;
}

function computeCH(opts: CHCalcOptions): {
  employeeContribs: ContributionDetail[];
  employerContribs: ContributionDetail[];
  totalEmployeeContribs: number;
  totalEmployerContribs: number;
  netYearly: number;
  totalCostYearly: number;
} {
  const { grossYearly, occupationRate, advanced } = opts;
  const cfg = CH_CONFIG;
  const occRate = occupationRate / 100;

  // Effective gross (adjusted for occupation rate is handled before calling)
  const gross = grossYearly;

  const employeeContribs: ContributionDetail[] = [];
  const employerContribs: ContributionDetail[] = [];

  // --- AVS/AI/APG ---
  employeeContribs.push({
    name: 'AVS/AI/APG',
    rate: cfg.AVS_AI_APG.employee,
    base: gross,
    amount: round2(gross * cfg.AVS_AI_APG.employee),
  });
  employerContribs.push({
    name: 'AVS/AI/APG',
    rate: cfg.AVS_AI_APG.employer,
    base: gross,
    amount: round2(gross * cfg.AVS_AI_APG.employer),
  });

  // --- AC (Unemployment) with ceiling ---
  const acCeiling = cfg.AC.annualCeiling;
  const acBase = Math.min(gross, acCeiling);
  employeeContribs.push({
    name: 'AC (Unemployment)',
    rate: cfg.AC.employee,
    base: acBase,
    amount: round2(acBase * cfg.AC.employee),
  });
  employerContribs.push({
    name: 'AC (Unemployment)',
    rate: cfg.AC.employer,
    base: acBase,
    amount: round2(acBase * cfg.AC.employer),
  });

  // AC Solidarity above ceiling
  if (gross > acCeiling) {
    const solidarityBase = gross - acCeiling;
    employeeContribs.push({
      name: 'AC Solidarity',
      rate: cfg.AC.solidarityRate,
      base: solidarityBase,
      amount: round2(solidarityBase * cfg.AC.solidarityRate),
    });
    employerContribs.push({
      name: 'AC Solidarity',
      rate: cfg.AC.solidarityRate,
      base: solidarityBase,
      amount: round2(solidarityBase * cfg.AC.solidarityRate),
    });
  }

  // --- CAF (Family) - employer only ---
  employerContribs.push({
    name: 'CAF (Family Allowances)',
    rate: cfg.CAF.employer,
    base: gross,
    amount: round2(gross * cfg.CAF.employer),
  });

  // --- LAMat (Maternity) ---
  employeeContribs.push({
    name: 'LAMat (Maternity)',
    rate: cfg.LAMat.employee,
    base: gross,
    amount: round2(gross * cfg.LAMat.employee),
  });
  employerContribs.push({
    name: 'LAMat (Maternity)',
    rate: cfg.LAMat.employer,
    base: gross,
    amount: round2(gross * cfg.LAMat.employer),
  });

  // --- CPE (Training Fund) - employer only ---
  employerContribs.push({
    name: 'CPE (Training Fund)',
    rate: cfg.CPE.employer,
    base: gross,
    amount: round2(gross * cfg.CPE.employer),
  });

  // --- LFP (Vocational Training) - employer only ---
  const lfpRate = advanced.lfpRate ?? cfg.LFP.employer;
  employerContribs.push({
    name: 'LFP (Vocational Training)',
    rate: lfpRate,
    base: gross,
    amount: round2(gross * lfpRate),
  });

  // --- LPP/BVG (Pension) ---
  const lppRate = advanced.lppRate ?? cfg.LPP.defaultRate;
  const pensionMode = advanced.pensionPlanMode ?? 'MANDATORY_BVG';

  if (gross >= cfg.LPP.minimumSalary) {
    let insuredSalary: number;
    const coordinated = gross - cfg.LPP.coordinationDeduction;

    if (pensionMode === 'MANDATORY_BVG') {
      insuredSalary = Math.min(
        Math.max(coordinated, 0),
        cfg.LPP.maxInsuredSalary - cfg.LPP.coordinationDeduction
      );
    } else {
      // SUPER_OBLIGATORY: uncapped
      insuredSalary = Math.max(coordinated, 0);
    }

    const lppAmount = round2(insuredSalary * lppRate);
    // LPP is typically split 50/50 employee/employer
    employeeContribs.push({
      name: 'LPP/BVG (Pension)',
      rate: lppRate / 2,
      base: insuredSalary,
      amount: round2(lppAmount / 2),
    });
    employerContribs.push({
      name: 'LPP/BVG (Pension)',
      rate: lppRate / 2,
      base: insuredSalary,
      amount: round2(lppAmount / 2),
    });
  }

  // --- LAA (Accident Insurance) ---
  const laaNonProRate = advanced.laaNonProfessionalRate ?? cfg.LAA.nonProfessional;
  employeeContribs.push({
    name: 'LAA Non-Professional',
    rate: laaNonProRate,
    base: gross,
    amount: round2(gross * laaNonProRate),
  });
  employerContribs.push({
    name: 'LAA Professional',
    rate: cfg.LAA.professional,
    base: gross,
    amount: round2(gross * cfg.LAA.professional),
  });

  // --- Totals ---
  const totalEmployeeContribs = round2(
    employeeContribs.reduce((sum, c) => sum + c.amount, 0)
  );
  const totalEmployerContribs = round2(
    employerContribs.reduce((sum, c) => sum + c.amount, 0)
  );

  // No income tax in CH mode
  const netYearly = round2(gross - totalEmployeeContribs);
  const totalCostYearly = round2(gross + totalEmployerContribs);

  return {
    employeeContribs,
    employerContribs,
    totalEmployeeContribs,
    totalEmployerContribs,
    netYearly,
    totalCostYearly,
  };
}

/** Forward: Gross → Net & Total Cost */
export function calculateCHFromGross(
  grossYearly: number,
  occupationRate: number,
  advanced: CHAdvancedOptions = {}
): EmployeeResult {
  const result = computeCH({ grossYearly, occupationRate, advanced });
  const workingDays = CH_CONFIG.workingDaysPerYear * (occupationRate / 100);

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
    dailyRate: round2(result.totalCostYearly / workingDays),
    currency: 'CHF',
    country: 'CH',
    occupationRate,
  };
}

/** Reverse: Net → Gross using Newton-Raphson */
export function calculateCHFromNet(
  targetNetYearly: number,
  occupationRate: number,
  advanced: CHAdvancedOptions = {}
): EmployeeResult {
  let gross = targetNetYearly * 1.5;
  const maxIter = 50;
  const tolerance = 0.01;

  for (let i = 0; i < maxIter; i++) {
    const result = computeCH({ grossYearly: gross, occupationRate, advanced });
    const diff = result.netYearly - targetNetYearly;

    if (Math.abs(diff) <= tolerance) {
      return calculateCHFromGross(round2(gross), occupationRate, advanced);
    }

    // Newton-Raphson: compute derivative numerically
    const h = 1;
    const resultH = computeCH({ grossYearly: gross + h, occupationRate, advanced });
    const derivative = (resultH.netYearly - result.netYearly) / h;

    if (Math.abs(derivative) < 1e-10) break;
    gross = gross - diff / derivative;
    if (gross < 0) gross = targetNetYearly;
  }

  throw new Error('Reverse calculation (Net→Gross) did not converge. Please adjust inputs.');
}

/** Reverse: Total Cost → Gross using binary search */
export function calculateCHFromTotalCost(
  targetTotalCostYearly: number,
  occupationRate: number,
  advanced: CHAdvancedOptions = {}
): EmployeeResult {
  let lo = 0;
  let hi = targetTotalCostYearly;
  const maxIter = 50;
  const tolerance = 0.01;

  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const result = computeCH({ grossYearly: mid, occupationRate, advanced });
    const diff = result.totalCostYearly - targetTotalCostYearly;

    if (Math.abs(diff) <= tolerance) {
      return calculateCHFromGross(round2(mid), occupationRate, advanced);
    }

    if (diff < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  throw new Error('Reverse calculation (TotalCost→Gross) did not converge. Please adjust inputs.');
}
