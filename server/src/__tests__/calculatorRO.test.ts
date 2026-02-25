// ============================================================
// Unit Tests - Romania (RO) Calculation Engine
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  calculateROFromGross,
  calculateROFromNet,
  calculateROFromTotalCost,
} from '../services/calculatorRO';

describe('Romania (RO) Calculator', () => {
  describe('Forward Calculation (Gross → Net)', () => {
    it('should calculate correctly for standard gross salary', () => {
      const result = calculateROFromGross(60000, 100);
      
      expect(result.grossSalaryYearly).toBe(60000);
      expect(result.currency).toBe('RON');
      expect(result.country).toBe('RO');
      
      // CAS: 25% of 60000 = 15000
      const cas = result.employeeContributions.find(c => c.name === 'CAS (Social Security)');
      expect(cas?.amount).toBe(15000);
      
      // CASS: 10% of 60000 = 6000
      const cass = result.employeeContributions.find(c => c.name === 'CASS (Health Insurance)');
      expect(cass?.amount).toBe(6000);
      
      // CAM: 2.25% of 60000 = 1350
      const cam = result.employerContributions.find(c => c.name === 'CAM (Work Insurance)');
      expect(cam?.amount).toBe(1350);
    });

    it('should apply personal deduction with base function enabled', () => {
      const result = calculateROFromGross(60000, 100, { baseFunctionToggle: true });
      
      // Taxable = 60000 - 15000(CAS) - 6000(CASS) - 6120(510*12 personal deduction)
      expect(result.taxableBase).toBe(32880);
      // Tax = 10% of 32880 = 3288
      expect(result.incomeTax).toBe(3288);
    });

    it('should apply dependent deductions', () => {
      const noDeps = calculateROFromGross(60000, 100, { baseFunctionToggle: true, dependents: 0 });
      const twoDeps = calculateROFromGross(60000, 100, { baseFunctionToggle: true, dependents: 2 });
      
      // 2 dependents = 110*2*12 = 2640 extra deduction
      expect(noDeps.taxableBase! - twoDeps.taxableBase!).toBeCloseTo(2640, 0);
    });

    it('should exempt disabled persons from income tax', () => {
      const result = calculateROFromGross(60000, 100, { disabledTaxExemption: true });
      expect(result.incomeTax).toBe(0);
    });

    it('should add non-taxable meal benefits to net', () => {
      const noMeal = calculateROFromGross(60000, 100);
      const withMeal = calculateROFromGross(60000, 100, { monthlyMealBenefits: 500 });
      
      // Should add 500*12 = 6000 to net
      expect(withMeal.netSalaryYearly - noMeal.netSalaryYearly).toBeCloseTo(6000, 0);
    });
  });

  describe('Reverse Calculations', () => {
    it('should converge Net → Gross → Net', () => {
      const targetNet = 40000;
      const result = calculateROFromNet(targetNet, 100);
      expect(result.netSalaryYearly).toBeCloseTo(targetNet, 0);
    });

    it('should converge TotalCost → Gross → TotalCost', () => {
      const targetCost = 70000;
      const result = calculateROFromTotalCost(targetCost, 100);
      expect(result.totalEmployerCostYearly).toBeCloseTo(targetCost, 0);
    });
  });
});
