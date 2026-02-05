import React, { createContext, useState, useContext, useEffect } from 'react';
import { authApi, updateApiClients } from '../services/apiService';
import config from '../config/config';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const token = localStorage.getItem(config.ACCESS_TOKEN_KEY);
        const userData = localStorage.getItem(config.USER_KEY);

        if (token && userData) {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
          updateApiClients();
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  /**
   * Login function
   * @param {string} username - User's email/username
   * @param {string} password - User's password
   * @returns {Promise<boolean>} - Success status
   */
  const login = async (username, password) => {
    try {
      setLoading(true);
      
      const response = await authApi.signIn({
        username,
        password,
      });

      const { accessToken, refreshToken } = response.data;

      if (!accessToken) {
        throw new Error('No access token received');
      }

      // Store tokens
      localStorage.setItem(config.ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(config.REFRESH_TOKEN_KEY, refreshToken);
      }

      // Create user object (you might want to decode JWT or fetch user details)
      const userData = {
        email: username,
        // Add more user details if available from response
      };

      localStorage.setItem(config.USER_KEY, JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);

      // Update API clients with new token
      updateApiClients();

      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.detail?.message ||
        'Invalid credentials. Please try again.';
      
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout function
   */
  const logout = () => {
    localStorage.removeItem(config.ACCESS_TOKEN_KEY);
    localStorage.removeItem(config.REFRESH_TOKEN_KEY);
    localStorage.removeItem(config.USER_KEY);
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  /**
   * Refresh token function
   */
  const refreshToken = async () => {
    try {
      const refreshToken = localStorage.getItem(config.REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authApi.refreshToken({ refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;

      localStorage.setItem(config.ACCESS_TOKEN_KEY, accessToken);
      if (newRefreshToken) {
        localStorage.setItem(config.REFRESH_TOKEN_KEY, newRefreshToken);
      }

      updateApiClients();
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      return false;
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
