const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { requireAuth } = require('../middleware/auth');

// Middleware to check if user can view logs
const canViewLogs = (req, res, next) => {
    const user = req.session.user;
    if (!user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    
    // Check if user has viewLogs permission
    if (user.role === 'sysadmin' || user.permissions?.viewLogs === true) {
        next();
    } else {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied. Log viewing permission required.' 
        });
    }
};

// GET /api/logs - Retrieve activity logs with filtering and pagination
router.get('/', requireAuth, canViewLogs, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            category,
            action,
            userId,
            startDate,
            endDate,
            search
        } = req.query;

        // Build filter object
        const filter = {};
        
        if (category) filter.category = category;
        if (action) filter.action = action;
        if (userId) filter.userId = userId;
        
        // Date range filter
        if (startDate || endDate) {
            filter.timestamp = {};
            if (startDate) filter.timestamp.$gte = new Date(startDate);
            if (endDate) filter.timestamp.$lte = new Date(endDate);
        }
        
        // Text search across description, userName, userEmail
        if (search) {
            filter.$or = [
                { description: { $regex: search, $options: 'i' } },
                { userName: { $regex: search, $options: 'i' } },
                { userEmail: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Execute query
        const [logs, totalCount] = await Promise.all([
            ActivityLog.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            ActivityLog.countDocuments(filter)
        ]);

        // Calculate pagination info
        const totalPages = Math.ceil(totalCount / parseInt(limit));
        const hasNext = parseInt(page) < totalPages;
        const hasPrev = parseInt(page) > 1;

        res.json({
            success: true,
            logs,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                hasNext,
                hasPrev,
                limit: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch activity logs'
        });
    }
});

// GET /api/logs/categories - Get available log categories
router.get('/categories', requireAuth, canViewLogs, async (req, res) => {
    try {
        const categories = await ActivityLog.distinct('category');
        res.json({
            success: true,
            categories: categories.sort()
        });
    } catch (error) {
        console.error('Error fetching log categories:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch log categories'
        });
    }
});

// GET /api/logs/actions - Get available actions for a category
router.get('/actions', requireAuth, canViewLogs, async (req, res) => {
    try {
        const { category } = req.query;
        const filter = category ? { category } : {};
        
        const actions = await ActivityLog.distinct('action', filter);
        res.json({
            success: true,
            actions: actions.sort()
        });
    } catch (error) {
        console.error('Error fetching log actions:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch log actions'
        });
    }
});

// GET /api/logs/users - Get list of users who have performed actions
router.get('/users', requireAuth, canViewLogs, async (req, res) => {
    try {
        const users = await ActivityLog.aggregate([
            {
                $group: {
                    _id: '$userId',
                    userName: { $first: '$userName' },
                    userEmail: { $first: '$userEmail' },
                    lastActivity: { $max: '$timestamp' },
                    activityCount: { $sum: 1 }
                }
            },
            {
                $sort: { lastActivity: -1 }
            }
        ]);

        res.json({
            success: true,
            users
        });
    } catch (error) {
        console.error('Error fetching log users:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch log users'
        });
    }
});

// GET /api/logs/stats - Get logging statistics
router.get('/stats', requireAuth, canViewLogs, async (req, res) => {
    try {
        const stats = await ActivityLog.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 },
                    lastActivity: { $max: '$timestamp' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]);

        const totalLogs = await ActivityLog.countDocuments();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayLogs = await ActivityLog.countDocuments({
            timestamp: { $gte: today }
        });

        res.json({
            success: true,
            stats: {
                totalLogs,
                todayLogs,
                byCategory: stats
            }
        });
    } catch (error) {
        console.error('Error fetching log stats:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch log statistics'
        });
    }
});

module.exports = router;