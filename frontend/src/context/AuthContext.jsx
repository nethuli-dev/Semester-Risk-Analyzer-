import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import client, { setAccessToken, setOnAuthExpired } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyToken = useCallback((token) => {
    setAccessToken(token);
  }, []);

  useEffect(() => {
    setOnAuthExpired(() => {
      setUser(null);
    });
  }, []);

  // Silent session restore: the refresh token lives in an httpOnly cookie
  // the browser sends automatically, so reloading the page can recover a
  // session without the student logging in again.
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data } = await client.post('/auth/refresh');
        applyToken(data.accessToken);
        const me = await client.get('/auth/me');
        setUser(me.data.user);
      } catch {
        applyToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, [applyToken]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await client.post('/auth/login', { email, password });
      applyToken(data.accessToken);
      setUser(data.user);
    },
    [applyToken]
  );

  const register = useCallback(
    async (name, email, password) => {
      const { data } = await client.post('/auth/register', { name, email, password });
      applyToken(data.accessToken);
      setUser(data.user);
    },
    [applyToken]
  );

  const logout = useCallback(async () => {
    try {
      await client.post('/auth/logout');
    } finally {
      applyToken(null);
      setUser(null);
    }
  }, [applyToken]);

  const updateProfile = useCallback(async (fields) => {
    const { data } = await client.patch('/auth/me', fields);
    setUser(data.user);
  }, []);

  // The server revokes every refresh token and issues a new pair, so this
  // session keeps working while any other device is signed out.
  const changePassword = useCallback(
    async (currentPassword, newPassword) => {
      const { data } = await client.post('/auth/change-password', { currentPassword, newPassword });
      applyToken(data.accessToken);
    },
    [applyToken]
  );

  const logoutEverywhere = useCallback(async () => {
    try {
      await client.post('/auth/logout-all');
    } finally {
      applyToken(null);
      setUser(null);
    }
  }, [applyToken]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, register, logout, updateProfile, changePassword, logoutEverywhere }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
