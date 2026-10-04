// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "ΒΑΛΕ_ΤΟ_ΔΙΚΟ_ΣΟΥ_API_KEY_ΕΔΩ",
  authDomain: "xristofilakis-5b8e0.firebaseapp.com",
  databaseURL: "https://xristofilakis-5b8e0-default-rtdb.firebaseio.com",
  projectId: "xristofilakis-5b8e0",
  storageBucket: "xristofilakis-5b8e0.appspot.com",
  messagingSenderId: "ΒΑΛΕ_ΤΟ_SENDER_ID",
  appId: "ΒΑΛΕ_ΤΟ_APP_ID"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);