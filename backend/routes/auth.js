const express = require('express');
const router = express.Router();
const User = require('../models/User');

// In-memory storage for users (similar to other models)
let users = [];
let nextId = 1;

// Initialize default sysadmin user
const initializeDefaultUser = () => {
    const existingSysadmin = users.find(user => user.phone === '99999999');
    if (!existingSysadmin) {
        const sysadmin = new User({
            phone: '99999999',
            pin: '6969',
            fullName: 'System Administrator',
            role: 'sysadmin',
            approved: true
        });
        users.push(sysadmin);
        console.log('Default sysadmin user created: 99999999 / 6969');
    }
};

// Initialize on startup
initializeDefaultUser();

// Helper function to find user by phone
const findUserByPhone = (phone) => {
    return users.find(user => user.phone === phone);
};

// Register new user
router.post('/register', (req, res) => {
    try {
        const { phone, pin, fullName } = req.body;

        // Validate input
        if (!User.isValidPhone(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid phone number. Must be 8 digits.' 
            });
        }

        if (!User.isValidPin(pin)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid PIN. Must be 4 digits.' 
            });
        }

        if (!User.isValidName(fullName)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Full name must be at least 2 characters.' 
            });
        }

        // Check if user already exists
        if (findUserByPhone(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Phone number already registered.' 
            });
        }

        // Create new user (awaiting approval)
        const newUser = new User({
            phone,
            pin,
            fullName,
            role: 'user',
            approved: false
        });

        users.push(newUser);

        res.json({
            success: true,
            message: 'Registration submitted. Awaiting administrator approval.',
            requiresApproval: true
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration.' 
        });
    }
});

// Login user
router.post('/login', (req, res) => {
    try {
        const { phone, pin } = req.body;

        // Find user
        const user = findUserByPhone(phone);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid phone number or PIN.' 
            });
        }

        // Check PIN
        if (user.pin !== pin) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid phone number or PIN.' 
            });
        }

        // Check if user is approved (sysadmin is always approved)
        if (!user.approved) {
            return res.status(403).json({ 
                success: false, 
                message: 'Account pending approval from administrator.' 
            });
        }

        // Create session
        req.session.user = {
            phone: user.phone,
            fullName: user.fullName,
            role: user.role,
            approved: user.approved
        };

        res.json({
            success: true,
            message: 'Login successful.',
            user: req.session.user
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login.' 
        });
    }
});

// Check authentication status
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({
            success: true,
            authenticated: true,
            user: req.session.user
        });
    } else {
        res.json({
            success: true,
            authenticated: false
        });
    }
});

// Logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ 
                success: false, 
                message: 'Error logging out.' 
            });
        }
        res.json({
            success: true,
            message: 'Logged out successfully.'
        });
    });
});

// Get pending user registrations (admin/sysadmin only)
router.get('/pending', (req, res) => {
    try {
        // Check authentication
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required.' 
            });
        }

        // Check permissions
        const currentUser = findUserByPhone(req.session.user.phone);
        if (!currentUser || !currentUser.canApproveUsers()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Administrator privileges required.' 
            });
        }

        // Get pending users
        const pendingUsers = users.filter(user => !user.approved && user.role !== 'sysadmin');
        
        res.json({
            success: true,
            pendingUsers: pendingUsers.map(user => ({
                phone: user.phone,
                fullName: user.fullName,
                createdAt: user.createdAt
            }))
        });

    } catch (error) {
        console.error('Get pending users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error retrieving pending users.' 
        });
    }
});

// Approve user registration (admin/sysadmin only)
router.post('/approve/:phone', (req, res) => {
    try {
        // Check authentication
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required.' 
            });
        }

        // Check permissions
        const currentUser = findUserByPhone(req.session.user.phone);
        if (!currentUser || !currentUser.canApproveUsers()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Administrator privileges required.' 
            });
        }

        // Find and approve user
        const userToApprove = findUserByPhone(req.params.phone);
        if (!userToApprove) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        if (userToApprove.approved) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already approved.' 
            });
        }

        userToApprove.approved = true;

        res.json({
            success: true,
            message: `User ${userToApprove.fullName} approved successfully.`
        });

    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error approving user.' 
        });
    }
});

// Reject user registration (admin/sysadmin only)
router.delete('/reject/:phone', (req, res) => {
    try {
        // Check authentication
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required.' 
            });
        }

        // Check permissions
        const currentUser = findUserByPhone(req.session.user.phone);
        if (!currentUser || !currentUser.canApproveUsers()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Administrator privileges required.' 
            });
        }

        // Find and remove user
        const userIndex = users.findIndex(user => user.phone === req.params.phone);
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        const rejectedUser = users[userIndex];
        if (rejectedUser.approved) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot reject approved user.' 
            });
        }

        users.splice(userIndex, 1);

        res.json({
            success: true,
            message: `User registration for ${rejectedUser.fullName} rejected.`
        });

    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error rejecting user.' 
        });
    }
});

module.exports = router;