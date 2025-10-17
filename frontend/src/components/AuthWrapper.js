import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from './LoginModal';

const AuthWrapper = ({ children }) => {
    const { authenticated, loading, checkAuthStatus } = useAuth();

    // Show loading spinner while checking authentication
    if (loading) {
        return (
            <div className="auth-loading">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    // Show login modal if not authenticated
    if (!authenticated) {
        return <LoginModal onAuthSuccess={() => checkAuthStatus()} />;
    }

    // Show app content if authenticated
    return children;
};

export default AuthWrapper;