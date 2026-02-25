// ============================================================
// Unit Tests - Allocation Calculator
// Uses the exact scenario from the specification
// ============================================================

import { describe, it, expect } from 'vitest';
import { calculateAllocation } from '../services/calculatorAllocation';

describe('Allocation Calculator', () => {
  describe('Spec Example Scenario', () => {
    it('should match expected results exactly from the spec', () => {
      const result = calculateAllocation({
        salary100: 160000,
        engagementPercent: 80,
        employerMultiplier: 1.20,
        workingDaysPerYear: 220,
        currency: 'CHF',
        clients: [
          { clientName: 'Client A', allocationPercent: 60, dailyRate: 1250 },
          { clientName: 'Client B', allocationPercent: 20, dailyRate: 1250 },
        ],
      });

      // Spec expected values:
      expect(result.baseDailyCost).toBe(698.18);
      
      // Client A: baseline
      expect(result.clients[0].revenuePerDay).toBe(750);
      expect(result.clients[0].profitPerDay).toBe(51.82);
      expect(result.clients[0].isBaseline).toBe(true);
      
      // Client B: incremental
      expect(result.clients[1].revenuePerDay).toBe(250);
      expect(result.clients[1].profitPerDay).toBe(250);
      expect(result.clients[1].isBaseline).toBe(false);
      
      // Totals
      expect(result.totalDailyProfit).toBe(301.82);
      expect(result.annualProfit).toBe(66400.4);
    });
  });

  describe('Calculation Steps', () => {
    it('should compute engaged salary correctly', () => {
      const result = calculateAllocation({
        salary100: 160000,
        engagementPercent: 80,
        employerMultiplier: 1.20,
        workingDaysPerYear: 220,
        currency: 'CHF',
        clients: [{ clientName: 'A', allocationPercent: 80, dailyRate: 1000 }],
      });

      // EngagedSalary = 160000 * 0.80 = 128000
      expect(result.engagedSalary).toBe(128000);
      // EmployerCost = 128000 * 1.20 = 153600
      expect(result.employerCost).toBe(153600);
      // BaseDailyCost = 153600 / 220 = 698.18
      expect(result.baseDailyCost).toBe(698.18);
    });

    it('should identify baseline as highest revenue client', () => {
      const result = calculateAllocation({
        salary100: 100000,
        engagementPercent: 100,
        employerMultiplier: 1.0,
        workingDaysPerYear: 200,
        currency: 'EUR',
        clients: [
          { clientName: 'Low', allocationPercent: 30, dailyRate: 500 },
          { clientName: 'High', allocationPercent: 40, dailyRate: 800 },
          { clientName: 'Mid', allocationPercent: 30, dailyRate: 600 },
        ],
      });

      // High: 800 * 0.40 = 320 (highest revenue per day)
      expect(result.clients[1].isBaseline).toBe(true);
      expect(result.clients[0].isBaseline).toBe(false);
      expect(result.clients[2].isBaseline).toBe(false);
    });
  });

  describe('Validation', () => {
    it('should throw when allocation exceeds engagement', () => {
      expect(() => calculateAllocation({
        salary100: 100000,
        engagementPercent: 80,
        employerMultiplier: 1.2,
        workingDaysPerYear: 220,
        currency: 'CHF',
        clients: [
          { clientName: 'A', allocationPercent: 50, dailyRate: 1000 },
          { clientName: 'B', allocationPercent: 40, dailyRate: 1000 },
        ],
      })).toThrow(/exceeds engagement/);
    });

    it('should allow total allocation equal to engagement', () => {
      expect(() => calculateAllocation({
        salary100: 100000,
        engagementPercent: 80,
        employerMultiplier: 1.2,
        workingDaysPerYear: 220,
        currency: 'CHF',
        clients: [
          { clientName: 'A', allocationPercent: 50, dailyRate: 1000 },
          { clientName: 'B', allocationPercent: 30, dailyRate: 1000 },
        ],
      })).not.toThrow();
    });
  });
});
