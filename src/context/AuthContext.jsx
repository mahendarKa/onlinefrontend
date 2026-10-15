import { createContext, useContext, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    const parsed = stored ? JSON.parse(stored) : null;
    // Guard against a previously stored "undefined"/"null" or incomplete object.
    return parsed && parsed.role ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    // Backend returns a flat payload, not a nested "user" object.
    const userInfo = {
      id: data.user_id,
      name: data.name,
      email: data.email,
      role: data.role,
      mobile_number: data.mobile_number || null,
      profile_pic: data.profile_pic || null,
    };
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(userInfo));
    setUser(userInfo);
    return userInfo;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
