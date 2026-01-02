'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Persistent singleton to prevent re-initialization during HMR
let cachedSdks: ReturnType<typeof getSdks> | null = null;

export function initializeFirebase() {
  if (cachedSdks) return cachedSdks;

  if (!getApps().length) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
    cachedSdks = getSdks(firebaseApp);
  } else {
    cachedSdks = getSdks(getApp());
  }

  return cachedSdks;
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Initialize Firestore with proper cache settings to prevent internal errors
  let firestore;
  try {
    // Check if firestore is already initialized to avoid "already exists" error
    firestore = getFirestore(firebaseApp);
  } catch (e) {
    // Not initialized yet, or failed. Actually, getFirestore() doesn't throw if not initialized, it initializes with defaults.
    // However, we WANT customized settings. 
    // The safest way in modular SDK to enforce settings is use initializeFirestore eagerly if we can't detect it.
    // But since getFirestore returns the existing instance if any, we might be stuck with default settings if we are not careful.

    // In many setups, calling initializeFirestore twice throws.
    // So we try initializeFirestore first. If it fails, we fall back to getFirestore.

    // Actually, the previous logic was: try get, if fail init. 
    // But getFirestore() usually SUCCEEDS and uses default persistence (IndexedDB) which causes the error you saw.

    // So we FLIP it: Try to initialize with Memory Cache first.
  }

  // Improved logic:
  try {
    // Force memory cache to avoid "Unexpected state" in dev environment
    firestore = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache()
    });
  } catch (e: any) {
    // If it says "Firestore has already been started", then we just get the existing instance
    if (e.code === 'failed-precondition' || e.message?.includes('already been started')) {
      firestore = getFirestore(firebaseApp);
    } else {
      console.error("Error initializing Firestore:", e);
      throw e;
    }
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore,
    storage: getStorage(firebaseApp),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
