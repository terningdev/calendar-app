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
            console.log('🔍 Checking auth status...');
            setLoading(true);
            const response = await authService.checkAuth();
            
            if (response.success && response.authenticated) {
                console.log('✅ Auth check response: Success');
                console.log('✅ Access granted based on user login');
                setUser(response.user);
                setAuthenticated(true);
            } else {
                console.log('❌ User not authenticated');
                setUser(null);
                setAuthenticated(false);
            }
        } catch (error) {
            console.error('🚨 Auth check failed:', error);
            setUser(null);
            setAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        try {
            console.log('🔐 Attempting login...');
            const response = await authService.login(credentials);
            console.log('🔐 Login response:', response);
            
            if (response.success) {
                console.log('✅ Login successful, setting user state:', response.user);
                setUser(response.user);
                setAuthenticated(true);
                return response;
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('🚨 Login failed:', error);
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

    const updateUserPin = async (currentPin, newPin) => {
        try {
            const response = await authService.updatePin(currentPin, newPin);
            if (response.success) {
                // Optionally refresh user data
                return response;
            } else {
                throw new Error(response.message || 'Failed to update PIN');
            }
        } catch (error) {
            console.error('PIN update failed:', error);
            throw error;
        }
    };

    // Check if user has specific role
    const hasRole = (role) => {
        return user && user.role === role;
    };

    // Check if user can approve registrations
    const canApproveUsers = () => {
        console.log('🔍 canApproveUsers check - user:', user);
        console.log('🔍 canApproveUsers check - user role:', user?.role);
        const result = user && (user.role === 'administrator' || user.role === 'sysadmin');
        console.log('🔍 canApproveUsers result:', result);
        return result;
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
        updateUserPin,
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