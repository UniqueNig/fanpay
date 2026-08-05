import React, { createContext, useContext, useState, useEffect } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../firebase";
import { api } from "../api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserData = async () => {
    const { user: profile } = await api.get("/users/me");
    setUserData(profile);
    return profile;
  };

  // Creates the backend profile if it doesn't exist yet; idempotent, so it's
  // safe to call on every login, not just the first one. referralCode is
  // only ever consumed server-side on true first-creation (see users.js) —
  // harmless to pass on a returning-user call too, it's just ignored.
  const ensureUserProfile = async (fullName, phone, referralCode) => {
    await api.post("/users", { fullName, phone, referralCode });
  };

  const signup = async (email, password, fullName, phone, referralCode) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(result.user, { displayName: fullName });
    await ensureUserProfile(fullName, phone, referralCode);
    return result;
  };

  // Fire-and-forget: records this sign-in for the admin Login Logs page.
  // Never blocks or fails the actual login on logging errors.
  const recordLogin = () => {
    api.post("/auth/log-login", {}).catch(() => {});
  };

  const login = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    recordLogin();
    return result;
  };

  const loginWithGoogle = async (referralCode) => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const result = await signInWithPopup(auth, provider);
    await ensureUserProfile(result.user.displayName || "", result.user.phoneNumber || "", referralCode);
    recordLogin();
    return result;
  };

  const logout = () => signOut(auth);

  const resetPassword = (email) => sendPasswordResetEmail(auth, email);

  // Admin status lives on the Firebase ID token as a custom claim (`admin: true`),
  // set server-side via the Firebase Admin SDK — see scripts/grant-admin.js.
  // Force-refresh so a claim granted after the user's last login is picked up
  // without requiring them to sign out and back in.
  const checkAdminStatus = async (firebaseUser, forceRefresh = false) => {
    if (!firebaseUser) {
      setIsAdmin(false);
      return false;
    }
    try {
      const tokenResult = await firebaseUser.getIdTokenResult(forceRefresh);
      const admin = tokenResult.claims?.admin === true;
      setIsAdmin(admin);
      return admin;
    } catch (err) {
      console.error("Failed to read admin claim:", err);
      setIsAdmin(false);
      return false;
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await checkAdminStatus(firebaseUser, true);
        try {
          await fetchUserData();
        } catch (err) {
          // No Mongo profile for this Firebase account yet — most likely an
          // account created before this backend existed. Self-heal by creating
          // it now (ensureUserProfile is idempotent) instead of 404-ing forever.
          try {
            await ensureUserProfile(firebaseUser.displayName || "", firebaseUser.phoneNumber || "");
            await fetchUserData();
          } catch (err2) {
            console.error("Failed to load or create user profile:", err2);
            setUserData(null);
          }
        }
      } else {
        setUserData(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userData,
        loading,
        isAdmin,
        signup,
        login,
        loginWithGoogle,
        logout,
        resetPassword,
        fetchUserData,
        checkAdminStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
