import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Role = 'admin' | 'manager' | 'employee' | 'finance' | 'director';

interface UserData {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  company_id: string;
  must_change_password: boolean;
  department?: string;
}

interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
  isLoggedIn: boolean;
  setIsLoggedIn: (v: boolean) => void;
  companyExists: boolean;
  setCompanyExists: (v: boolean) => void;
  mustChangePassword: boolean;
  setMustChangePassword: (v: boolean) => void;
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  token: string | null;
  setToken: (token: string | null) => void;
  login: (token: string, user: UserData) => void;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType>({
  role: 'admin',
  setRole: () => {},
  isLoggedIn: false,
  setIsLoggedIn: () => {},
  companyExists: true,
  setCompanyExists: () => {},
  mustChangePassword: false,
  setMustChangePassword: () => {},
  user: null,
  setUser: () => {},
  token: null,
  setToken: () => {},
  login: () => {},
  logout: () => {},
});

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  // Initialize from localStorage
  const [token, setTokenState] = useState<string | null>(() =>
    localStorage.getItem('clearclaim_token')
  );
  const [user, setUserState] = useState<UserData | null>(() => {
    const stored = localStorage.getItem('clearclaim_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [role, setRoleState] = useState<Role>(() => {
    const stored = localStorage.getItem('clearclaim_user');
    if (stored) {
      const u = JSON.parse(stored);
      return u.role || 'admin';
    }
    return 'admin';
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('clearclaim_token'));
  const [companyExists, setCompanyExists] = useState(true);
  const [mustChangePassword, setMustChangePassword] = useState(() => {
    const stored = localStorage.getItem('clearclaim_user');
    if (stored) return JSON.parse(stored).must_change_password || false;
    return false;
  });

  const setRole = (r: Role) => setRoleState(r);

  const setToken = (t: string | null) => {
    setTokenState(t);
    if (t) {
      localStorage.setItem('clearclaim_token', t);
    } else {
      localStorage.removeItem('clearclaim_token');
    }
  };

  const setUser = (u: UserData | null) => {
    setUserState(u);
    if (u) {
      localStorage.setItem('clearclaim_user', JSON.stringify(u));
      setRoleState(u.role);
      setMustChangePassword(u.must_change_password);
    } else {
      localStorage.removeItem('clearclaim_user');
    }
  };

  const login = (newToken: string, userData: UserData) => {
    setToken(newToken);
    setUser(userData);
    setIsLoggedIn(true);
    setRoleState(userData.role);
    setMustChangePassword(userData.must_change_password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsLoggedIn(false);
    setMustChangePassword(false);
    localStorage.removeItem('clearclaim_token');
    localStorage.removeItem('clearclaim_user');
  };

  // Check setup status on mount
  useEffect(() => {
    fetch('/api/check-setup')
      .then(r => r.json())
      .then(data => setCompanyExists(data.setup_complete))
      .catch(() => setCompanyExists(false));
  }, []);

  return (
    <RoleContext.Provider value={{
      role, setRole,
      isLoggedIn, setIsLoggedIn,
      companyExists, setCompanyExists,
      mustChangePassword, setMustChangePassword,
      user, setUser,
      token, setToken,
      login, logout,
    }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);

export const roleColors: Record<Role, string> = {
  admin: '#7c3aed',
  manager: '#3b82f6',
  employee: '#00e5a0',
  finance: '#f59e0b',
  director: '#f43f5e',
};

export const roleLabels: Record<Role, string> = {
  admin: 'Admin',
  manager: 'Manager',
  employee: 'Employee',
  finance: 'Finance',
  director: 'Director',
};
