const express = require('express');
const router = express.Router();
const User = require('../models/User');
const UserModel = require('../models/UserModel'); // MongoDB model
const { PermissionsModel } = require('../models/PermissionsModel'); // For fetching permissions

// In-memory storage for users (similar to other models) - DEPRECATED, using MongoDB now
let users = [];
let nextId = 1;

// Initialize default sysadmin user - REMOVED
// Sysadmin role can now be assigned to regular users through the Administrator panel
const initializeDefaultUser = async () => {
    try {
        console.log('Sysadmin user initialization skipped - use regular user with sysadmin role');
    } catch (error) {
        console.error('Error in initializeDefaultUser:', error);
    }
};

// Note: initializeDefaultUser() is kept for compatibility but does nothing

// Helper function to find user by email
const findUserByEmail = async (email) => {
    return await UserModel.findOne({ email: email.toLowerCase() });
};

const findUserByUsername = async (username) => {
    return await UserModel.findOne({ username });
};

// Helper function to get user permissions
const getUserPermissions = async (role) => {
    try {
        // Sysadmin has all permissions
        if (role === 'sysadmin') {
            return {
                viewDashboard: true,
                viewCalendar: true,
                viewTickets: true,
                viewAdministrator: true,
                viewAbsences: true,
                viewSkills: true,
                createTickets: true,
                editOwnTickets: true,
                editAllTickets: true,
                deleteTickets: true,
                assignTickets: true,
                viewUsers: true,
                manageUsers: true,
                approveUsers: true,
                submitBugReport: true,
                viewBugReports: true,
                manageDepartments: true,
                manageTechnicians: true,
                viewSystemStatus: true,
                managePermissions: true
            };
        }
        
        // Fetch permissions for other roles
        const rolePermissions = await PermissionsModel.findOne({ role });
        return rolePermissions ? rolePermissions.permissions : {};
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return {};
    }
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

        // Get default role from settings
        const { getSetting } = require('../models/SettingsModel');
        const defaultRole = await getSetting('defaultUserRole', 'tekniker_mobil');

        // Create new user (awaiting approval)
        const newUser = new UserModel({
            firstName,
            lastName,
            phone,
            email: email.toLowerCase(),
            password,
            role: defaultRole,
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

        console.log('🔐 Login attempt:', username ? `username: ${username}` : `email: ${email}`);

        let user;
        if (username) {
            // Username-based login (typically sysadmin)
            user = await UserModel.findOne({ username });
            console.log('👤 User found by username:', user ? user.username : 'not found');
            
            // Fallback: if username is 'sysadmin' and not found, check for sysadmin role without username
            if (!user && username === 'sysadmin') {
                user = await UserModel.findOne({ role: 'sysadmin', username: { $exists: false } });
                if (user) {
                    console.log('👤 Found sysadmin user without username field, updating...');
                    user.username = 'sysadmin';
                    await user.save();
                    console.log('✅ Sysadmin username field added');
                }
            }
            
            if (!user || user.password !== password) {
                console.log('❌ Login failed: Invalid credentials');
                return res.status(401).json({ success: false, message: 'Invalid username or password.' });
            }
        } else {
            // Regular email-based user login
            user = await UserModel.findOne({ email: email.toLowerCase() });
            console.log('👤 User found by email:', user ? user.email : 'not found');
            if (!user || user.password !== password) {
                console.log('❌ Login failed: Invalid credentials');
                return res.status(401).json({ success: false, message: 'Invalid email or password.' });
            }
            if (!user.approved) {
                console.log('❌ Login failed: User not approved');
                return res.status(403).json({ success: false, message: 'Account pending approval from administrator.' });
            }
        }

        // Fetch user permissions
        const permissions = await getUserPermissions(user.role);

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
                requirePasswordReset: user.requirePasswordReset,
                permissions: permissions
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
                console.log('🔑 Permissions loaded:', Object.keys(permissions).length);
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
router.get('/me', async (req, res) => {
    console.log('🔍 Auth check - Session ID:', req.sessionID);
    console.log('🔍 Auth check - Session user:', req.session.user ? 'exists' : 'missing');
    console.log('🔍 Auth check - Cookies:', req.headers.cookie ? 'present' : 'missing');
    
    if (req.session.user) {
        try {
            // Fetch fresh user data from database to catch role changes
            let currentUser;
            if (req.session.user.username) {
                currentUser = await UserModel.findOne({ username: req.session.user.username });
            } else {
                currentUser = await UserModel.findOne({ email: req.session.user.email });
            }

            if (!currentUser) {
                // User was deleted from database
                req.session.destroy();
                return res.json({
                    success: true,
                    authenticated: false
                });
            }

            // Fetch permissions for the user
            const permissions = await getUserPermissions(currentUser.role);

            // Update session with fresh data (catches role changes, etc.)
            const updatedSessionUser = {
                username: currentUser.username,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                phone: currentUser.phone,
                email: currentUser.email,
                role: currentUser.role,
                approved: currentUser.approved,
                requirePasswordReset: currentUser.requirePasswordReset,
                permissions: permissions
            };

            req.session.user = updatedSessionUser;
            
            // Save updated session
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            res.json({
                success: true,
                authenticated: true,
                user: updatedSessionUser
            });
        } catch (error) {
            console.error('❌ Error refreshing user data:', error);
            // Fall back to session data
            res.json({
                success: true,
                authenticated: true,
                user: req.session.user
            });
        }
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
router.post('/update-pin', async (req, res) => {
    try {
        // Check if user is authenticated
        if (!req.session.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Authentication required.' 
            });
        }

        // Find current user from database
        let currentUser;
        if (req.session.user.username) {
            currentUser = await UserModel.findOne({ username: req.session.user.username });
        } else {
            currentUser = await UserModel.findOne({ email: req.session.user.email });
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

        if (newPassword.length < 6) {
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

        // Update password and clear reset flag
        currentUser.password = newPassword;
        currentUser.requirePasswordReset = false;
        await currentUser.save();

        // Update session
        req.session.user.requirePasswordReset = false;
        await new Promise((resolve, reject) => {
            req.session.save((err) => {
                if (err) reject(err);
                else resolve();
            });
        });

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
        const { firstName, lastName, phone, newEmail, role, requirePasswordReset, temporaryPassword } = req.body;

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

        if (role && !(await User.isValidRole(role))) {
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
        
        // If temporaryPassword is provided, set it and require password reset
        if (temporaryPassword) {
            if (temporaryPassword.length < 6) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Temporary password must be at least 6 characters.' 
                });
            }
            userToUpdate.password = temporaryPassword;
            userToUpdate.requirePasswordReset = true;
            console.log(`🔑 Temporary password set for user: ${userToUpdate.email || userToUpdate.username}`);
        }
        
        await userToUpdate.save();

        // If the updated user is currently logged in, update their session
        if (req.session.user && 
            (req.session.user.email === userToUpdate.email || 
             req.session.user.username === userToUpdate.username)) {
            // Update the current session with new data
            req.session.user.firstName = userToUpdate.firstName;
            req.session.user.lastName = userToUpdate.lastName;
            req.session.user.phone = userToUpdate.phone;
            req.session.user.email = userToUpdate.email;
            req.session.user.role = userToUpdate.role;
            req.session.user.requirePasswordReset = userToUpdate.requirePasswordReset;
            
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        }

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
module.exports.initializeDefaultUser = initializeDefaultUser;