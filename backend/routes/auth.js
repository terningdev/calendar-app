const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserModel = require('../models/UserModel'); // MongoDB model

// In-memory storage for users (similar to other models) - DEPRECATED, using MongoDB now
let users = [];
let nextId = 1;

// Initialize default sysadmin user in MongoDB
const initializeDefaultUser = async () => {
    try {
        const existingSysadmin = await UserModel.findOne({ username: 'sysadmin' });
        if (!existingSysadmin) {
            const sysadmin = new UserModel({
                username: 'sysadmin',
                password: '696969',
                role: 'sysadmin',
                approved: true
            });
            await sysadmin.save();
            console.log('Default sysadmin user created in MongoDB: sysadmin / 696969');
        } else {
            console.log('Sysadmin user already exists in MongoDB');
        }
    } catch (error) {
        console.error('Error initializing default user:', error);
    }
};

// Initialize on startup
initializeDefaultUser();

// Helper function to find user by email
const findUserByEmail = async (email) => {
    return await UserModel.findOne({ email: email.toLowerCase() });
};

const findUserByUsername = async (username) => {
    return await UserModel.findOne({ username });
};

// Register new user
router.post('/register', async (req, res) => {
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
        if (!UserModel.isValidEmail(email)) {
            return res.status(400).json({ success: false, message: 'Valid email is required.' });
        }
        if (!User.isValidPassword(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
        }
        if (password !== password2) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        // Check if email already exists
        const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        // Create new user (awaiting approval)
        const newUser = new UserModel({
            firstName,
            lastName,
            phone,
            email: email.toLowerCase(),
            password,
            role: 'user',
            approved: false
        });
        await newUser.save();

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
router.post('/login', async (req, res) => {
    try {
        const { email, password, username } = req.body;

        let user;
        if (username) {
            // Sysadmin login
            user = await UserModel.findOne({ username, role: 'sysadmin' });
            if (!user || user.password !== password) {
                return res.status(401).json({ success: false, message: 'Invalid username or password.' });
            }
        } else {
            // Regular user login
            user = await UserModel.findOne({ email: email.toLowerCase() });
            if (!user || user.password !== password) {
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }
            if (!user.approved) {
                return res.status(403).json({ success: false, message: 'Account pending approval from administrator.' });
            }
        }

        // Create session
        req.session.regenerate((err) => {
            if (err) {
                console.error('❌ Session regeneration error:', err);
                // Continue anyway with existing session
            }
            
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
                console.log('🍪 Cookie will be set:', req.session.cookie);
                res.json({ 
                    success: true, 
                    message: 'Login successful.', 
                    user: req.session.user,
                    requirePasswordReset: user.requirePasswordReset 
                });
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error during login.' });
    }
});

// Check authentication status
router.get('/me', (req, res) => {
    console.log('🔍 Auth check - Session ID:', req.sessionID);
    console.log('🔍 Auth check - Session user:', req.session.user ? 'exists' : 'missing');
    console.log('🔍 Auth check - Cookies:', req.headers.cookie ? 'present' : 'missing');
    
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
router.get('/pending', async (req, res) => {
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
            currentUser = await findUserByUsername(req.session.user.username);
        } else {
            currentUser = await findUserByEmail(req.session.user.email);
        }
        if (!currentUser || !currentUser.canApproveUsers()) {
            return res.status(403).json({ success: false, message: 'Administrator privileges required.' });
        }

        // Get pending users from MongoDB
        const pendingUsers = await UserModel.find({ approved: false, role: { $ne: 'sysadmin' } });
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
router.post('/approve/:email', async (req, res) => {
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
            currentUser = await findUserByUsername(req.session.user.username);
        } else {
            currentUser = await findUserByEmail(req.session.user.email);
        }
        if (!currentUser || !currentUser.canApproveUsers()) {
            return res.status(403).json({ success: false, message: 'Administrator privileges required.' });
        }

        // Find and approve user by email in MongoDB
        const userToApprove = await UserModel.findOne({ email: req.params.email.toLowerCase() });
        if (!userToApprove) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }
        if (userToApprove.approved) {
            return res.status(400).json({ success: false, message: 'User already approved.' });
        }
        userToApprove.approved = true;
        await userToApprove.save();
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
router.delete('/reject/:email', async (req, res) => {
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
            currentUser = await findUserByUsername(req.session.user.username);
        } else {
            currentUser = await findUserByEmail(req.session.user.email);
        }
        if (!currentUser || !currentUser.canApproveUsers()) {
            return res.status(403).json({ 
                success: false, 
                message: 'Administrator privileges required.' 
            });
        }

        // Find and remove user from MongoDB
        const result = await UserModel.deleteOne({ email: req.params.email.toLowerCase() });
        if (result.deletedCount === 0) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        res.json({
            success: true,
            message: `User registration rejected successfully.`
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
router.get('/users', async (req, res) => {
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

        // Return all approved users from MongoDB
        const approvedUsers = await UserModel.find({ approved: true });
        const safeUsers = approvedUsers.map(user => ({
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
router.put('/users/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params; // Can be email or username
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

        // Find user to update in MongoDB - try by email first, then by username
        let userToUpdate = await UserModel.findOne({ email: identifier.toLowerCase() });
        if (!userToUpdate) {
            userToUpdate = await UserModel.findOne({ username: identifier });
        }
        
        if (!userToUpdate) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        // Only allow editing approved users (use approve endpoint for pending users)
        if (!userToUpdate.approved) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot edit unapproved user. Please approve or reject from pending users list.' 
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
        if (newEmail && newEmail !== identifier && newEmail.toLowerCase() !== userToUpdate.email) {
            const emailExists = await UserModel.findOne({ email: newEmail.toLowerCase() });
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
        if (newEmail) userToUpdate.email = newEmail.toLowerCase();
        if (role) userToUpdate.role = role;
        if (requirePasswordReset !== undefined) userToUpdate.requirePasswordReset = requirePasswordReset;
        
        await userToUpdate.save();

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
router.delete('/users/:identifier', async (req, res) => {
    try {
        const { identifier } = req.params; // Can be email or username

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

        // Find user to delete - try by email first, then by username
        let userIndex = users.findIndex(u => u.email === identifier);
        if (userIndex === -1) {
            userIndex = users.findIndex(u => u.username === identifier);
        }
        
        if (userIndex === -1) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found.' 
            });
        }

        const userToDelete = users[userIndex];

        // Only allow deleting approved users (use reject endpoint for pending users)
        if (!userToDelete.approved) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete unapproved user. Please approve or reject from pending users list.' 
            });
        }

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

        // Delete user from MongoDB
        await UserModel.deleteOne({ _id: userToDelete._id });

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