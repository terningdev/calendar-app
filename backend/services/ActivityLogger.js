const ActivityLog = require('../models/ActivityLog');

/**
 * Activity Logger Service
 * Provides centralized logging for all user activities
 */
class ActivityLogger {
    
    /**
     * Log an activity
     * @param {Object} params - Logging parameters
     * @param {Object} params.user - User object with id, email, firstName, lastName
     * @param {string} params.action - Action performed (e.g., 'USER_CREATED', 'TICKET_UPDATED')
     * @param {string} params.category - Category ('AUTH', 'USER', 'TICKET', etc.)
     * @param {string} params.description - Human-readable description
     * @param {string} params.targetId - ID of affected resource
     * @param {string} params.targetType - Type of affected resource
     * @param {string} params.ipAddress - Client IP address
     * @param {string} params.userAgent - Client user agent
     * @param {Object} params.changes - Before/after values for updates
     * @param {Object} params.metadata - Additional context data
     */
    static async log({
        user,
        action,
        category,
        description,
        targetId = null,
        targetType = null,
        ipAddress = null,
        userAgent = null,
        changes = null,
        metadata = null
    }) {
        try {
            const logEntry = new ActivityLog({
                userId: user.id || user._id || user.email,
                userEmail: user.email || 'unknown',
                userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Unknown User',
                action,
                category,
                description,
                targetId,
                targetType,
                ipAddress,
                userAgent,
                changes,
                metadata
            });

            await logEntry.save();
            
            // Optional: Console log for immediate visibility
            console.log(`📋 ACTIVITY LOG: ${category}/${action} by ${logEntry.userName} (${logEntry.userEmail}) - ${description}`);
            
        } catch (error) {
            console.error('❌ Failed to log activity:', error);
            // Don't throw error - logging failures shouldn't break the main operation
        }
    }

    /**
     * Authentication-related logging
     */
    static async logAuth(user, action, description, req = null) {
        return this.log({
            user,
            action,
            category: 'AUTH',
            description,
            ipAddress: req?.ip || req?.connection?.remoteAddress,
            userAgent: req?.get('User-Agent')
        });
    }

    /**
     * User management logging
     */
    static async logUser(user, action, description, targetUser = null, changes = null, req = null) {
        return this.log({
            user,
            action,
            category: 'USER',
            description,
            targetId: targetUser?.id || targetUser?._id || targetUser?.email,
            targetType: 'user',
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            changes
        });
    }

    /**
     * Ticket-related logging
     */
    static async logTicket(user, action, description, ticket = null, changes = null, req = null) {
        return this.log({
            user,
            action,
            category: 'TICKET',
            description,
            targetId: ticket?.id || ticket?._id,
            targetType: 'ticket',
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            changes,
            metadata: ticket ? {
                ticketTitle: ticket.title,
                ticketStatus: ticket.status,
                assignedTo: ticket.assignedTo
            } : null
        });
    }

    /**
     * Department-related logging
     */
    static async logDepartment(user, action, description, department = null, changes = null, req = null) {
        return this.log({
            user,
            action,
            category: 'DEPARTMENT',
            description,
            targetId: department?.id || department?._id,
            targetType: 'department',
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            changes
        });
    }

    /**
     * Technician-related logging
     */
    static async logTechnician(user, action, description, technician = null, changes = null, req = null) {
        return this.log({
            user,
            action,
            category: 'TECHNICIAN',
            description,
            targetId: technician?.id || technician?._id,
            targetType: 'technician',
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            changes
        });
    }

    /**
     * Absence-related logging
     */
    static async logAbsence(user, action, description, absence = null, changes = null, req = null) {
        return this.log({
            user,
            action,
            category: 'ABSENCE',
            description,
            targetId: absence?.id || absence?._id,
            targetType: 'absence',
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            changes
        });
    }

    /**
     * Skill-related logging
     */
    static async logSkill(user, action, description, skill = null, changes = null, req = null) {
        return this.log({
            user,
            action,
            category: 'SKILL',
            description,
            targetId: skill?.id || skill?._id,
            targetType: 'skill',
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            changes
        });
    }

    /**
     * Bug report-related logging
     */
    static async logBugReport(user, action, description, bugReport = null, changes = null, req = null) {
        return this.log({
            user,
            action,
            category: 'BUG_REPORT',
            description,
            targetId: bugReport?.id || bugReport?._id,
            targetType: 'bug_report',
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            changes
        });
    }

    /**
     * System-related logging
     */
    static async logSystem(user, action, description, changes = null, req = null) {
        return this.log({
            user,
            action,
            category: 'SYSTEM',
            description,
            targetType: 'system',
            ipAddress: req?.ip,
            userAgent: req?.get('User-Agent'),
            changes
        });
    }
}

module.exports = ActivityLogger;