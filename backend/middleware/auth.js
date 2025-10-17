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

module.exports = {
    requireAuth,
    requireAdmin,
    requireSysadmin
};