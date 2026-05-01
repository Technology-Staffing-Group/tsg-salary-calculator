// ============================================================
// Firestore writes — audit logs and saved calculations.
//
// All writes are fire-and-forget: callers do NOT await them in
// the UI hot path. Failures are logged and swallowed so a flaky
// network or Firestore outage cannot break a calculation or PDF
// export.
// ============================================================

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export type AuditAction = 'pdf_export';
export type CalculationMode = 'employee' | 'b2b' | 'allocation';

interface AuditEvent {
  action: AuditAction;
  mode: CalculationMode;
  country?: string;
}

interface SavedCalculation {
  mode: CalculationMode;
  country?: string;
  inputs: Record<string, unknown>;
  results: Record<string, unknown>;
}

// Strip PII (employee name, date of birth) from anything we
// persist. The user explicitly excluded these fields from
// Firestore. Operates recursively on nested objects/arrays.
const PII_KEYS = new Set(['employeeName', 'dateOfBirth']);

function stripPII<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripPII) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEYS.has(k)) continue;
      out[k] = stripPII(v);
    }
    return out as T;
  }
  return value;
}

function userFields() {
  const u = auth.currentUser;
  if (!u) return null;
  // Per the project decision: store both email (as userId) and uid
  // so we can switch the primary identifier later without a
  // migration. Email is preferred for human-readable audit logs;
  // uid is stable across email changes.
  return { userId: u.email ?? '', uid: u.uid };
}

export function logAuditEvent(event: AuditEvent): void {
  const ids = userFields();
  if (!ids) return; // Not signed in — nothing to log.

  const payload = {
    ...ids,
    action: event.action,
    mode: event.mode,
    ...(event.country ? { country: event.country } : {}),
    timestamp: serverTimestamp(),
  };

  void addDoc(collection(db, 'audit_logs'), payload).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[firestore] audit_logs write failed:', err);
  });
}

export function saveCalculation(calc: SavedCalculation): void {
  const ids = userFields();
  if (!ids) return;

  const payload = {
    ...ids,
    mode: calc.mode,
    ...(calc.country ? { country: calc.country } : {}),
    inputs: stripPII(calc.inputs),
    results: stripPII(calc.results),
    timestamp: serverTimestamp(),
  };

  void addDoc(collection(db, 'calculations'), payload).catch((err) => {
    // eslint-disable-next-line no-console
    console.warn('[firestore] calculations write failed:', err);
  });
}
