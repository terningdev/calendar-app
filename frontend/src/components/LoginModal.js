import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';

const LoginModal = ({ onAuthSuccess }) => {
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
    email: '',
    password: '',
    password2: '',
    firstName: '',
    lastName: '',
    phone: ''
    });
    
    // Password reset form
    const [resetFormData, setResetFormData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'phone') {
            // Only allow digits, max 8 characters
            const cleanedValue = value.replace(/\D/g, '').substring(0, 8);
            setFormData(prev => ({ ...prev, [name]: cleanedValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        
        // Clear errors when user starts typing
        if (error) setError('');
        if (success) setSuccess('');
    };

    const validateForm = () => {
        if (isLogin) {
            // Accept username (like 'sysadmin') or email
            if (!formData.email) {
                setError('Email or username required');
                return false;
            }
            if (!formData.password) {
                setError('Password required');
                return false;
            }
            // Only validate email format if it looks like an email (contains @)
            if (formData.email.includes('@') && !authService.isValidEmail(formData.email)) {
                setError('Valid email required');
                return false;
            }
            // Validate password length for regular users
            if (formData.email.includes('@') && !authService.isValidPassword(formData.password)) {
                setError('Password must be at least 6 characters');
                return false;
            }
        } else {
            // Registration
            if (!authService.isValidName(formData.firstName)) {
                setError('First name must be at least 2 characters');
                return false;
            }
            if (!authService.isValidName(formData.lastName)) {
                setError('Last name must be at least 2 characters');
                return false;
            }
            if (!authService.isValidPhone(formData.phone)) {
                setError('Phone number must be 8 digits');
                return false;
            }
            if (!authService.isValidEmail(formData.email)) {
                setError('Valid email required');
                return false;
            }
            if (!authService.isValidPassword(formData.password)) {
                setError('Password must be at least 6 characters');
                return false;
            }
            if (formData.password !== formData.password2) {
                setError('Passwords do not match');
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
        
        setLoading(true);
        setError('');
        setSuccess('');
        
        try {
            if (isLogin) {
                let result;
                // Check if input contains @ to determine if it's email or username
                if (formData.email.includes('@')) {
                    // Regular email-based login
                    result = await login({ email: formData.email, password: formData.password });
                } else {
                    // Username-based login (sysadmin or other usernames)
                    result = await login({ username: formData.email, password: formData.password });
                }
                if (result.success) {
                    // Check if password reset is required
                    if (result.requirePasswordReset) {
                        setResetEmail(formData.email);
                        setShowPasswordReset(true);
                        setSuccess('Password reset required. Please set a new password.');
                    } else {
                        setSuccess('Login successful!');
                        setTimeout(() => { onAuthSuccess(); }, 500);
                    }
                }
            } else {
                // Register
                const result = await authService.register({
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    phone: formData.phone,
                    email: formData.email,
                    password: formData.password,
                    password2: formData.password2
                });
                if (result.success) {
                    setSuccess('Registration submitted! Awaiting administrator approval.');
                    setTimeout(() => {
                        setFormData({
                            email: '',
                            password: '',
                            password2: '',
                            firstName: '',
                            lastName: '',
                            phone: '',
                            username: ''
                        });
                        setIsLogin(true);
                    }, 2000);
                }
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setSuccess('');
        setFormData({
            email: '',
            password: '',
            password2: '',
            firstName: '',
            lastName: '',
            phone: ''
        });
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        
        if (!resetFormData.newPassword || resetFormData.newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        
        if (resetFormData.newPassword !== resetFormData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            const result = await authService.updatePin(formData.password, resetFormData.newPassword);
            if (result.success) {
                setSuccess('Password updated successfully! Logging you in...');
                setTimeout(() => { onAuthSuccess(); }, 1000);
            }
        } catch (error) {
            setError(error.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    // If password reset is required, show reset form
    if (showPasswordReset) {
        return (
            <div className="login-modal-overlay">
                <div className="login-modal">
                    <div className="login-modal-header">
                        <h2>Password Reset Required</h2>
                        <p className="login-modal-subtitle">
                            Please set a new password to continue
                        </p>
                    </div>

                    <form onSubmit={handlePasswordReset} className="login-form">
                        <div className="form-group">
                            <label htmlFor="newPassword">New Password</label>
                            <input
                                type="password"
                                id="newPassword"
                                value={resetFormData.newPassword}
                                onChange={(e) => setResetFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                                placeholder="Enter new password"
                                disabled={loading}
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm New Password</label>
                            <input
                                type="password"
                                id="confirmPassword"
                                value={resetFormData.confirmPassword}
                                onChange={(e) => setResetFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                placeholder="Confirm new password"
                                disabled={loading}
                            />
                        </div>

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <button 
                            type="submit" 
                            className="login-button"
                            disabled={loading}
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="login-modal-overlay">
            <div className="login-modal">
                {!isLogin && (
                    <div className="login-modal-header">
                        <h2>Register</h2>
                        <p className="login-modal-subtitle">
                            Create a new account (requires administrator approval)
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="login-form">
                    {isLogin ? (
                        <>
                            <div className="form-group">
                                <label htmlFor="email">Email or Username</label>
                                <input
                                    type="text"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Email"
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Password"
                                    disabled={loading}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label htmlFor="firstName">First Name</label>
                                <input
                                    type="text"
                                    id="firstName"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    placeholder="First Name"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="lastName">Last Name</label>
                                <input
                                    type="text"
                                    id="lastName"
                                    name="lastName"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    placeholder="Last Name"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="phone">Phone Number</label>
                                <input
                                    type="text"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    placeholder="12345678"
                                    maxLength="8"
                                    required
                                    disabled={loading}
                                />
                                <small className="form-hint">Norwegian phone number (8 digits)</small>
                            </div>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="user@email.com"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password">Password</label>
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Password"
                                    required
                                    disabled={loading}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="password2">Confirm Password</label>
                                <input
                                    type="password"
                                    id="password2"
                                    name="password2"
                                    value={formData.password2}
                                    onChange={handleInputChange}
                                    placeholder="Repeat Password"
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </>
                    )}

                    {error && <div className="error-message">{error}</div>}
                    {success && <div className="success-message">{success}</div>}

                    <button 
                        type="submit" 
                        className="login-button"
                        disabled={loading}
                    >
                        {loading ? 'Please wait...' : (isLogin ? 'Log In' : 'Register')}
                    </button>

                    <div className="login-footer">
                        <button
                            type="button"
                            className="switch-mode-button"
                            onClick={switchMode}
                            disabled={loading}
                        >
                            {isLogin 
                                ? "Don't have an account? Register here"
                                : "Already have an account? Log in here"
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginModal;