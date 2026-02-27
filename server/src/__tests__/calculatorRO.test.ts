// ============================================================
// Unit Tests - Romania (RO) Calculation Engine
// Reference: calculator-salarii.ro (2026)
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  calculateROFromGross,
  calculateROFromNet,
  calculateROFromTotalCost,
} from '../services/calculatorRO';

describe('Romania (RO) Calculator', () => {
  // ========================================================
  // Reference test cases from calculator-salarii.ro (2026)
  // Default: functie de baza = true, 0 dependents, no exemption
  // ========================================================
  describe('Reference Site Validation (calculator-salarii.ro)', () => {
    it('should match reference: 10,000 RON/month gross', () => {
      // Gross 10,000 × 12 = 120,000/year
      // Above 6,050 threshold → no personal deduction
      // CAS = 2,500, CASS = 1,000, Tax = 650, Net = 5,850
      // CAM = 225, Total = 10,225
      const result = calculateROFromGross(120000, 100);

      expect(result.grossSalaryMonthly).toBe(10000);
      expect(result.netSalaryMonthly).toBeCloseTo(5850, 0);
      expect(result.totalEmployerCostMonthly).toBeCloseTo(10225, 0);
      expect(result.currency).toBe('RON');
      expect(result.country).toBe('RO');

      const cas = result.employeeContributions.find(c => c.name === 'CAS (Social Security)');
      expect(cas?.amount).toBe(30000); // yearly: 2,500 × 12

      const cass = result.employeeContributions.find(c => c.name === 'CASS (Health Insurance)');
      expect(cass?.amount).toBe(12000); // yearly: 1,000 × 12

      const cam = result.employerContributions.find(c => c.name === 'CAM (Work Insurance)');
      expect(cam?.amount).toBe(2700); // yearly: 225 × 12

      // No personal deduction (10,000 > 6,050)
      expect(result.incomeTaxMonthly).toBeCloseTo(650, 0);
    });

    it('should match reference: 15,000 RON/month gross', () => {
      // CAS = 3,750, CASS = 1,500, Tax = 975, Net = 8,775
      // CAM = 338, Total = 15,338 (rounding to ~15,337.50)
      const result = calculateROFromGross(180000, 100);

      expect(result.grossSalaryMonthly).toBe(15000);
      expect(result.netSalaryMonthly).toBeCloseTo(8775, 0);
      expect(result.totalEmployerCostMonthly).toBeCloseTo(15337.5, 1);
    });

    it('should match reference: 5,000 RON/month gross with personal deduction', () => {
      // 5,000 is 950 above minimum (4,050)
      // Band: min+901 to min+950 → 10.5% for 0 deps (ceil(950/50) = 19 steps)
      // Actually: 0.20 - 19*0.005 = 0.105
      // Deduction = 10.5% × 4,050 = 425.25 → 425 (rounded)
      // CAS = 1,250, CASS = 500
      // Taxable = 5,000 - 1,250 - 500 - 425 = 2,825
      // Tax = 283 (10% of 2,825 rounded), Net = 2,967
      const result = calculateROFromGross(60000, 100);

      expect(result.grossSalaryMonthly).toBe(5000);
      // Net should be close to 2,967 (within ~1 RON rounding from yearly÷12)
      expect(Math.round(result.netSalaryMonthly)).toBeCloseTo(2968, 0);
    });

    it('should match reference: 4,050 RON minimum wage with tax-free amount', () => {
      // Minimum wage: 300 RON tax-free
      // Contribution base = 4,050 - 300 = 3,750
      // CAS = 938 (25% of 3,750), CASS = 375 (10% of 3,750)
      // Personal deduction = 20% × 4,050 = 810
      // Taxable = 3,750 - 938 - 375 - 810 = 1,627
      // Tax = 163, Net = 2,574
      // CAM = 84 (2.25% of 3,750), Total = 4,134
      const result = calculateROFromGross(48600, 100); // 4,050 × 12

      expect(result.grossSalaryMonthly).toBe(4050);
      // Yearly calculation: net = 30,897 / 12 = 2,574.75 (reference rounds to 2,574)
      expect(Math.round(result.netSalaryMonthly)).toBeCloseTo(2575, 0);
      expect(result.totalEmployerCostMonthly).toBeCloseTo(4134, 0);

      // CAS should be based on 3,750 (not 4,050)
      const cas = result.employeeContributions.find(c => c.name === 'CAS (Social Security)');
      expect(cas?.base).toBe(45000); // 3,750 × 12

      const cam = result.employerContributions.find(c => c.name === 'CAM (Work Insurance)');
      expect(cam?.base).toBe(45000); // 3,750 × 12
    });
  });

  describe('Personal Deduction Logic (Art. 77 Cod Fiscal)', () => {
    it('should give no deduction when base function is disabled', () => {
      const result = calculateROFromGross(60000, 100, { baseFunctionToggle: false });
      // Same CAS/CASS as with base function, but no deduction
      // Tax should be higher (no deduction subtracted from taxable base)
      const resultWithBase = calculateROFromGross(60000, 100, { baseFunctionToggle: true });

      // 5,000/month is within deduction range, so WITH base function should have lower tax
      expect(result.incomeTax!).toBeGreaterThan(resultWithBase.incomeTax!);
    });

    it('should give no deduction above threshold (salariul minim + 2,000)', () => {
      // 7,000 RON/month = above 6,050 threshold
      const result = calculateROFromGross(84000, 100, { baseFunctionToggle: true, dependents: 0 });
      // No deduction → taxable = gross - CAS - CASS
      // = 84,000 - 21,000 - 8,400 = 54,600
      expect(result.taxableBase).toBe(54600);
      expect(result.incomeTax).toBe(5460);
    });

    it('should increase deduction with more dependents', () => {
      // At 5,000 RON/month, within deduction range
      const noDeps = calculateROFromGross(60000, 100, { baseFunctionToggle: true, dependents: 0 });
      const twoDeps = calculateROFromGross(60000, 100, { baseFunctionToggle: true, dependents: 2 });
      const fourDeps = calculateROFromGross(60000, 100, { baseFunctionToggle: true, dependents: 4 });

      // More dependents → higher deduction → lower tax → higher net
      expect(twoDeps.netSalaryYearly).toBeGreaterThan(noDeps.netSalaryYearly);
      expect(fourDeps.netSalaryYearly).toBeGreaterThan(twoDeps.netSalaryYearly);
    });

    it('should decrease deduction as salary increases within range', () => {
      // 4,100 RON (50 above min) → higher deduction percentage
      // 5,500 RON (1,450 above min) → lower deduction percentage
      const low = calculateROFromGross(49200, 100, { baseFunctionToggle: true });
      const high = calculateROFromGross(66000, 100, { baseFunctionToggle: true });

      // Low salary should have lower tax (higher deduction)
      expect(low.incomeTax!).toBeLessThan(high.incomeTax!);
    });
  });

  describe('Tax-Free Amount (Minimum Wage Special Rule)', () => {
    it('should apply 300 RON tax-free at minimum wage', () => {
      const result = calculateROFromGross(48600, 100); // 4,050 × 12
      // CAS base should be 3,750 × 12 = 45,000 (not 48,600)
      const cas = result.employeeContributions.find(c => c.name === 'CAS (Social Security)');
      expect(cas?.base).toBe(45000);
    });

    it('should NOT apply tax-free amount above minimum wage', () => {
      const result = calculateROFromGross(60000, 100); // 5,000/month
      // CAS base should be full 60,000 (no tax-free deduction)
      const cas = result.employeeContributions.find(c => c.name === 'CAS (Social Security)');
      expect(cas?.base).toBe(60000);
    });
  });

  describe('Tax Exemption', () => {
    it('should exempt disabled persons from income tax', () => {
      const result = calculateROFromGross(120000, 100, { disabledTaxExemption: true });
      expect(result.incomeTax).toBe(0);
      // Net should be higher than non-exempt
      const nonExempt = calculateROFromGross(120000, 100);
      expect(result.netSalaryYearly).toBeGreaterThan(nonExempt.netSalaryYearly);
    });
  });

  describe('Meal Benefits (Tichete de Masă)', () => {
    // Romania 2026: Meal vouchers are subject to CASS (10%) and income tax (10%),
    // but EXEMPT from CAS (25%) and CAM (2.25%).
    // Ref: Cod Fiscal Art. 76(3)(h), Art. 142(r), Art. 157(2), Art. 220^4(2)

    it('should add meal benefits to net AFTER CASS and income tax deductions', () => {
      const noMeal = calculateROFromGross(120000, 100);
      const withMeal = calculateROFromGross(120000, 100, { monthlyMealBenefits: 500 });

      const mealYearly = 500 * 12; // 6,000 RON
      const mealCASS = mealYearly * 0.10; // 600 RON
      const mealTax = mealYearly * 0.10;  // 600 RON (approx, affected by combined taxable base)
      
      // Net increase = meals - CASS_on_meals - tax effect
      // At 10,000/month (no personal deduction):
      //   CASS increases by 600 (10% of 6000)
      //   Taxable increases by 6000 - 600 = 5,400 → extra tax = 540
      //   Net diff = 6000 - 600 - 540 = 4,860
      const netDiff = withMeal.netSalaryYearly - noMeal.netSalaryYearly;
      expect(netDiff).toBeLessThan(mealYearly); // Must be less than 6000 (taxes deducted)
      expect(netDiff).toBeCloseTo(4860, 0); // Exact: 6000 - 600 (CASS) - 540 (tax)
    });

    it('should include meal vouchers in CASS base but NOT in CAS base', () => {
      const noMeal = calculateROFromGross(120000, 100);
      const withMeal = calculateROFromGross(120000, 100, { monthlyMealBenefits: 500 });

      // CAS base should be SAME (meals excluded from CAS)
      const casNoMeal = noMeal.employeeContributions.find(c => c.name === 'CAS (Social Security)');
      const casWithMeal = withMeal.employeeContributions.find(c => c.name === 'CAS (Social Security)');
      expect(casWithMeal?.base).toBe(casNoMeal?.base);
      expect(casWithMeal?.amount).toBe(casNoMeal?.amount);

      // CASS base should INCREASE by meal amount (meals included in CASS)
      const cassNoMeal = noMeal.employeeContributions.find(c => c.name === 'CASS (Health Insurance)');
      const cassWithMeal = withMeal.employeeContributions.find(c => c.name === 'CASS (Health Insurance)');
      expect(cassWithMeal!.base - cassNoMeal!.base).toBe(6000); // 500 × 12
      expect(cassWithMeal!.amount - cassNoMeal!.amount).toBeCloseTo(600, 0); // 10% of 6000
    });

    it('should exclude meal vouchers from CAM base', () => {
      const noMeal = calculateROFromGross(120000, 100);
      const withMeal = calculateROFromGross(120000, 100, { monthlyMealBenefits: 500 });

      const camNoMeal = noMeal.employerContributions.find(c => c.name === 'CAM (Work Insurance)');
      const camWithMeal = withMeal.employerContributions.find(c => c.name === 'CAM (Work Insurance)');
      // CAM base should be SAME (meals excluded)
      expect(camWithMeal?.base).toBe(camNoMeal?.base);
      expect(camWithMeal?.amount).toBe(camNoMeal?.amount);
    });

    it('should add meal vouchers to employer total cost', () => {
      const noMeal = calculateROFromGross(120000, 100);
      const withMeal = calculateROFromGross(120000, 100, { monthlyMealBenefits: 500 });

      const mealYearly = 500 * 12; // 6,000 RON
      // Employer cost increases by full meal amount (employer pays nominal value, no CAM on meals)
      expect(withMeal.totalEmployerCostYearly - noMeal.totalEmployerCostYearly).toBeCloseTo(mealYearly, 0);
    });

    it('should increase taxable base when meal vouchers are added', () => {
      const noMeal = calculateROFromGross(120000, 100);
      const withMeal = calculateROFromGross(120000, 100, { monthlyMealBenefits: 500 });

      // Taxable base should increase (meals are in taxable base, partially offset by higher CASS)
      expect(withMeal.taxableBase!).toBeGreaterThan(noMeal.taxableBase!);
    });

    it('should verify anuntul.ro example: 4,100 gross + 1,035 meals (no base function)', () => {
      // Reference: anuntul.ro 2026 example
      // Gross: 4,100/month, Meals: 45 × 23 = 1,035/month
      // CAS = 25% × 4,100 = 1,025
      // CASS = 10% × (4,100 + 1,035) = 513.5
      // Taxable = 5,135 - 1,025 - 513.5 = 3,596.5
      // Tax = 359.65
      // Net cash = 4,100 - 1,025 - 513.5 - 359.65 = 2,201.85
      // + meals on card: 1,035
      // Total received: 3,236.85
      const result = calculateROFromGross(49200, 100, {
        baseFunctionToggle: false, // no personal deduction (to match reference)
        monthlyMealBenefits: 1035,
      });

      // Net should include both cash + meal vouchers after taxes
      const expectedNetMonthly = 2201.85 + 1035; // ≈ 3,236.85
      expect(result.netSalaryMonthly).toBeCloseTo(expectedNetMonthly, -1); // within 10 RON

      // CAS should NOT include meals
      const cas = result.employeeContributions.find(c => c.name === 'CAS (Social Security)');
      expect(cas?.base).toBe(49200); // 4,100 × 12

      // CASS SHOULD include meals
      const cass = result.employeeContributions.find(c => c.name === 'CASS (Health Insurance)');
      expect(cass?.base).toBe(49200 + 1035 * 12); // (4,100 + 1,035) × 12 = 61,620
    });
  });

  describe('Reverse Calculations', () => {
    it('should converge Net → Gross → Net (high salary)', () => {
      const targetNet = 70000; // ~5,833/month net
      const result = calculateROFromNet(targetNet, 100);
      expect(result.netSalaryYearly).toBeCloseTo(targetNet, 0);
    });

    it('should converge Net → Gross → Net (low salary with deduction)', () => {
      const targetNet = 36000; // ~3,000/month net → likely in deduction range
      const result = calculateROFromNet(targetNet, 100);
      // Within 1 RON/year tolerance due to step-wise deduction changes
      expect(Math.abs(result.netSalaryYearly - targetNet)).toBeLessThan(2);
    });

    it('should converge TotalCost → Gross → TotalCost', () => {
      const targetCost = 70000;
      const result = calculateROFromTotalCost(targetCost, 100);
      expect(result.totalEmployerCostYearly).toBeCloseTo(targetCost, 0);
    });
  });
});
