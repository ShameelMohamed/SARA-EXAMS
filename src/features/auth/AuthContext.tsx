import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { subscribeToAuthChanges, determineUserRole, logoutUser, handleGoogleRedirectResult } from '../../services/firebase/auth';
import type { UserProfile, UserRole } from '../../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: null,
  loading: true,
  error: null,
  logout: async () => {},
  clearError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Handle redirect auth result if user just returned from Google redirect
    handleGoogleRedirectResult().then(({ error }) => {
      if (isMounted && error) {
        setError(error);
      }
    }).catch((err) => {
      console.error('Redirect auth handling error:', err);
    });

    // 2. Listen to Firebase auth state changes
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      if (!isMounted) return;

      if (fbUser && fbUser.email) {
        setLoading(true);
        const resolvedRole = await determineUserRole(fbUser.uid, fbUser.email);
        
        if (!isMounted) return;

        if (resolvedRole) {
          setRole(resolvedRole);
          setProfile({
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || fbUser.email.split('@')[0],
            role: resolvedRole,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            active: true
          });
          setError(null);
        } else {
          const isStudentAttempt = fbUser.email.toLowerCase().includes('saranathan.ac.in');
          const errorMsg = isStudentAttempt
            ? 'Students must use an official Saranathan CSE Google account (e.g., cse*@saranathan.ac.in).'
            : 'Access denied. Your account is not authorized as a Teacher or Admin.';
          setError(errorMsg);
          setRole(null);
          setProfile(null);
          await logoutUser();
        }
        setLoading(false);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    await logoutUser();
    setUser(null);
    setProfile(null);
    setRole(null);
    setError(null);
    setLoading(false);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        error,
        logout: handleLogout,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
