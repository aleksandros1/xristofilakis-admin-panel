import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyDYDUsD6i_TIc4nT19byGRdE-EnErCmRAM",
  authDomain: "xristofilakis-5b8e0.firebaseapp.com",
  databaseURL: "https://xristofilakis-5b8e0-default-rtdb.firebaseio.com",
  projectId: "xristofilakis-5b8e0",
  storageBucket: "xristofilakis-5b8e0.firebasestorage.app",
  messagingSenderId: "797984657990",
  appId: "1:797984657990:web:13f8d599ec864788b37047"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);