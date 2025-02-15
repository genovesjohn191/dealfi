import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBMSxw5dEt3p1aGEvZjtkMTsF38wYnxlP4",
  authDomain: "test-98573.firebaseapp.com",
  projectId: "test-98573",
  storageBucket: "test-98573.firebasestorage.app",
  messagingSenderId: "200033968119",
  appId: "1:200033968119:web:6d09326565a2e31180d8f2",
  measurementId: "G-C4LEHRHT7E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with custom domain settings
export const auth = getAuth(app);
auth.useDeviceLanguage();

// Add authorized domains
const authorizedDomains = [
  'localhost',
  'stackblitz.com',
  'webcontainer.io'
];

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Google Provider with custom settings
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({
  prompt: 'select_account',
  // Add authorized domains to prevent unauthorized-domain error
  auth_domain: authorizedDomains.join(',')
});

export default app;