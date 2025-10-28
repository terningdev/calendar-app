const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: false
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Technician',
    required: false
  }],
  createdBy: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: false
  },
  activityNumbers: [{
    type: String,
    trim: true
  }],
  address: {
    type: String,
    required: false,
    trim: true
  },
  notes: [{
    content: {
      type: String,
      required: true
    },
    addedBy: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient calendar queries
ticketSchema.index({ startDate: 1 });
ticketSchema.index({ assignedTo: 1, startDate: 1 });

module.exports = mongoose.model('Ticket', ticketSchema);