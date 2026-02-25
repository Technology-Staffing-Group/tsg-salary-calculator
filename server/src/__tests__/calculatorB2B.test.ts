// ============================================================
// Unit Tests - B2B Calculator
// ============================================================

import { describe, it, expect } from 'vitest';
import { calculateB2B } from '../services/calculatorB2B';

describe('B2B Calculator', () => {
  it('should compute client rate from target margin', () => {
    const result = calculateB2B({
      costRate: 800,
      rateType: 'DAILY',
      costCurrency: 'CHF',
      pricingMode: 'TARGET_MARGIN',
      targetMarginPercent: 20,
    });

    // Client rate = 800 / (1 - 0.2) = 1000
    expect(result.clientRateDaily).toBe(1000);
    expect(result.marginAmount).toBe(200);
    expect(result.marginPercent).toBe(20);
  });

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

  it('should compute rate from client budget', () => {
    const result = calculateB2B({
      costRate: 800,
      rateType: 'DAILY',
      costCurrency: 'CHF',
      pricingMode: 'CLIENT_BUDGET',
      clientBudget: 220000,
      budgetDays: 220,
    });

    expect(result.clientRateDaily).toBe(1000);
    expect(result.marginAmount).toBe(200);
  });

  it('should convert hourly to daily rates', () => {
    const result = calculateB2B({
      costRate: 100,
      rateType: 'HOURLY',
      costCurrency: 'CHF',
      pricingMode: 'TARGET_MARGIN',
      targetMarginPercent: 20,
      hoursPerDay: 8,
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
