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
    firestore = getFirestore(firebaseApp);
  } catch (e) {
    // If getFirestore fails, initialize with explicit cache settings
    firestore = initializeFirestore(firebaseApp, {
      localCache: memoryLocalCache()
    });
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
