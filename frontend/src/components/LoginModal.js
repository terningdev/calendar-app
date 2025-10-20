import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';

const LoginModal = ({ onAuthSuccess }) => {
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
    email: '',
    password: '',
    password2: '',
    firstName: '',
    lastName: '',
    phone: ''
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
            // Accept 'sysadmin' as a valid input in the email field
            if (formData.email === 'sysadmin') {
                if (!formData.password) {
                    setError('Password required');
                    return false;
                }
            } else {
                if (!authService.isValidEmail(formData.email)) {
                    setError('Valid email required');
                    return false;
                }
                if (!authService.isValidPassword(formData.password)) {
                    setError('Password must be at least 6 characters');
                    return false;
                }
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
                if (formData.email === 'sysadmin') {
                    // Sysadmin login
                    result = await login({ username: 'sysadmin', password: formData.password });
                } else {
                    // Regular user login
                    result = await login({ email: formData.email, password: formData.password });
                }
                if (result.success) {
                    setSuccess('Login successful!');
                    setTimeout(() => { onAuthSuccess(); }, 500);
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

    return (
        <div className="login-modal-overlay">
            <div className="login-modal">
                <div className="login-modal-header">
                    <h2>{isLogin ? 'Log In' : 'Register'}</h2>
                    <p className="login-modal-subtitle">
                        {isLogin 
                            ? 'Enter your phone number and PIN to access the system'
                            : 'Create a new account (requires administrator approval)'
                        }
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {isLogin ? (
                        <>
                            <div className="form-group">
                                <label htmlFor="email">Email</label>
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