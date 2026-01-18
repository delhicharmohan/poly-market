"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !auth) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let authStateFired = false;
    let redirectCheckFinished = false;

    const checkFinished = () => {
      if (isMounted && authStateFired && redirectCheckFinished) {
        setLoading(false);
      }
    };

    // 1. Listen for auth state changes immediately
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isMounted) {
        authStateFired = true;
        setUser(firebaseUser);

        // Sync user to database
        if (firebaseUser) {
          // Store user info for API requests
          try {
            if (typeof window !== "undefined") {
              sessionStorage.setItem("firebase_uid", firebaseUser.uid);
              if (firebaseUser.email) {
                sessionStorage.setItem("user_email", firebaseUser.email);
              }
            }
          } catch (e) {
            console.warn("Storage restricted:", e);
          }

          // Sync to database (non-blocking)
          import("./db-client").then(({ dbClient }) => {
            dbClient.syncUser(
              firebaseUser.uid,
              firebaseUser.email || "",
              firebaseUser.displayName || undefined
            ).catch((error) => {
              console.warn("Failed to sync user to database:", error);
            });
          });

          // If we have a user, we can stop loading immediately
          setLoading(false);
        } else {
          // Clear session storage on logout
          try {
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("firebase_uid");
              sessionStorage.removeItem("user_email");
            }
          } catch (e) {
            // ignore
          }
          checkFinished();
        }
      }
    });

    // 2. Explicitly check for redirect result
    getRedirectResult(auth)
      .then((result) => {
        if (isMounted && result?.user) {
          setUser(result.user);
        }
      })
      .catch((error) => {
        if (isMounted) {
          // Log the error but don't show it if it's unrelated to Google
          console.warn("Redirect check caught an error (often harmless):", error.code);

          // If the error is 'auth/missing-password', it's likely from a 
          // previous email attempt. We ignore it so it doesn't block Google.
          if (error.code !== "auth/missing-password") {
            console.error("Actual Redirect Error:", error.code, error.message);
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          redirectCheckFinished = true;
          checkFinished();
        }
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized");

    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");
    provider.setCustomParameters({
      prompt: "select_account"
    });

    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setUser(result.user);
      }
    } catch (error: any) {

      // If popup is blocked or fails with COOP issue, fallback to redirect
      if (
        error.code === "auth/popup-blocked" ||
        error.code === "auth/popup-closed-by-user" ||
        error.code === "auth/cancelled-popup-request" ||
        error.message?.includes("Cross-Origin-Opener-Policy")
      ) {
        await signInWithRedirect(auth, provider);
      } else {
        throw error;
      }
    }
  };

  const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    if (!auth) throw new Error("Firebase Auth is not initialized");
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        sendPasswordReset,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

