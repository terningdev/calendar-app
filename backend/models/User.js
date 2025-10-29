const mongoose = require('mongoose');

class User {
    constructor({
        username, // for sysadmin only
        password,
        firstName,
        lastName,
        phone,
        email,
        role = 'user',
        approved = false,
        requirePasswordReset = false,
        createdAt = new Date()
    }) {
        this.username = username; // only for sysadmin
        this.password = password;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.email = email;
        this.role = role; // 'user', 'technician', 'administrator', 'sysadmin'
        this.approved = approved;
        this.requirePasswordReset = requirePasswordReset;
        this.createdAt = createdAt;
    }

    // Convert to plain object for storage
    toObject() {
        return {
            username: this.username,
            password: this.password,
            firstName: this.firstName,
            lastName: this.lastName,
            phone: this.phone,
            email: this.email,
            role: this.role,
            approved: this.approved,
            requirePasswordReset: this.requirePasswordReset,
            createdAt: this.createdAt
        };
    }

    // Create from plain object
    static fromObject(obj) {
        return new User(obj);
    }

    // Validate email
    static isValidEmail(email) {
        const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        return emailRegex.test(email);
    }

    // Validate password (min 6 chars)
    static isValidPassword(password) {
        return typeof password === 'string' && password.length >= 6;
    }

    // Validate first/last name
    static isValidName(name) {
        return name && name.trim().length >= 2;
    }

    // Validate phone number (Norwegian format)
    static isValidPhone(phone) {
        const phoneRegex = /^[0-9]{8}$/;
        return phoneRegex.test(phone);
    }

    // Check if user can approve registrations
    canApproveUsers() {
        return this.role === 'administrator' || this.role === 'sysadmin';
    }

    // Check if user can manage all users
    canManageUsers() {
        return this.role === 'administrator' || this.role === 'sysadmin';
    }

    // Check if user is approved and can login
    canLogin() {
        if (this.role === 'sysadmin') return true;
        return this.approved;
    }

    // Validate role against existing permissions in database
    static async isValidRole(role) {
        try {
            console.log('Validating role:', role);
            // Use mongoose connection to access the permissions collection directly
            const db = mongoose.connection.db;
            const permissionsCollection = db.collection('permissions');
            
            const allRoles = await permissionsCollection.find({}, { projection: { role: 1 } }).toArray();
            console.log('Available roles in database:', allRoles.map(r => r.role));
            
            const existingRole = await permissionsCollection.findOne({ role: role });
            const isValid = existingRole !== null;
            console.log('Role validation result:', isValid);
            return isValid;
        } catch (error) {
            console.error('Error validating role:', error);
            // Fallback to sysadmin if there's an error
            return role === 'sysadmin';
        }
    }
}

module.exports = User;