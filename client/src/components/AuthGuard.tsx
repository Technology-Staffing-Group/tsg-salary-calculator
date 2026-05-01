// ============================================================
// AuthGuard — blocks the app until the user is signed in via
// Firebase Authentication (email + password).
// ============================================================

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from '../config/firebase';

// ---- Reactive current-user hook ----
//
// onAuthStateChanged is the single source of truth. We expose it
// to React components via useSyncExternalStore so any component
// (App header, mode components, etc.) can read the live user
// without prop-drilling.
let currentUser: User | null = auth.currentUser;
const listeners = new Set<() => void>();

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  listeners.forEach((l) => l());
});

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): User | null {
  return currentUser;
}

export function useCurrentUser(): User | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged will flip the AuthGuard to authenticated.
    } catch (err: any) {
      const code = err?.code as string | undefined;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Invalid email or password.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please try again.');
      } else {
        setError(err?.message || 'Sign-in failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-10 max-w-sm w-full">
        {/* TSG branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-tsg-red/10 mb-4">
            <svg className="w-8 h-8 text-tsg-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">TSG Salary Calculator</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tsg-red/40 focus:border-tsg-red"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tsg-red/40 focus:border-tsg-red"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-tsg-red hover:bg-tsg-red/90 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <p className="text-[11px] text-gray-400 mt-5 text-center">
          Access is restricted to authorised TSG users.<br />
          Contact IT if you cannot sign in.
        </p>
      </div>
    </div>
  );
}

interface Props { children: React.ReactNode; }

export default function AuthGuard({ children }: Props) {
  // Until the first onAuthStateChanged callback fires, we don't
  // know whether the user has a persisted session. Show a spinner
  // for that brief window so we don't flash the login page.
  const [resolved, setResolved] = useState<boolean>(false);
  const user = useCurrentUser();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => setResolved(true));
    return unsub;
  }, []);

  if (!resolved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-tsg-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }
  return <>{children}</>;
}
