const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  regionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Region',
    required: false // Allow null for backward compatibility
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create compound unique index to allow same department name in different regions
departmentSchema.index({ name: 1, regionId: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);