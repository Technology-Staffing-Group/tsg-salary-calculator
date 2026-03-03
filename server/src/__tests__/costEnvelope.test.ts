// ============================================================
// Unit Tests - Cost Envelope (TOTAL_COST from Client Daily Rate)
// Tests the unified calculateEmployee function with client rate fields
// ============================================================

import { describe, it, expect } from 'vitest';
import { calculateEmployee } from '../services/calculatorEmployee';
import type { EmployeeInput, EmployeeResult } from '../config/countries';

describe('Cost Envelope (TOTAL_COST from Client Daily Rate)', () => {
  describe('Switzerland (CH)', () => {
    it('should compute cost envelope for 1,200 CHF/day, 30% margin, 100% occupation', () => {
      const input: EmployeeInput = {
        country: 'CH',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 100,
        clientDailyRate: 1200,
        marginPercent: 30,
        workingDaysPerYear: 220,
        employeeAge: 35,
      };

      const result = calculateEmployee(input);

      // Cost envelope calculations
      expect(result.costEnvelope).toBeDefined();
      expect(result.costEnvelope!.clientDailyRate).toBe(1200);
      expect(result.costEnvelope!.marginPercent).toBe(30);
      expect(result.costEnvelope!.workingDays).toBe(220);
      expect(result.costEnvelope!.annualRevenue).toBe(264000);   // 1200 × 220
      expect(result.costEnvelope!.marginAmount).toBe(79200);     // 264000 × 30%
      expect(result.costEnvelope!.totalEmployerCostEnvelope).toBe(184800); // 264000 - 79200
      expect(result.costEnvelope!.dailyCostRate).toBe(840);      // 184800 / 220
      expect(result.costEnvelope!.dailyMargin).toBe(360);        // 79200 / 220

      // Total employer cost should match the envelope
      expect(result.totalEmployerCostYearly).toBeCloseTo(184800, 0);

      // Gross should be less than total employer cost
      expect(result.grossSalaryYearly).toBeLessThan(184800);
      expect(result.grossSalaryYearly).toBeGreaterThan(150000);

      // Net should be less than gross
      expect(result.netSalaryYearly).toBeLessThan(result.grossSalaryYearly);
      expect(result.netSalaryYearly).toBeGreaterThan(130000);

      expect(result.currency).toBe('CHF');
      expect(result.country).toBe('CH');
    });

    it('should adjust working days by occupation rate (80%)', () => {
      const input: EmployeeInput = {
        country: 'CH',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 80,
        clientDailyRate: 1200,
        marginPercent: 30,
        workingDaysPerYear: 220,
        employeeAge: 35,
      };

      const result = calculateEmployee(input);

      // Working days adjusted: 220 × 80% = 176
      expect(result.costEnvelope!.workingDays).toBe(176);
      // Revenue: 1200 × 176 = 211,200
      expect(result.costEnvelope!.annualRevenue).toBe(211200);
      // Margin: 211200 × 30% = 63,360
      expect(result.costEnvelope!.marginAmount).toBe(63360);
      // Total cost: 211200 - 63360 = 147,840
      expect(result.costEnvelope!.totalEmployerCostEnvelope).toBe(147840);

      expect(result.totalEmployerCostYearly).toBeCloseTo(147840, 0);
    });

    it('should use default margin of 30% when not provided', () => {
      const input: EmployeeInput = {
        country: 'CH',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 100,
        clientDailyRate: 1000,
        workingDaysPerYear: 220,
        employeeAge: 40,
      };

      const result = calculateEmployee(input);

      expect(result.costEnvelope!.marginPercent).toBe(30); // Default
      expect(result.costEnvelope!.annualRevenue).toBe(220000);
      expect(result.costEnvelope!.marginAmount).toBe(66000);
      expect(result.costEnvelope!.totalEmployerCostEnvelope).toBe(154000);
    });

    it('should use default working days from config when not provided', () => {
      const input: EmployeeInput = {
        country: 'CH',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 100,
        clientDailyRate: 1000,
        marginPercent: 25,
        employeeAge: 30,
      };

      const result = calculateEmployee(input);

      // Default working days for CH is 220
      expect(result.costEnvelope!.workingDays).toBe(220);
    });

    it('should handle 0% margin', () => {
      const input: EmployeeInput = {
        country: 'CH',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 100,
        clientDailyRate: 1000,
        marginPercent: 0,
        workingDaysPerYear: 220,
        employeeAge: 30,
      };

      const result = calculateEmployee(input);

      expect(result.costEnvelope!.marginAmount).toBe(0);
      expect(result.costEnvelope!.totalEmployerCostEnvelope).toBe(220000); // Full revenue = cost
      expect(result.totalEmployerCostYearly).toBeCloseTo(220000, 0);
    });
  });

  describe('Romania (RO)', () => {
    it('should compute cost envelope for 500 RON/day, 25% margin', () => {
      const input: EmployeeInput = {
        country: 'RO',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 100,
        clientDailyRate: 500,
        marginPercent: 25,
        workingDaysPerYear: 220,
      };

      const result = calculateEmployee(input);

      // Revenue: 500 × 220 = 110,000
      expect(result.costEnvelope!.annualRevenue).toBe(110000);
      // Margin: 110000 × 25% = 27,500
      expect(result.costEnvelope!.marginAmount).toBe(27500);
      // Total cost: 110000 - 27500 = 82,500
      expect(result.costEnvelope!.totalEmployerCostEnvelope).toBe(82500);

      expect(result.totalEmployerCostYearly).toBeCloseTo(82500, 0);
      expect(result.currency).toBe('RON');
      expect(result.country).toBe('RO');
    });

    it('should work with meal benefits in cost envelope mode', () => {
      const input: EmployeeInput = {
        country: 'RO',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 100,
        clientDailyRate: 500,
        marginPercent: 25,
        workingDaysPerYear: 220,
        advancedOptions: {
          monthlyMealBenefits: 500,
          baseFunctionToggle: false,
          disabledTaxExemption: false,
          dependents: 0,
        },
      };

      const result = calculateEmployee(input);

      expect(result.costEnvelope!.totalEmployerCostEnvelope).toBe(82500);
      // With meals, total employer cost should still match (meals included in total cost)
      expect(result.totalEmployerCostYearly).toBeCloseTo(82500, 0);
      expect(result.currency).toBe('RON');
    });
  });

  describe('Spain (ES)', () => {
    it('should compute cost envelope for 800 EUR/day, 20% margin', () => {
      const input: EmployeeInput = {
        country: 'ES',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 100,
        clientDailyRate: 800,
        marginPercent: 20,
        workingDaysPerYear: 220,
      };

      const result = calculateEmployee(input);

      // Revenue: 800 × 220 = 176,000
      expect(result.costEnvelope!.annualRevenue).toBe(176000);
      // Margin: 176000 × 20% = 35,200
      expect(result.costEnvelope!.marginAmount).toBe(35200);
      // Total cost: 176000 - 35200 = 140,800
      expect(result.costEnvelope!.totalEmployerCostEnvelope).toBe(140800);

      expect(result.totalEmployerCostYearly).toBeCloseTo(140800, 0);
      expect(result.currency).toBe('EUR');
      expect(result.country).toBe('ES');
    });
  });

  describe('Validation', () => {
    it('should ignore negative client daily rate and fall through to standard TOTAL_COST', () => {
      // When clientDailyRate <= 0, the cost envelope path is not triggered.
      // The standard TOTAL_COST path is used with amount=0 which may throw or compute a zero salary.
      const input: EmployeeInput = {
        country: 'CH',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 184800, // provide a valid amount so standard path works
        occupationRate: 100,
        clientDailyRate: -100,
        marginPercent: 30,
        employeeAge: 30,
      };

      const result = calculateEmployee(input);
      // No cost envelope because clientDailyRate <= 0
      expect(result.costEnvelope).toBeUndefined();
      expect(result.totalEmployerCostYearly).toBeCloseTo(184800, 0);
    });

    it('should throw error for margin >= 100%', () => {
      const input: EmployeeInput = {
        country: 'CH',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 100,
        clientDailyRate: 1000,
        marginPercent: 100,
        employeeAge: 30,
      };

      expect(() => calculateEmployee(input)).toThrow('Margin must be between 0% and 99%');
    });

    it('should throw error for negative margin', () => {
      const input: EmployeeInput = {
        country: 'CH',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 0,
        occupationRate: 100,
        clientDailyRate: 1000,
        marginPercent: -5,
        employeeAge: 30,
      };

      expect(() => calculateEmployee(input)).toThrow('Margin must be between 0% and 99%');
    });
  });

  describe('Non-cost-envelope TOTAL_COST (manual amount)', () => {
    it('should still work when clientDailyRate is not provided (standard TOTAL_COST)', () => {
      const input: EmployeeInput = {
        country: 'CH',
        calculationBasis: 'TOTAL_COST',
        period: 'YEARLY',
        amount: 184800,
        occupationRate: 100,
        employeeAge: 35,
      };

      const result = calculateEmployee(input);

      // Should NOT have cost envelope
      expect(result.costEnvelope).toBeUndefined();
      expect(result.totalEmployerCostYearly).toBeCloseTo(184800, 0);
    });
  });
});
