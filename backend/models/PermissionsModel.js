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

const PermissionsModel = mongoose.model('Permissions', permissionsSchema);

// Function to initialize default permissions for all roles
async function initializeDefaultPermissions() {
    try {
        console.log('Initializing default role permissions...');
        
        // Default permissions for User role (basic, read-only access)
        const userPermissions = {
            role: 'user',
            permissions: {
                viewDashboard: true,
                viewCalendar: true,
                viewTickets: false,
                viewAdministrator: false,
                viewAbsences: false,
                viewSkills: false,
                
                createTickets: false,
                editOwnTickets: false,
                editAllTickets: false,
                deleteTickets: false,
                assignTickets: false,
                
                viewUsers: false,
                manageUsers: false,
                approveUsers: false,
                
                submitBugReport: true,
                viewBugReports: false,
                
                manageDepartments: false,
                manageTechnicians: false,
                viewSystemStatus: false,
                managePermissions: false
            }
        };
        
        // Default permissions for Technician role
        const technicianPermissions = {
            role: 'technician',
            permissions: {
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
                
                submitBugReport: true,
                viewBugReports: false,
                
                manageDepartments: false,
                manageTechnicians: false,
                viewSystemStatus: false,
                managePermissions: false
            }
        };
        
        // Default permissions for Administrator role
        const administratorPermissions = {
            role: 'administrator',
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
        
        // Default permissions for Sysadmin role
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
        
        // Create or update permissions for each role
        for (const rolePermissions of [userPermissions, technicianPermissions, administratorPermissions, sysadminPermissions]) {
            const existing = await PermissionsModel.findOne({ role: rolePermissions.role });
            if (!existing) {
                await PermissionsModel.create(rolePermissions);
                console.log(`Created default permissions for ${rolePermissions.role} role`);
            } else {
                console.log(`Permissions for ${rolePermissions.role} role already exist`);
            }
        }
        
        console.log('Default permissions initialization complete');
    } catch (error) {
        console.error('Error initializing default permissions:', error);
    }
}

module.exports = { PermissionsModel, initializeDefaultPermissions };
