/**
 * Firebase config from env. Set NEXT_PUBLIC_FIREBASE_* in .env.local.
 * Fallbacks use hr-tumenresources.
 */
const env = typeof process !== 'undefined' ? process.env : ({} as NodeJS.ProcessEnv);

export const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyAZqPqhQUOiKtMJLoj63DrdVjVsDz7SFPE",
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "hr-tumenresources.firebaseapp.com",
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "hr-tumenresources",
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "hr-tumenresources.firebasestorage.app",
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "791012909912",
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:791012909912:web:67365b08fc6defa07e7b2d",
  measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-00DJS41LC1",
};

