// src/contexts/AuthContext.jsx - UPDATED
import { createContext, useContext, useEffect, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = loading, null = no user
  const [userRole, setUserRole] = useState(undefined); // undefined = loading, null = no role
  const [loading, setLoading] = useState(true);

  async function signup(email, password, name, role) {
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    // Save user data to Firestore
    await setDoc(doc(db, "users", user.uid), {
      name,
      email,
      role,
      createdAt: new Date().toISOString(),
    });

    return user;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);

      if (user) {
        try {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));

          if (userDoc.exists()) {
            setUserRole(userDoc.data().role);
          } else {
            setUserRole(null);
          }

          setCurrentUser(user);
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserRole(null);
          setCurrentUser(user); // Still set user even if role fetch fails
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    loading,
    signup,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
