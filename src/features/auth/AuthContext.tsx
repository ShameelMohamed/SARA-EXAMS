import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { subscribeToAuthChanges, determineUserRole, logoutUser } from '../../services/firebase/auth';
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
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      setUser(fbUser);
      if (fbUser && fbUser.email) {
        setLoading(true);
        const resolvedRole = await determineUserRole(fbUser.uid, fbUser.email);
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
        } else {
          setError('Unauthorized account. Please sign in using your Saranathan CSE Google account.');
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

    return () => unsubscribe();
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
