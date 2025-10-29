const mongoose = require('mongoose');

const permissionsSchema = new mongoose.Schema({
    role: { 
        type: String, 
        required: true,
        unique: true,
        trim: true
    },
    isCustomRole: {
        type: Boolean,
        default: false
    },
    permissions: {
        // Tab/Page visibility
        viewDashboard: { type: Boolean, default: true },
        viewCalendar: { type: Boolean, default: true },
        viewTickets: { type: Boolean, default: true },
        viewAdministrator: { type: Boolean, default: false },
        viewAbsences: { type: Boolean, default: false },
        viewSkills: { type: Boolean, default: false },
        viewMaps: { type: Boolean, default: false },
        
        // Ticket permissions
        createTickets: { type: Boolean, default: true },
        editOwnTickets: { type: Boolean, default: true },
        editAllTickets: { type: Boolean, default: false },
        deleteTickets: { type: Boolean, default: false },
        assignTickets: { type: Boolean, default: false },
        
        // User management permissions
        viewUsers: { type: Boolean, default: false },
        manageUsers: { type: Boolean, default: false },
        approveUsers: { type: Boolean, default: false },
        
        // Bug report permissions
        submitBugReport: { type: Boolean, default: true },
        viewBugReports: { type: Boolean, default: false },
        
        // Administrative permissions
        manageDepartments: { type: Boolean, default: false },
        manageTechnicians: { type: Boolean, default: false },
        viewSystemStatus: { type: Boolean, default: false },
        managePermissions: { type: Boolean, default: false }
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Update timestamp on save
permissionsSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create or get existing model (prevents OverwriteModelError)
let PermissionsModel;
try {
    PermissionsModel = mongoose.model('Permissions');
} catch (error) {
    PermissionsModel = mongoose.model('Permissions', permissionsSchema);
}

// Function to initialize default permissions for all roles
// DISABLED: This function is no longer called automatically to allow custom roles only
// Users should create their own roles via the RBAC interface
async function initializeDefaultPermissions() {
    try {
        console.log('Note: initializeDefaultPermissions is disabled. Create roles via RBAC interface.');
        
        // Only create sysadmin role if it doesn't exist (required for system)
        const sysadminPermissions = {
            role: 'sysadmin',
            permissions: {
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
            }
        };
        
        // Only create sysadmin if it doesn't exist
        const existing = await PermissionsModel.findOne({ role: 'sysadmin' });
        if (!existing) {
            await PermissionsModel.create(sysadminPermissions);
            console.log('Created sysadmin role (required for system)');
        } else {
            console.log('Sysadmin role already exists');
        }
        
        console.log('Default permissions initialization complete');
    } catch (error) {
        console.error('Error initializing default permissions:', error);
    }
}

module.exports = { PermissionsModel, initializeDefaultPermissions };
