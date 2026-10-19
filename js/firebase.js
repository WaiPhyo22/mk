/**
 * Firebase initialisation (modular SDK loaded from Google's CDN — no build step).
 * Exports `db` (Firestore instance or null) and `isFirebaseConfigured`.
 */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';
import { FIREBASE_CONFIG, APP_CHECK_SITE_KEY } from './config.js';

export const isFirebaseConfigured = Boolean(
  FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.appId
);

let db = null;

if (isFirebaseConfigured) {
  try {
    const app = initializeApp(FIREBASE_CONFIG);

    if (APP_CHECK_SITE_KEY) {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true,
      });
    }

    db = getFirestore(app);
  } catch (err) {
    console.error('[firebase] initialisation failed:', err);
    db = null;
  }
}

export { db };
