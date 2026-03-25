// ============================================================
// API Service — all backend calls, with session Bearer token
// ============================================================

const API_BASE = '/api';
const TOKEN_KEY = 'tsg_auth_token';

async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { headers, ...options });

  // Session expired or invalid — clear token and reload to show login page
  if (res.status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    window.location.reload();
    throw new Error('Session expired. Please sign in again.');
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server error (${res.status}). Please try again or contact support.`);
  }
  if (!data.success) throw new Error(data.error || 'API request failed');
  return data.data;
}

export const api = {
  calculateEmployee: (input: any) =>
    apiCall('/calculate/employee', { method: 'POST', body: JSON.stringify(input) }),

  calculateB2B: (input: any) =>
    apiCall('/calculate/b2b', { method: 'POST', body: JSON.stringify(input) }),

  calculateAllocation: (input: any) =>
    apiCall('/calculate/allocation', { method: 'POST', body: JSON.stringify(input) }),

  getFXRates: () => apiCall('/fx/rates'),

  convertCurrency: (amount: number, from: string, to: string) =>
    apiCall('/fx/convert', { method: 'POST', body: JSON.stringify({ amount, from, to }) }),

  refreshFXRates: () => apiCall('/fx/refresh', { method: 'POST' }),

  getWithholdingCodes: () => apiCall('/withholding/geneva/codes'),

  calculateWithholding: (input: any) =>
    apiCall('/withholding/geneva/simple', { method: 'POST', body: JSON.stringify(input) }),

  getWithholdingCodesVD: () => apiCall('/withholding/vaud/codes'),

  calculateWithholdingVD: (input: any) =>
    apiCall('/withholding/vaud/simple', { method: 'POST', body: JSON.stringify(input) }),
};
