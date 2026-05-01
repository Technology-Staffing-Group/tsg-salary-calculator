// ============================================================
// Firebase initialization — Auth + Firestore
//
// Config is read from Vite environment variables (VITE_FIREBASE_*).
// These are baked into the bundle at build time; in Vercel they
// must be set under Project Settings → Environment Variables
// before the deploy starts. See client/.env.example for the full
// list of required variables.
// ============================================================

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Surface a clear error in dev if env vars are missing — otherwise
// Firebase fails with an opaque "auth/invalid-api-key".
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  // eslint-disable-next-line no-console
  console.error(
    '[firebase] Missing VITE_FIREBASE_* environment variables. ' +
    'Copy client/.env.example to client/.env and fill in the values from your Firebase project.'
  );
}

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);

// TODO: Add Microsoft SSO via Firebase + Entra ID
// (use OAuthProvider('microsoft.com') and signInWithPopup; configure
//  Microsoft as a sign-in provider in the Firebase console with the
//  Entra ID tenant ID before enabling here.)
