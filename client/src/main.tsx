import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import App from './App';
import { msalConfig } from './authConfig';
import './index.css';

// Single instance shared by the entire app
const msalInstance = new PublicClientApplication(msalConfig);

// Keep active account in sync when login/logout events happen
msalInstance.addEventCallback((event) => {
  if (
    event.eventType === EventType.LOGIN_SUCCESS ||
    event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS ||
    event.eventType === EventType.SSO_SILENT_SUCCESS
  ) {
    const payload = event.payload as any;
    if (payload?.account) {
      msalInstance.setActiveAccount(payload.account);
    }
  }
});

// MSAL v4 requires initialize() before the app renders.
// This processes the redirect response from Microsoft (handleRedirectPromise),
// without it the auth code in the URL is ignored and the user stays on the login page.
msalInstance.initialize().then(() => {
  // Restore active account from cache after initialization
  if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
    msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </React.StrictMode>
  );
});
