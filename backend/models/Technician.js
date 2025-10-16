const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  skills: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Virtual for full name
technicianSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
technicianSchema.set('toJSON', {
  virtuals: true
});

module.exports = mongoose.model('Technician', technicianSchema);