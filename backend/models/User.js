class User {
    constructor({ phone, pin, fullName, role = 'user', approved = false, createdAt = new Date() }) {
        this.phone = phone;
        this.pin = pin;
        this.fullName = fullName;
        this.role = role; // 'user', 'administrator', 'sysadmin'
        this.approved = approved;
        this.createdAt = createdAt;
    }

    // Convert to plain object for storage
    toObject() {
        return {
            phone: this.phone,
            pin: this.pin,
            fullName: this.fullName,
            role: this.role,
            approved: this.approved,
            createdAt: this.createdAt
        };
    }

    // Create from plain object
    static fromObject(obj) {
        return new User(obj);
    }

    // Validate phone number (Norwegian format)
    static isValidPhone(phone) {
        const phoneRegex = /^[0-9]{8}$/;
        return phoneRegex.test(phone);
    }

    // Validate PIN code (4 digits)
    static isValidPin(pin) {
        const pinRegex = /^[0-9]{4}$/;
        return pinRegex.test(pin);
    }

    // Validate full name
    static isValidName(name) {
        return name && name.trim().length >= 2;
    }

    // Check if user can approve registrations
    canApproveUsers() {
        return this.role === 'administrator' || this.role === 'sysadmin';
    }

    // Check if user is approved and can login
    canLogin() {
        return this.approved && (this.role === 'sysadmin' || this.approved);
    }
}

module.exports = User;