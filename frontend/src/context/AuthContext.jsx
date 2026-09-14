import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem('shelterx_auth');
    return stored ? JSON.parse(stored) : null;
  });

  const refreshUser = async () => {
    if (!auth?.token) return null;
    try {
      const dbUser = await api.getMe(auth.token);
      if (dbUser && dbUser.id) {
        setAuth((currentAuth) => {
          if (!currentAuth?.token) return currentAuth;
          const prevUser = currentAuth.user || {};
          if (
            dbUser.role !== prevUser.role ||
            dbUser.shelter_id !== prevUser.shelter_id ||
            dbUser.name !== prevUser.name ||
            dbUser.is_active !== prevUser.is_active
          ) {
            const updated = {
              ...currentAuth,
              user: { ...prevUser, ...dbUser },
            };
            localStorage.setItem('shelterx_auth', JSON.stringify(updated));
            return updated;
          }
          return currentAuth;
        });
        return dbUser;
      }
    } catch {
      // Ignore transient background sync errors
    }
    return null;
  };

  useEffect(() => {
    if (!auth?.token) return;

    // Check immediately on mount/token change
    refreshUser();

    // Poll every 3.5 seconds for instant detection of admin approvals
    const interval = setInterval(() => {
      refreshUser();
    }, 3500);

    // Re-check whenever user refocuses tab
    const handleFocus = () => refreshUser();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refreshUser();
    };

    // Cross-tab sync if approval was made in another tab/window
    const handleStorage = (e) => {
      if (e.key === 'shelterx_auth') {
        try {
          const fresh = e.newValue ? JSON.parse(e.newValue) : null;
          setAuth(fresh);
        } catch {
          // ignore parse failure
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('storage', handleStorage);
    };
  }, [auth?.token]);

  const login = (data) => {
    // data: { token, user }
    localStorage.setItem('shelterx_auth', JSON.stringify(data));
    setAuth(data);
  };

  const logout = () => {
    localStorage.removeItem('shelterx_auth');
    setAuth(null);
  };

  return (
    <AuthContext.Provider value={{ auth, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
