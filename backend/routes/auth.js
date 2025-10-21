const express = require('express');
const router = express.Router();
const User = require('../models/User');

// In-memory storage for users (similar to other models)
let users = [];
let nextId = 1;

// Initialize default sysadmin user
const initializeDefaultUser = () => {
    const existingSysadmin = users.find(user => user.username === 'sysadmin');
    if (!existingSysadmin) {
        const sysadmin = new User({
            username: 'sysadmin',
            password: '696969',
            role: 'sysadmin',
            approved: true
        });
        users.push(sysadmin);
        console.log('Default sysadmin user created: sysadmin / 696969');
    }
};

// Initialize on startup
initializeDefaultUser();

// Helper function to find user by phone
const findUserByEmail = (email) => {
    return users.find(user => user.email === email);
};

const findUserByUsername = (username) => {
    return users.find(user => user.username === username);
};

// Register new user
router.post('/register', (req, res) => {
    try {
        const { firstName, lastName, phone, email, password, password2 } = req.body;

        // Validate input
        if (!User.isValidName(firstName)) {
            return res.status(400).json({ success: false, message: 'First name must be at least 2 characters.' });
        }
        if (!User.isValidName(lastName)) {
            return res.status(400).json({ success: false, message: 'Last name must be at least 2 characters.' });
        }
        if (!User.isValidPhone(phone)) {
            return res.status(400).json({ success: false, message: 'Invalid phone number. Must be 8 digits.' });
        }
        if (!User.isValidEmail(email)) {
            return res.status(400).json({ success: false, message: 'Valid email is required.' });
        }
        if (!User.isValidPassword(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }
        if (password !== password2) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        // Check if email already exists
        if (users.find(u => u.email === email)) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        // Create new user (awaiting approval)
        const newUser = new User({
            firstName,
            lastName,
            phone,
            email,
            password,
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
        res.status(500).json({ success: false, message: 'Server error during registration.' });
    }
});

// Login user
router.post('/login', (req, res) => {
    try {
        const { email, password, username } = req.body;

        let user;
        if (username) {
            // Sysadmin login
            user = users.find(u => u.username === username && u.role === 'sysadmin');
            if (!user || user.password !== password) {
                return res.status(401).json({ success: false, message: 'Invalid username or password.' });
            }
        } else {
            // Regular user login
            user = users.find(u => u.email === email);
            if (!user || user.password !== password) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }
            if (!user.approved) {
                return res.status(403).json({ success: false, message: 'Account pending approval from administrator.' });
            }
        }

        // Create session
        req.session.user = {
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            email: user.email,
            role: user.role,
            approved: user.approved,
            requirePasswordReset: user.requirePasswordReset
        };

        // Save session explicitly
        req.session.save((err) => {
            if (err) {
                console.error('❌ Session save error:', err);
                return res.status(500).json({ success: false, message: 'Failed to save session.' });
            }
            console.log('✅ Session saved for user:', user.email || user.username);
            console.log('📋 Session ID:', req.sessionID);
            res.json({ 
                success: true, 
                message: 'Login successful.', 
                user: req.session.user,
                requirePasswordReset: user.requirePasswordReset 
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
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
        let currentUser;
        if (req.session.user.username) {
            currentUser = findUserByUsername(req.session.user.username);
        } else {
            currentUser = findUserByEmail(req.session.user.email);
        }
        if (!currentUser || !currentUser.canApproveUsers()) {
            return res.status(403).json({ success: false, message: 'Administrator privileges required.' });
        }

        // Get pending users
        const pendingUsers = users.filter(user => !user.approved && user.role !== 'sysadmin');
        res.json({
            success: true,
            pendingUsers: pendingUsers.map(user => ({
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                email: user.email,
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
router.post('/approve/:email', (req, res) => {
    try {
        // Check authentication
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required.' 
            });
        }

        // Check permissions
        let currentUser;
        if (req.session.user.username) {
            currentUser = findUserByUsername(req.session.user.username);
        } else {
            currentUser = findUserByEmail(req.session.user.email);
        }
        if (!currentUser || !currentUser.canApproveUsers()) {
            return res.status(403).json({ success: false, message: 'Administrator privileges required.' });
        }

        // Find and approve user by email
        const userToApprove = findUserByEmail(req.params.email);
        if (!userToApprove) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (userToApprove.approved) {
            return res.status(400).json({ success: false, message: 'User already approved.' });
        }
        userToApprove.approved = true;
        res.json({ success: true, message: `User ${userToApprove.email} approved successfully.` });

    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error approving user.' 
        });
    }
});

// Reject user registration (admin/sysadmin only)
router.delete('/reject/:email', (req, res) => {
    try {
        // Check authentication
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required.' 
            });
        }

        // Check permissions
        let currentUser;
        if (req.session.user.username) {
            currentUser = findUserByUsername(req.session.user.username);
        } else {
            currentUser = findUserByEmail(req.session.user.email);
        }
        if (!currentUser || !currentUser.canApproveUsers()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Administrator privileges required.' 
            });
        }

        // Find and remove user
        const userIndex = users.findIndex(user => user.email === req.params.email);
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

// Update user password
router.post('/update-pin', (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required.' 
            });
        }

        // Find current user
        let currentUser;
        if (req.session.user.username) {
            currentUser = findUserByUsername(req.session.user.username);
        } else {
            currentUser = findUserByEmail(req.session.user.email);
        }

        if (!currentUser) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current password and new password are required.' 
            });
        }

        if (!User.isValidPassword(newPassword)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid new password. Must be at least 6 characters.' 
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'New password must be different from current password.' 
            });
        }

        // Verify current password
        if (currentUser.password !== currentPassword) {
            return res.status(400).json({ 
                success: false, 
                message: 'Current password is incorrect.' 
            });
        }

        // Update password
        currentUser.password = newPassword;
        currentUser.requirePasswordReset = false; // Clear reset flag if present

        res.json({
            success: true,
            message: 'Password updated successfully.'
        });

    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error updating password.' 
        });
    }
});

// Get all users (administrator/sysadmin only)
router.get('/users', (req, res) => {
    try {
        // Check authentication
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated.' 
            });
        }

        const currentUser = User.fromObject(req.session.user);
        
        // Check if user has permission
        if (!currentUser.canManageUsers()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Administrator privileges required.' 
            });
        }

        // Return all users (exclude passwords)
        const safeUsers = users.map(user => ({
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            phone: user.phone,
            role: user.role,
            approved: user.approved,
            requirePasswordReset: user.requirePasswordReset,
            createdAt: user.createdAt
        }));

        res.json({
            success: true,
            users: safeUsers
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error retrieving users.' 
        });
    }
});

// Update user (administrator/sysadmin only)
router.put('/users/:email', (req, res) => {
    try {
        const { email } = req.params;
        const { firstName, lastName, phone, newEmail, role, requirePasswordReset } = req.body;

        // Check authentication
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated.' 
            });
        }

        const currentUser = User.fromObject(req.session.user);
        
        // Check if user has permission
        if (!currentUser.canManageUsers()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Administrator privileges required.' 
            });
        }

        // Find user to update
        const userToUpdate = findUserByEmail(email);
        if (!userToUpdate) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        // Prevent modifying sysadmin
        if (userToUpdate.username === 'sysadmin' && currentUser.role !== 'sysadmin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot modify sysadmin user.' 
            });
        }

        // Validate new data
        if (firstName && !User.isValidName(firstName)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid first name.' 
            });
        }

        if (lastName && !User.isValidName(lastName)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid last name.' 
            });
        }

        if (phone && !User.isValidPhone(phone)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid phone number.' 
            });
        }

        if (newEmail && !User.isValidEmail(newEmail)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid email address.' 
            });
        }

        if (role && !User.isValidRole(role)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid role.' 
            });
        }

        // Check if new email already exists
        if (newEmail && newEmail !== email) {
            const emailExists = findUserByEmail(newEmail);
            if (emailExists) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Email already in use.' 
                });
            }
        }

        // Update user fields
        if (firstName) userToUpdate.firstName = firstName;
        if (lastName) userToUpdate.lastName = lastName;
        if (phone) userToUpdate.phone = phone;
        if (newEmail) userToUpdate.email = newEmail;
        if (role) userToUpdate.role = role;
        if (requirePasswordReset !== undefined) userToUpdate.requirePasswordReset = requirePasswordReset;

        res.json({
            success: true,
            message: 'User updated successfully.',
            user: {
                email: userToUpdate.email,
                firstName: userToUpdate.firstName,
                lastName: userToUpdate.lastName,
                phone: userToUpdate.phone,
                role: userToUpdate.role,
                requirePasswordReset: userToUpdate.requirePasswordReset
            }
        });

    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error updating user.' 
        });
    }
});

// Delete user (administrator/sysadmin only)
router.delete('/users/:email', (req, res) => {
    try {
        const { email } = req.params;

        // Check authentication
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated.' 
            });
        }

        const currentUser = User.fromObject(req.session.user);
        
        // Check if user has permission
        if (!currentUser.canManageUsers()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Administrator privileges required.' 
            });
        }

        // Find user to delete
        const userIndex = users.findIndex(u => u.email === email);
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        const userToDelete = users[userIndex];

        // Prevent deleting sysadmin
        if (userToDelete.username === 'sysadmin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot delete sysadmin user.' 
            });
        }

        // Prevent deleting yourself
        if (userToDelete.email === currentUser.email) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete your own account.' 
            });
        }

        // Delete user
        users.splice(userIndex, 1);

        res.json({
            success: true,
            message: 'User deleted successfully.'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error deleting user.' 
        });
    }
});

module.exports = router;