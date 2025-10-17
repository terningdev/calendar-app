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
        phone: '',
        pin: '',
        fullName: '',
        countryCode: '+47'
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'phone') {
            // Only allow digits, max 8 characters
            const cleanedValue = value.replace(/\D/g, '').substring(0, 8);
            setFormData(prev => ({ ...prev, [name]: cleanedValue }));
        } else if (name === 'pin') {
            // Only allow digits, max 4 characters
            const cleanedValue = value.replace(/\D/g, '').substring(0, 4);
            setFormData(prev => ({ ...prev, [name]: cleanedValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
        
        // Clear errors when user starts typing
        if (error) setError('');
        if (success) setSuccess('');
    };

    const validateForm = () => {
        if (!authService.isValidPhone(formData.phone)) {
            setError('Phone number must be 8 digits');
            return false;
        }
        
        if (!authService.isValidPin(formData.pin)) {
            setError('PIN must be 4 digits');
            return false;
        }
        
        if (!isLogin && !authService.isValidName(formData.fullName)) {
            setError('Full name must be at least 2 characters');
            return false;
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
                // Login using AuthContext
                const result = await login({
                    phone: formData.phone,
                    pin: formData.pin
                });
                
                if (result.success) {
                    setSuccess('Login successful!');
                    setTimeout(() => {
                        onAuthSuccess();
                    }, 500);
                }
            } else {
                // Register
                const result = await authService.register({
                    phone: formData.phone,
                    pin: formData.pin,
                    fullName: formData.fullName
                });
                
                if (result.success) {
                    setSuccess('Registration submitted! Awaiting administrator approval.');
                    // Clear form and switch to login after registration
                    setTimeout(() => {
                        setFormData({
                            phone: '',
                            pin: '',
                            fullName: '',
                            countryCode: '+47'
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
            phone: '',
            pin: '',
            fullName: '',
            countryCode: '+47'
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
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="fullName">Full Name</label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleInputChange}
                                placeholder="Enter your full name"
                                required={!isLogin}
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="phone">Phone Number</label>
                        <div className="phone-input-group">
                            <span className="country-code">{formData.countryCode}</span>
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
                                className="phone-input"
                            />
                        </div>
                        <small className="form-hint">Norwegian phone number (8 digits)</small>
                    </div>

                    <div className="form-group">
                        <label htmlFor="pin">PIN Code</label>
                        <input
                            type="password"
                            id="pin"
                            name="pin"
                            value={formData.pin}
                            onChange={handleInputChange}
                            placeholder="0000"
                            maxLength="4"
                            required
                            disabled={loading}
                            className="pin-input"
                        />
                        <small className="form-hint">4-digit PIN code</small>
                    </div>

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