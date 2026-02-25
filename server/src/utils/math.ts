// ============================================================
// TSG Salary & Cost Calculator - Rounding Utilities
// ============================================================

/** Round to 2 decimal places as specified in the spec */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
