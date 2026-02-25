// ============================================================
// Unit Tests - Spain (ES) Calculation Engine
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  calculateESFromGross,
  calculateESFromNet,
  calculateESFromTotalCost,
} from '../services/calculatorES';

describe('Spain (ES) Calculator', () => {
  describe('Forward Calculation (Gross → Net)', () => {
    it('should calculate correctly for standard gross salary', () => {
      const result = calculateESFromGross(40000, 100);
      
      expect(result.grossSalaryYearly).toBe(40000);
      expect(result.currency).toBe('EUR');
      expect(result.country).toBe('ES');
      
      // Net should be less than gross (after contributions + IRPF)
      expect(result.netSalaryYearly).toBeLessThan(40000);
      expect(result.netSalaryYearly).toBeGreaterThan(20000);
      
      // Total cost should be more than gross
      expect(result.totalEmployerCostYearly).toBeGreaterThan(40000);
    });

    it('should apply contribution base minimum', () => {
      // Very low salary: 10000/yr = 833/month which is below min 1323
      const result = calculateESFromGross(10000, 100);
      
      // Contributions should be based on min base (1323*12 = 15876), not actual salary
      const cc = result.employeeContributions.find(c => c.name === 'Common Contingencies');
      expect(cc?.base).toBe(15876);
    });

    it('should apply contribution base maximum', () => {
      // High salary: 100000/yr = 8333/month which exceeds max 4720.50
      const result = calculateESFromGross(100000, 100);
      
      // Contributions should be based on max base (4720.50*12 = 56646)
      const cc = result.employeeContributions.find(c => c.name === 'Common Contingencies');
      expect(cc?.base).toBe(56646);
    });

    it('should compute progressive IRPF', () => {
      const low = calculateESFromGross(20000, 100);
      const high = calculateESFromGross(80000, 100);
      
      // Higher salary should have higher effective tax rate
      const lowRate = (low.incomeTax! / low.taxableBase!) * 100;
      const highRate = (high.incomeTax! / high.taxableBase!) * 100;
      expect(highRate).toBeGreaterThan(lowRate);
    });

    it('should include all employer contributions', () => {
      const result = calculateESFromGross(40000, 100);
      
      const contribNames = result.employerContributions.map(c => c.name);
      expect(contribNames).toContain('Common Contingencies');
      expect(contribNames).toContain('Unemployment');
      expect(contribNames).toContain('Professional Training');
      expect(contribNames).toContain('FOGASA');
    });
  });

  describe('Reverse Calculations', () => {
    it('should converge Net → Gross → Net', () => {
      const targetNet = 30000;
      const result = calculateESFromNet(targetNet, 100);
      expect(result.netSalaryYearly).toBeCloseTo(targetNet, 0);
    });

    it('should converge TotalCost → Gross → TotalCost', () => {
      const targetCost = 50000;
      const result = calculateESFromTotalCost(targetCost, 100);
      expect(result.totalEmployerCostYearly).toBeCloseTo(targetCost, 0);
    });
  });
});
