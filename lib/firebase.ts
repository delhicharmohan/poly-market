import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAPPoGW7sNCyUTGtkQYuXCJfF0-ALtr9Ew",
  authDomain: "indi-market-d76c2.firebaseapp.com",
  projectId: "indi-market-d76c2",
  storageBucket: "indi-market-d76c2.firebasestorage.app",
  messagingSenderId: "768452259724",
  appId: "1:768452259724:web:8c86db364458ff8ff6f0a9",
  measurementId: "G-9CQ3BT176L"
};

// Initialize Firebase (only on client side)
const app = typeof window !== "undefined" ? (!getApps().length ? initializeApp(firebaseConfig) : getApps()[0]) : undefined;
const auth = app ? getAuth(app) : undefined;
const analytics = app ? getAnalytics(app) : undefined;

export { auth, analytics };
export default app;

