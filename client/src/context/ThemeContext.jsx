import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import API_URL from '../config';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nexovgen-theme') || 'light';
  });

  // Apply theme to DOM
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nexovgen-theme', theme);
  }, [theme]);

  // Synchronize theme when user logs in and user object changes
  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme);
    }
  }, [user]);

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);

    // If user is authenticated, sync to backend
    if (user?.id || user?._id) {
      try {
        const userId = user.id || user._id;
        const token = localStorage.getItem('nexov_token') || '';
        const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        await fetch(`${API_URL}/auth/theme/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({ theme: newTheme })
        });
      } catch (err) {
        console.error('Failed to sync theme to backend', err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
