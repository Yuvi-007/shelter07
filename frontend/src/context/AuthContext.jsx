import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem('shelterx_auth');
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (auth?.token) {
      api.getMe(auth.token)
        .then((dbUser) => {
          if (dbUser && dbUser.id && dbUser.role !== auth.user?.role) {
            const updated = { ...auth, user: { ...auth.user, ...dbUser } };
            localStorage.setItem('shelterx_auth', JSON.stringify(updated));
            setAuth(updated);
          }
        })
        .catch(() => {});
    }
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
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
