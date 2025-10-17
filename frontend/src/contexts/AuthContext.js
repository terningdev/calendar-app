import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    // Check authentication status on app load
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            setLoading(true);
            const response = await authService.checkAuth();
            
            if (response.success && response.authenticated) {
                setUser(response.user);
                setAuthenticated(true);
            } else {
                setUser(null);
                setAuthenticated(false);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
            setAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            const response = await authService.login(credentials);
            
            if (response.success) {
                setUser(response.user);
                setAuthenticated(true);
                return response;
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            const response = await authService.register(userData);
            return response;
        } catch (error) {
            console.error('Registration failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            // Always clear local state
            setUser(null);
            setAuthenticated(false);
        }
    };

    // Check if user has specific role
    const hasRole = (role) => {
        return user && user.role === role;
    };

    // Check if user can approve registrations
    const canApproveUsers = () => {
        return user && (user.role === 'administrator' || user.role === 'sysadmin');
    };

    // Check if user is system admin
    const isSysadmin = () => {
        return user && user.role === 'sysadmin';
    };

    const value = {
        user,
        authenticated,
        loading,
        login,
        register,
        logout,
        checkAuthStatus,
        hasRole,
        canApproveUsers,
        isSysadmin
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;