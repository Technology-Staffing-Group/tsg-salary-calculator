// ============================================================
// Unit Tests - Switzerland (CH) Calculation Engine
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  calculateCHFromGross,
  calculateCHFromNet,
  calculateCHFromTotalCost,
} from '../services/calculatorCH';

describe('Switzerland (CH) Calculator', () => {
  describe('Forward Calculation (Gross → Net & Total Cost)', () => {
    it('should calculate correctly for 100,000 CHF gross at 100%', () => {
      const result = calculateCHFromGross(100000, 100);
      
      expect(result.grossSalaryYearly).toBe(100000);
      expect(result.grossSalaryMonthly).toBeCloseTo(8333.33, 1);
      expect(result.netSalaryYearly).toBeGreaterThan(80000);
      expect(result.netSalaryYearly).toBeLessThan(100000);
      expect(result.totalEmployerCostYearly).toBeGreaterThan(100000);
      expect(result.currency).toBe('CHF');
      expect(result.country).toBe('CH');
    });

    it('should handle AC ceiling for high salaries', () => {
      const result = calculateCHFromGross(200000, 100);
      
      // AC should be capped at 148,200 for main rate
      const acContrib = result.employeeContributions.find(c => c.name === 'AC (Unemployment)');
      expect(acContrib).toBeDefined();
      expect(acContrib!.base).toBe(148200);
      
      // Should have solidarity AC above ceiling
      const solidarityContrib = result.employeeContributions.find(c => c.name === 'AC Solidarity');
      expect(solidarityContrib).toBeDefined();
      expect(solidarityContrib!.base).toBe(200000 - 148200);
    });

    it('should not include AC solidarity for salary below ceiling', () => {
      const result = calculateCHFromGross(100000, 100);
      const solidarityContrib = result.employeeContributions.find(c => c.name === 'AC Solidarity');
      expect(solidarityContrib).toBeUndefined();
    });

    it('should apply LPP caps in MANDATORY_BVG mode', () => {
      const result = calculateCHFromGross(150000, 100, { pensionPlanMode: 'MANDATORY_BVG' });
      const lpp = result.employeeContributions.find(c => c.name === 'LPP/BVG (Pension)');
      expect(lpp).toBeDefined();
      // Max insured = 90720 - 26460 = 64260
      expect(lpp!.base).toBe(64260);
    });

    it('should uncap LPP in SUPER_OBLIGATORY mode', () => {
      const result = calculateCHFromGross(150000, 100, { pensionPlanMode: 'SUPER_OBLIGATORY' });
      const lpp = result.employeeContributions.find(c => c.name === 'LPP/BVG (Pension)');
      expect(lpp).toBeDefined();
      // Uncapped: 150000 - 26460 = 123540
      expect(lpp!.base).toBe(123540);
    });

    it('should not apply LPP below minimum salary', () => {
      const result = calculateCHFromGross(20000, 100);
      const lpp = result.employeeContributions.find(c => c.name === 'LPP/BVG (Pension)');
      expect(lpp).toBeUndefined();
    });

    it('should adjust daily rate for occupation rate', () => {
      const full = calculateCHFromGross(100000, 100);
      const half = calculateCHFromGross(100000, 50);
      
      // Daily rate at 50% should be ~2x daily rate at 100%
      // because same cost over fewer working days
      expect(half.dailyRate).toBeCloseTo(full.dailyRate * 2, 0);
    });
  });

  describe('Reverse Calculation (Net → Gross)', () => {
    it('should converge: Net → Gross → Net should match', () => {
      const targetNet = 80000;
      const result = calculateCHFromNet(targetNet, 100);
      
      expect(result.netSalaryYearly).toBeCloseTo(targetNet, 0);
      expect(result.grossSalaryYearly).toBeGreaterThan(targetNet);
    });

    it('should converge for small net salaries', () => {
      const targetNet = 30000;
      const result = calculateCHFromNet(targetNet, 100);
      expect(result.netSalaryYearly).toBeCloseTo(targetNet, 0);
    });

    it('should converge for large net salaries', () => {
      const targetNet = 200000;
      const result = calculateCHFromNet(targetNet, 100);
      expect(result.netSalaryYearly).toBeCloseTo(targetNet, 0);
    });
  });

  describe('Reverse Calculation (Total Cost → Gross)', () => {
    it('should converge: TotalCost → Gross → TotalCost should match', () => {
      const targetCost = 120000;
      const result = calculateCHFromTotalCost(targetCost, 100);
      
      expect(result.totalEmployerCostYearly).toBeCloseTo(targetCost, 0);
      expect(result.grossSalaryYearly).toBeLessThan(targetCost);
    });
  });
});
