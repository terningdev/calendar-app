const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    userEmail: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    action: {
        type: String,
        required: true,
        index: true
        // Examples: 'USER_LOGIN', 'USER_CREATED', 'TICKET_CREATED', 'TICKET_UPDATED', etc.
    },
    category: {
        type: String,
        required: true,
        index: true
        // Categories: 'AUTH', 'USER', 'TICKET', 'DEPARTMENT', 'TECHNICIAN', 'ABSENCE', 'SKILL', 'BUG_REPORT', 'SYSTEM'
    },
    description: {
        type: String,
        required: true
    },
    targetId: {
        type: String,
        index: true
        // ID of the affected resource (ticket ID, user ID, etc.)
    },
    targetType: {
        type: String
        // Type of affected resource ('ticket', 'user', 'department', etc.)
    },
    ipAddress: {
        type: String
    },
    userAgent: {
        type: String
    },
    changes: {
        type: mongoose.Schema.Types.Mixed
        // Store before/after values for updates
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed
        // Additional context-specific data
    }
});

// Index for efficient querying
activityLogSchema.index({ timestamp: -1, category: 1 });
activityLogSchema.index({ userId: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;