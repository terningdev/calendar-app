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
        createdAt = new Date()
    }) {
        this.username = username; // only for sysadmin
        this.password = password;
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.email = email;
        this.role = role;
        this.approved = approved;
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

    // Check if user is approved and can login
    canLogin() {
        if (this.role === 'sysadmin') return true;
        return this.approved;
    }
}

module.exports = User;