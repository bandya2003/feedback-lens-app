
/**
 * @fileOverview Firebase Admin SDK initialization.
 * This needs to be done once per application instance.
 */
import * as _admin from 'firebase-admin';

// Check if Firebase Admin SDK has already been initialized
if (!_admin.apps.length) {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    _admin.initializeApp({
      credential: _admin.credential.applicationDefault(),
    });
    console.log('Firebase Admin SDK initialized with Application Default Credentials.');
  } else if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    _admin.initializeApp({
      credential: _admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace newline characters for private key if stored in env var
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
    console.log('Firebase Admin SDK initialized with explicit credentials from env vars.');
  } else {
    console.warn(
      'Firebase Admin SDK not initialized. Missing GOOGLE_APPLICATION_CREDENTIALS or specific FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY environment variables.'
    );
  }
} else {
  console.log('Firebase Admin SDK already initialized.');
}

export const admin = _admin;
export const firestore = _admin.firestore();
