const express = require('express');
const router = express.Router();
const { PermissionsModel } = require('../models/PermissionsModel');

// Test endpoint to verify route is loaded
router.get('/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Permissions route is working',
        timestamp: new Date().toISOString()
    });
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    next();
};

// Middleware to check if user can manage permissions
const canManagePermissions = (req, res, next) => {
    const user = req.session.user;
    if (user.role !== 'administrator' && user.role !== 'sysadmin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Insufficient permissions to manage role permissions' 
        });
    }
    next();
};

// GET /api/permissions - Get all role permissions
router.get('/', isAuthenticated, canManagePermissions, async (req, res) => {
    try {
        const allPermissions = await PermissionsModel.find().sort({ role: 1 });
        res.json({ 
            success: true, 
            permissions: allPermissions 
        });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch permissions' 
        });
    }
});

// GET /api/permissions/:role - Get permissions for a specific role
router.get('/:role', isAuthenticated, async (req, res) => {
    try {
        const { role } = req.params;
        
        const rolePermissions = await PermissionsModel.findOne({ role });
        
        if (!rolePermissions) {
            return res.status(404).json({ 
                success: false, 
                message: 'Permissions not found for this role' 
            });
        }
        
        res.json({ 
            success: true, 
            permissions: rolePermissions 
        });
    } catch (error) {
        console.error('Error fetching role permissions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch role permissions' 
        });
    }
});

// PUT /api/permissions/:role - Update permissions for a specific role
router.put('/:role', isAuthenticated, canManagePermissions, async (req, res) => {
    try {
        const { role } = req.params;
        const { permissions } = req.body;
        
        if (!permissions || typeof permissions !== 'object') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid permissions data' 
            });
        }
        
        // Prevent administrators from modifying sysadmin permissions
        if (role === 'sysadmin' && req.session.user.role !== 'sysadmin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only sysadmin can modify sysadmin permissions' 
            });
        }
        
        const updatedPermissions = await PermissionsModel.findOneAndUpdate(
            { role },
            { permissions, updatedAt: Date.now() },
            { new: true, runValidators: true }
        );
        
        if (!updatedPermissions) {
            return res.status(404).json({ 
                success: false, 
                message: 'Permissions not found for this role' 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Permissions updated for ${role} role`,
            permissions: updatedPermissions 
        });
    } catch (error) {
        console.error('Error updating permissions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update permissions' 
        });
    }
});

// POST /api/permissions/reset/:role - Reset permissions to defaults for a specific role
router.post('/reset/:role', isAuthenticated, canManagePermissions, async (req, res) => {
    try {
        const { role } = req.params;
        
        if (!['technician', 'administrator', 'sysadmin'].includes(role)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid role' 
            });
        }
        
        // Prevent administrators from resetting sysadmin permissions
        if (role === 'sysadmin' && req.session.user.role !== 'sysadmin') {
            return res.status(403).json({ 
                success: false, 
                message: 'Only sysadmin can reset sysadmin permissions' 
            });
        }
        
        // Delete existing permissions and reinitialize
        await PermissionsModel.deleteOne({ role });
        
        // Re-import to get defaults
        const { initializeDefaultPermissions } = require('../models/PermissionsModel');
        await initializeDefaultPermissions();
        
        const resetPermissions = await PermissionsModel.findOne({ role });
        
        res.json({ 
            success: true, 
            message: `Permissions reset to defaults for ${role} role`,
            permissions: resetPermissions 
        });
    } catch (error) {
        console.error('Error resetting permissions:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to reset permissions' 
        });
    }
});

// POST /api/permissions/roles - Create a new custom role
router.post('/roles', isAuthenticated, canManagePermissions, async (req, res) => {
    try {
        const { roleName, basedOn } = req.body;
        
        if (!roleName || typeof roleName !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: 'Role name is required' 
            });
        }
        
        // Validate role name (alphanumeric, underscores, hyphens only)
        if (!/^[a-zA-Z0-9_-]+$/.test(roleName)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Role name can only contain letters, numbers, underscores, and hyphens' 
            });
        }
        
        // Prevent creating roles with reserved names
        if (['technician', 'administrator', 'sysadmin', 'user'].includes(roleName.toLowerCase())) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot use reserved role names' 
            });
        }
        
        // Check if role already exists
        const existingRole = await PermissionsModel.findOne({ role: roleName });
        if (existingRole) {
            return res.status(400).json({ 
                success: false, 
                message: 'A role with this name already exists' 
            });
        }
        
        // Get base permissions (default or from specified role)
        let basePermissions = {
            viewDashboard: true,
            viewCalendar: true,
            viewTickets: true,
            viewAdministrator: false,
            viewAbsences: false,
            viewSkills: false,
            createTickets: true,
            editOwnTickets: true,
            editAllTickets: false,
            deleteTickets: false,
            assignTickets: false,
            viewUsers: false,
            manageUsers: false,
            approveUsers: false,
            manageDepartments: false,
            manageTechnicians: false,
            viewSystemStatus: false,
            managePermissions: false
        };
        
        // If basedOn is provided, copy permissions from that role
        if (basedOn && ['user', 'technician', 'administrator', 'sysadmin'].includes(basedOn)) {
            const baseRole = await PermissionsModel.findOne({ role: basedOn });
            if (baseRole) {
                basePermissions = { ...baseRole.permissions };
            }
        }
        
        // Create new role
        const newRole = new PermissionsModel({
            role: roleName,
            isCustomRole: true,
            permissions: basePermissions
        });
        
        await newRole.save();
        
        res.json({ 
            success: true, 
            message: `Custom role '${roleName}' created successfully`,
            role: newRole 
        });
    } catch (error) {
        console.error('Error creating custom role:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create custom role' 
        });
    }
});

// DELETE /api/permissions/roles/:role - Delete a custom role
router.delete('/roles/:role', isAuthenticated, canManagePermissions, async (req, res) => {
    try {
        const { role } = req.params;
        
        // Prevent deleting system roles
        if (['user', 'technician', 'administrator', 'sysadmin'].includes(role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot delete system roles' 
            });
        }
        
        const deletedRole = await PermissionsModel.findOneAndDelete({ 
            role,
            isCustomRole: true 
        });
        
        if (!deletedRole) {
            return res.status(404).json({ 
                success: false, 
                message: 'Custom role not found' 
            });
        }
        
        res.json({ 
            success: true, 
            message: `Custom role '${role}' deleted successfully` 
        });
    } catch (error) {
        console.error('Error deleting custom role:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete custom role' 
        });
    }
});

// PUT /api/permissions/roles/:role/rename - Rename a role
router.put('/roles/:role/rename', isAuthenticated, canManagePermissions, async (req, res) => {
    try {
        const { role } = req.params;
        const { newRoleName } = req.body;
        
        if (!newRoleName || typeof newRoleName !== 'string') {
            return res.status(400).json({ 
                success: false, 
                message: 'New role name is required' 
            });
        }
        
        // Validate new role name (alphanumeric, underscores, hyphens only)
        if (!/^[a-zA-Z0-9_-]+$/.test(newRoleName)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Role name can only contain letters, numbers, underscores, and hyphens' 
            });
        }
        
        // Prevent renaming system roles
        if (['user', 'technician', 'administrator', 'sysadmin'].includes(role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot rename system roles' 
            });
        }
        
        // Prevent using reserved names
        if (['user', 'technician', 'administrator', 'sysadmin'].includes(newRoleName.toLowerCase())) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot use reserved role names' 
            });
        }
        
        // Check if the old role exists
        const existingRole = await PermissionsModel.findOne({ role, isCustomRole: true });
        if (!existingRole) {
            return res.status(404).json({ 
                success: false, 
                message: 'Custom role not found' 
            });
        }
        
        // Check if new role name already exists
        const roleNameExists = await PermissionsModel.findOne({ role: newRoleName });
        if (roleNameExists) {
            return res.status(400).json({ 
                success: false, 
                message: 'A role with this name already exists' 
            });
        }
        
        // Update the role name in PermissionsModel
        existingRole.role = newRoleName;
        await existingRole.save();
        
        // Update all users who have this role
        const UserModel = require('../models/UserModel');
        const updateResult = await UserModel.updateMany(
            { role: role },
            { $set: { role: newRoleName } }
        );
        
        res.json({ 
            success: true, 
            message: `Role '${role}' renamed to '${newRoleName}' successfully`,
            usersUpdated: updateResult.modifiedCount,
            role: existingRole 
        });
    } catch (error) {
        console.error('Error renaming role:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to rename role' 
        });
    }
});

module.exports = router;
