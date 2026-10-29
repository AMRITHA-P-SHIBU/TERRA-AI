import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [membership, setMembership] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Rehydrate authentication state on mount from secure HttpOnly cookie
   */
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me', {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setOrganization(data.organization);
        setMembership(data.membership);
        setPermissions(data.permissions || {});
        setError(null);
      } else {
        setUser(null);
        setOrganization(null);
        setMembership(null);
        setPermissions({});
      }
    } catch (err) {
      console.warn('[AuthContext] Session verification check failed:', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /**
   * Login method
   */
  const login = async (email, password, rememberMe = false, expectedRole = null) => {
    setError(null);
    try {
      const payload = { email, password, rememberMe };
      if (expectedRole) {
        payload.expectedRole = expectedRole;
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      setUser(data.user);
      setOrganization(data.organization || null);
      setMembership(data.membership || null);

      // Re-fetch full permissions
      await checkAuth();

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Individual Signup
   */
  const signupIndividual = async (formData) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/signup/individual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.details
          ? Object.values(data.details).flat().join(', ')
          : data.error || 'Signup failed';
        throw new Error(msg);
      }

      setUser(data.user);
      await checkAuth();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Organization Signup (Multipart Form Data with verification document)
   */
  const signupOrganization = async (formData) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/signup/organization', {
        method: 'POST',
        credentials: 'include',
        body: formData, // FormData instance
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.details
          ? Object.values(data.details).flat().join(', ')
          : data.error || 'Organization registration failed';
        throw new Error(msg);
      }

      setUser(data.user);
      setOrganization(data.organization);
      setMembership(data.membership);
      await checkAuth();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Change Password (for first login update or profile settings)
   */
  const changePassword = async (newPassword, currentPassword) => {
    setError(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword, currentPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update password');
      }
      if (user) {
        setUser((prev) => (prev ? { ...prev, must_change_password: false } : prev));
      }
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('[AuthContext] Logout failed:', err);
    } finally {
      setUser(null);
      setOrganization(null);
      setMembership(null);
      setPermissions({});
      window.location.href = '/login';
    }
  };

  const role = user?.account_type || null;

  const value = {
    user,
    role,
    organization,
    membership,
    permissions,
    loading,
    error,
    login,
    signupIndividual,
    signupOrganization,
    changePassword,
    logout,
    checkAuth,
    isAuthenticated: Boolean(user),
    isSuperAdmin: role === 'SUPER_ADMIN',
    isOrgAdmin: role === 'ORG_ADMIN',
    isIndividual: role === 'INDIVIDUAL',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
