const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        unique: true,
        sparse: true // Allow null/undefined for non-sysadmin users
    },
    password: { 
        type: String, 
        required: true 
    },
    firstName: String,
    lastName: String,
    phone: String,
    email: { 
        type: String, 
        required: function() {
            // Email is required for all users except sysadmin
            return this.role !== 'sysadmin';
        },
        unique: true,
        sparse: true, // Allow null values to be non-unique
        lowercase: true
    },
    role: { 
        type: String, 
        enum: ['user', 'technician', 'administrator', 'sysadmin'],
        default: 'technician'
    },
    approved: { 
        type: Boolean, 
        default: false 
    },
    requirePasswordReset: { 
        type: Boolean, 
        default: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Add instance methods from the User class
userSchema.methods.isValidPassword = function(password) {
    return this.password === password;
};

userSchema.methods.canApproveUsers = function() {
    return this.role === 'administrator' || this.role === 'sysadmin';
};

userSchema.methods.canManageUsers = function() {
    return this.role === 'administrator' || this.role === 'sysadmin';
};

userSchema.methods.canAccessAdminPanel = function() {
    return this.role === 'administrator' || this.role === 'sysadmin';
};

// Static method to validate email
userSchema.statics.isValidEmail = function(email) {
    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    return emailRegex.test(email);
};

module.exports = mongoose.model('User', userSchema);
