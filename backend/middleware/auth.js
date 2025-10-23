// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in.'
        });
    }
    next();
};

// Admin/Sysadmin authorization middleware
const requireAdmin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in.'
        });
    }

    if (req.session.user.role !== 'administrator' && req.session.user.role !== 'sysadmin') {
        return res.status(403).json({
            success: false,
            message: 'Administrator privileges required.'
        });
    }

    next();
};

// Sysadmin only authorization middleware
const requireSysadmin = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Please log in.'
        });
    }

    if (req.session.user.role !== 'sysadmin') {
        return res.status(403).json({
            success: false,
            message: 'System administrator privileges required.'
        });
    }

    next();
};

// Helper function to check if user owns a ticket
// A user owns a ticket if their email matches any assigned technician's email
const checkTicketOwnership = async (userEmail, ticket) => {
    if (!ticket || !userEmail) {
        return false;
    }

    // If ticket has no assigned technicians, no one owns it
    if (!ticket.assignedTo) {
        return false;
    }

    // Handle both single technician and array of technicians
    const assignedTechnicians = Array.isArray(ticket.assignedTo) 
        ? ticket.assignedTo 
        : [ticket.assignedTo];

    // Check if user's email matches any assigned technician's email
    for (const tech of assignedTechnicians) {
        const techEmail = tech.email || tech;
        if (techEmail && techEmail.toLowerCase() === userEmail.toLowerCase()) {
            return true;
        }
    }

    return false;
};

// Check if user has a specific permission
const hasPermission = async (user, permissionName) => {
    if (!user) {
        return false;
    }

    // If permissions are already in the session, use them
    if (user.permissions && user.permissions[permissionName] !== undefined) {
        return user.permissions[permissionName] === true;
    }

    // Otherwise, fetch permissions from database based on role
    try {
        const { PermissionsModel } = require('../models/PermissionsModel');
        const rolePermissions = await PermissionsModel.findOne({ role: user.role });
        
        if (!rolePermissions || !rolePermissions.permissions) {
            return false;
        }

        return rolePermissions.permissions[permissionName] === true;
    } catch (error) {
        console.error('Error fetching permissions:', error);
        return false;
    }
};

module.exports = {
    requireAuth,
    requireAdmin,
    requireSysadmin,
    checkTicketOwnership,
    hasPermission
};