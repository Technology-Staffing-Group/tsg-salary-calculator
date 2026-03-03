// ============================================================
// Unit Tests - B2B Calculator
// ============================================================

import { describe, it, expect } from 'vitest';
import { calculateB2B } from '../services/calculatorB2B';

describe('B2B Calculator', () => {
  // ============================================================
  // TARGET_MARGIN mode
  // ============================================================
  describe('Target Margin Mode', () => {
    it('should compute client rate from target margin (no floor hit)', () => {
      const result = calculateB2B({
        costRate: 800,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'TARGET_MARGIN',
        targetMarginPercent: 20,
        minDailyMargin: 120,
        minDailyMarginCurrency: 'CHF',
      });

      // Client rate = 800 / (1 - 0.2) = 1000
      expect(result.clientRateDaily).toBe(1000);
      expect(result.marginAmount).toBe(200);
      expect(result.marginPercent).toBe(20);
      // 200 > 120, so floor not applied
      expect(result.minMarginFloorApplied).toBeUndefined();
    });

    it('should apply minimum margin floor when calculated margin is below floor (user example)', () => {
      // User example: cost = 200, margin 30% → calculated client = 285.71, margin = 85.71
      // 85.71 < 120, so floor kicks in: client = 200 + 120 = 320
      const result = calculateB2B({
        costRate: 200,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'TARGET_MARGIN',
        targetMarginPercent: 30,
        minDailyMargin: 120,
        minDailyMarginCurrency: 'CHF',
      });

      expect(result.minMarginFloorApplied).toBe(true);
      expect(result.clientRateDaily).toBe(320); // 200 + 120
      expect(result.marginAmount).toBe(120); // floor value
      expect(result.originalClientRateDaily).toBeCloseTo(285.71, 1);
      expect(result.originalMarginAmount).toBeCloseTo(85.71, 1);
      expect(result.minMarginFloorExplanation).toBeDefined();
      expect(result.minMarginFloorExplanation).toContain('120');
    });

    it('should convert floor from CHF to EUR using FX rates', () => {
      // Suppose 1 RON = 0.1877 CHF, 1 RON = 0.2012 EUR
      // 120 CHF → RON = 120 / 0.1877 = 639.32 RON → EUR = 639.32 × 0.2012 = 128.59 EUR
      const fxRates = { CHF: 0.1877, EUR: 0.2012, RON: 1 };
      const result = calculateB2B({
        costRate: 100,
        rateType: 'DAILY',
        costCurrency: 'EUR',
        pricingMode: 'TARGET_MARGIN',
        targetMarginPercent: 30,
        minDailyMargin: 120,
        minDailyMarginCurrency: 'CHF',
        fxRates,
      });

      // Converted floor: 120 CHF → ~128.59 EUR
      // Calculated margin: 100 / 0.7 = 142.86, margin = 42.86 < 128.59 → floor applied
      expect(result.minMarginFloorApplied).toBe(true);
      expect(result.minMarginFloorValue).toBeCloseTo(128.61, 0);
      // Client rate = 100 + ~128.61 ≈ 228.61
      expect(result.clientRateDaily).toBeCloseTo(228.61, 0);
    });

    it('should not apply floor when margin exceeds the floor', () => {
      const result = calculateB2B({
        costRate: 1000,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'TARGET_MARGIN',
        targetMarginPercent: 30,
        minDailyMargin: 120,
        minDailyMarginCurrency: 'CHF',
      });

      // 1000 / 0.7 = 1428.57, margin = 428.57 > 120
      expect(result.minMarginFloorApplied).toBeUndefined();
      expect(result.clientRateDaily).toBeCloseTo(1428.57, 1);
      expect(result.minMarginFloorValue).toBe(120);
    });

    it('should use default 120 CHF floor when not specified', () => {
      const result = calculateB2B({
        costRate: 200,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'TARGET_MARGIN',
        targetMarginPercent: 30,
      });

      // Floor defaults to 120 CHF, margin = 85.71 < 120 → floor applied
      expect(result.minMarginFloorApplied).toBe(true);
      expect(result.clientRateDaily).toBe(320);
    });

    it('should throw for margin >= 100%', () => {
      expect(() => calculateB2B({
        costRate: 800,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'TARGET_MARGIN',
        targetMarginPercent: 100,
      })).toThrow('Margin percent must be less than 100%');
    });
  });

  // ============================================================
  // CLIENT_RATE mode (unchanged)
  // ============================================================
  describe('Client Rate Mode', () => {
    it('should compute margin from client rate', () => {
      const result = calculateB2B({
        costRate: 800,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'CLIENT_RATE',
        clientRate: 1100,
      });

      expect(result.marginAmount).toBe(300);
      expect(result.marginPercent).toBeCloseTo(27.27, 1);
      expect(result.markupPercent).toBe(37.5);
    });
  });

  // ============================================================
  // CLIENT_BUDGET mode (new logic)
  // ============================================================
  describe('Client Budget Mode', () => {
    it('should compute max daily rate from budget (user example: 1300, 30%, 1.2)', () => {
      // Budget = 1300, Margin 30% = 390, Employer Cost = 910, / 1.2 = 758.33
      const result = calculateB2B({
        costRate: 0,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'CLIENT_BUDGET',
        clientDailyRate: 1300,
        budgetMarginPercent: 30,
        socialMultiplier: 1.2,
      });

      expect(result.budgetBreakdown).toBeDefined();
      expect(result.budgetBreakdown!.clientBudgetDaily).toBe(1300);
      expect(result.budgetBreakdown!.marginAmount).toBe(390);        // 1300 × 30%
      expect(result.budgetBreakdown!.employerCost).toBe(910);        // 1300 - 390
      expect(result.budgetBreakdown!.socialMultiplier).toBe(1.2);
      expect(result.budgetBreakdown!.maxDailyRate).toBeCloseTo(758.33, 1); // 910 / 1.2

      // The client rate is the budget, cost rate is the max daily rate
      expect(result.clientRateDaily).toBe(1300);
      expect(result.costRateDaily).toBeCloseTo(758.33, 1);
    });

    it('should use default margin 30% and multiplier 1.2 when not specified', () => {
      const result = calculateB2B({
        costRate: 0,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'CLIENT_BUDGET',
        clientDailyRate: 1000,
      });

      expect(result.budgetBreakdown!.budgetMarginPercent).toBe(30);
      expect(result.budgetBreakdown!.socialMultiplier).toBe(1.2);
      expect(result.budgetBreakdown!.marginAmount).toBe(300);
      expect(result.budgetBreakdown!.employerCost).toBe(700);
      expect(result.budgetBreakdown!.maxDailyRate).toBeCloseTo(583.33, 1);
    });

    it('should compute correct annual projections for budget mode', () => {
      const result = calculateB2B({
        costRate: 0,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'CLIENT_BUDGET',
        clientDailyRate: 1300,
        budgetMarginPercent: 30,
        socialMultiplier: 1.2,
        workingDaysPerYear: 220,
      });

      // Annual revenue = client rate (1300) × 220 = 286,000
      expect(result.annualRevenue).toBe(286000);
      // Annual cost = max daily rate (~758.33) × 220
      expect(result.annualCost).toBeCloseTo(758.33 * 220, 0);
      // Annual profit = revenue - cost
      expect(result.annualProfit).toBeCloseTo(286000 - 758.33 * 220, 0);
    });

    it('should handle custom social multiplier', () => {
      const result = calculateB2B({
        costRate: 0,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'CLIENT_BUDGET',
        clientDailyRate: 1000,
        budgetMarginPercent: 25,
        socialMultiplier: 1.15,
      });

      // Margin = 250, Employer Cost = 750, / 1.15 = 652.17
      expect(result.budgetBreakdown!.marginAmount).toBe(250);
      expect(result.budgetBreakdown!.employerCost).toBe(750);
      expect(result.budgetBreakdown!.maxDailyRate).toBeCloseTo(652.17, 1);
    });

    it('should throw for zero client budget', () => {
      expect(() => calculateB2B({
        costRate: 0,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'CLIENT_BUDGET',
        clientDailyRate: 0,
      })).toThrow('Client Budget (Daily Rate) must be greater than 0');
    });

    it('should throw for invalid social multiplier', () => {
      expect(() => calculateB2B({
        costRate: 0,
        rateType: 'DAILY',
        costCurrency: 'CHF',
        pricingMode: 'CLIENT_BUDGET',
        clientDailyRate: 1000,
        socialMultiplier: 0,
      })).toThrow('Social multiplier must be greater than 0');
    });
  });

  // ============================================================
  // General / Shared
  // ============================================================
  describe('General', () => {
    it('should convert hourly to daily rates', () => {
      const result = calculateB2B({
        costRate: 100,
        rateType: 'HOURLY',
        costCurrency: 'CHF',
        pricingMode: 'TARGET_MARGIN',
        targetMarginPercent: 20,
        hoursPerDay: 8,
        minDailyMargin: 0, // Disable floor for this test
      });

      expect(result.costRateDaily).toBe(800);
      expect(result.clientRateDaily).toBe(1000);
    });

    it('should compute annual projections', () => {
      const result = calculateB2B({
        costRate: 800,
        rateType: 'DAILY',
        costCurrency: 'EUR',
        pricingMode: 'CLIENT_RATE',
        clientRate: 1000,
        workingDaysPerYear: 220,
      });

      expect(result.annualRevenue).toBe(220000);
      expect(result.annualCost).toBe(176000);
      expect(result.annualProfit).toBe(44000);
    });
  });
});
