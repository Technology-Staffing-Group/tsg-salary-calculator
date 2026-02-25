// ============================================================
// TSG Salary & Cost Calculator - Unified Employee Calculator
// Routes calculations to the correct country engine
// ============================================================

import {
  EmployeeInput,
  EmployeeResult,
  CHAdvancedOptions,
  ROAdvancedOptions,
  ESAdvancedOptions,
} from '../config/countries';
import { round2 } from '../utils/math';
import {
  calculateCHFromGross,
  calculateCHFromNet,
  calculateCHFromTotalCost,
} from './calculatorCH';
import {
  calculateROFromGross,
  calculateROFromNet,
  calculateROFromTotalCost,
} from './calculatorRO';
import {
  calculateESFromGross,
  calculateESFromNet,
  calculateESFromTotalCost,
} from './calculatorES';

export function calculateEmployee(input: EmployeeInput): EmployeeResult {
  const { country, calculationBasis, period, amount, occupationRate, advancedOptions, clientDailyRate } = input;

  // Convert monthly to yearly if needed
  let yearlyAmount = period === 'MONTHLY' ? amount * 12 : amount;

  // Adjust for occupation rate if calculating from gross or net
  // The calculation engines work with the actual yearly amount
  // Occupation rate affects working days for daily rate calculation

  let result: EmployeeResult;

  switch (country) {
    case 'CH': {
      const advanced = (advancedOptions ?? {}) as CHAdvancedOptions;
      switch (calculationBasis) {
        case 'GROSS':
          result = calculateCHFromGross(yearlyAmount, occupationRate, advanced);
          break;
        case 'NET':
          result = calculateCHFromNet(yearlyAmount, occupationRate, advanced);
          break;
        case 'TOTAL_COST':
          result = calculateCHFromTotalCost(yearlyAmount, occupationRate, advanced);
          break;
        default:
          throw new Error(`Invalid calculation basis: ${calculationBasis}`);
      }
      break;
    }

    case 'RO': {
      const advanced = (advancedOptions ?? {}) as ROAdvancedOptions;
      switch (calculationBasis) {
        case 'GROSS':
          result = calculateROFromGross(yearlyAmount, occupationRate, advanced);
          break;
        case 'NET':
          result = calculateROFromNet(yearlyAmount, occupationRate, advanced);
          break;
        case 'TOTAL_COST':
          result = calculateROFromTotalCost(yearlyAmount, occupationRate, advanced);
          break;
        default:
          throw new Error(`Invalid calculation basis: ${calculationBasis}`);
      }
      break;
    }

    case 'ES': {
      const advanced = (advancedOptions ?? {}) as ESAdvancedOptions;
      switch (calculationBasis) {
        case 'GROSS':
          result = calculateESFromGross(yearlyAmount, occupationRate, advanced);
          break;
        case 'NET':
          result = calculateESFromNet(yearlyAmount, occupationRate, advanced);
          break;
        case 'TOTAL_COST':
          result = calculateESFromTotalCost(yearlyAmount, occupationRate, advanced);
          break;
        default:
          throw new Error(`Invalid calculation basis: ${calculationBasis}`);
      }
      break;
    }

    default:
      throw new Error(`Unsupported country: ${country}`);
  }

  // Add margin vs client daily rate if provided
  if (clientDailyRate && clientDailyRate > 0) {
    result.marginVsClientRate = round2(clientDailyRate - result.dailyRate);
  }

  return result;
}
