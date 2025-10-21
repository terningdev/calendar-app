const express = require('express');
const router = express.Router();
const { PermissionsModel } = require('../models/PermissionsModel');

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
        
        if (!['technician', 'administrator', 'sysadmin'].includes(role)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid role' 
            });
        }
        
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
        
        if (!['technician', 'administrator', 'sysadmin'].includes(role)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid role' 
            });
        }
        
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

module.exports = router;
