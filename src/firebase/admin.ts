import * as admin from 'firebase-admin';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Initialize Firebase Admin SDK for server-side operations
 * This is used in API routes and server-side rendering
 */
function initializeFirebaseAdmin() {
  // Check if already initialized
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Initialize with service account credentials
  // You can either:
  // 1. Set GOOGLE_APPLICATION_CREDENTIALS env var to point to service account JSON
  // 2. Or provide credentials directly via FIREBASE_SERVICE_ACCOUNT_KEY env var
  
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      return initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hr-tumenresources',
      });
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      return initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hr-tumenresources',
      });
    } else {
      // For development: Initialize without credentials (works with emulator)
      return initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hr-tumenresources',
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    throw error;
  }
}

/**
 * Get Firestore instance for admin operations
 */
export function getFirebaseAdminFirestore() {
  const app = initializeFirebaseAdmin();
  return getFirestore(app);
}

/**
 * Get Firebase Admin Auth instance
 */
export function getFirebaseAdminAuth() {
  const app = initializeFirebaseAdmin();
  return admin.auth(app);
}

export default admin;
