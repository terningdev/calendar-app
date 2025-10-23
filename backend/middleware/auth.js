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
const hasPermission = (user, permissionName) => {
    if (!user || !user.permissions) {
        return false;
    }
    return user.permissions[permissionName] === true;
};

module.exports = {
    requireAuth,
    requireAdmin,
    requireSysadmin,
    checkTicketOwnership,
    hasPermission
};