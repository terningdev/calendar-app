import api from './api';

const authService = {
    // Register new user
    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message);
            }
            throw new Error('Registration failed. Please try again.');
        }
    },

    // Login user
    async login(credentials) {
        try {
            const response = await api.post('/auth/login', credentials);
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message);
            }
            throw new Error('Login failed. Please try again.');
        }
    },

    // Check authentication status
    async checkAuth() {
        try {
            const response = await api.get('/auth/me');
            return response.data;
        } catch (error) {
            console.error('Auth check failed:', error);
            return { success: false, authenticated: false };
        }
    },

    // Logout user
    async logout() {
        try {
            const response = await api.post('/auth/logout');
            return response.data;
        } catch (error) {
            console.error('Logout failed:', error);
            // Even if logout fails on server, clear local state
            return { success: true };
        }
    },

    // Get pending user registrations (admin only)
    async getPendingUsers() {
        try {
            const response = await api.get('/auth/pending');
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message);
            }
            throw new Error('Failed to fetch pending users.');
        }
    },

    // Approve user registration (admin only)
    async approveUser(phone) {
        try {
            const response = await api.post(`/auth/approve/${phone}`);
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message);
            }
            throw new Error('Failed to approve user.');
        }
    },

    // Reject user registration (admin only)
    async rejectUser(phone) {
        try {
            const response = await api.delete(`/auth/reject/${phone}`);
            return response.data;
        } catch (error) {
            if (error.response && error.response.data) {
                throw new Error(error.response.data.message);
            }
            throw new Error('Failed to reject user.');
        }
    },

    // Validation helpers
    isValidPhone(phone) {
        const phoneRegex = /^[0-9]{8}$/;
        return phoneRegex.test(phone);
    },

    isValidPin(pin) {
        const pinRegex = /^[0-9]{4}$/;
        return pinRegex.test(pin);
    },

    isValidName(name) {
        return name && name.trim().length >= 2;
    },

    // Format phone number with country code
    formatPhoneDisplay(phone) {
        return `+47 ${phone}`;
    },

    // Parse phone input (remove country code if present)
    parsePhoneInput(input) {
        // Remove spaces, dashes, and country code
        const cleaned = input.replace(/[\s\-\+]/g, '');
        
        // If starts with 47, remove it (Norwegian country code)
        if (cleaned.startsWith('47') && cleaned.length === 10) {
            return cleaned.substring(2);
        }
        
        return cleaned;
    }
};

export default authService;