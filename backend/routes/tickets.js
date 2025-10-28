const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const { requireAuth, checkTicketOwnership, hasPermission } = require('../middleware/auth');

// Get all tickets with filtering options
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      assignedTo, 
      startDate, 
      endDate, 
      priority,
      category 
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (assignedTo) {
      // Handle both single value (string) and multiple values (array)
      filter.assignedTo = Array.isArray(assignedTo) 
        ? { $in: assignedTo }
        : assignedTo;
    }
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate) filter.startDate.$lte = new Date(endDate);
    }

    const tickets = await Ticket.find(filter)
      .populate({
        path: 'assignedTo',
        select: 'firstName lastName email department',
        populate: {
          path: 'department',
          select: 'name _id'
        }
      })
      .sort({ startDate: 1 });
    
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching tickets', error: error.message });
  }
});

// Get tickets for calendar view (by date range)
router.get('/calendar', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    const tickets = await Ticket.find({
      startDate: {
        $gte: new Date(start),
        $lte: new Date(end)
      }
    })
    .populate({
      path: 'assignedTo',
      select: 'firstName lastName email department',
      populate: {
        path: 'department',
        select: 'name _id'
      }
    })
    .sort({ startDate: 1 });

    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching calendar tickets', error: error.message });
  }
});

// Get ticket by ID
router.get('/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate({
        path: 'assignedTo',
        select: 'firstName lastName email phone department',
        populate: {
          path: 'department',
          select: 'name _id'
        }
      });
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ticket', error: error.message });
  }
});

// Create new ticket
router.post('/', requireAuth, [
  body('ticketNumber').trim().notEmpty().withMessage('Ticket number is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  // No validation for description - allow any value including empty strings
  body('createdBy').trim().notEmpty().withMessage('Created by is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('assignedTo').optional().custom((value) => {
    if (Array.isArray(value)) {
      // If it's an array, validate each ID
      for (const id of value) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error('Invalid technician ID in array');
        }
      }
      return true;
    } else if (typeof value === 'string' && value.trim() !== '') {
      // Single ID validation (for backwards compatibility)
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid technician ID');
      }
      return true;
    }
    return true; // Optional field, so undefined/null is valid
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user has permission to create tickets
    const canCreate = await hasPermission(req.session.user, 'createTickets');
    if (!canCreate) {
      return res.status(403).json({ 
        message: 'You do not have permission to create tickets' 
      });
    }

    // Check if user is trying to assign the ticket
    if (req.body.assignedTo) {
      // Check if user has permission to assign tickets
      const canAssign = await hasPermission(req.session.user, 'assignTickets');
      if (!canAssign) {
        return res.status(403).json({ 
          message: 'You do not have permission to assign tickets' 
        });
      }
    }

    const ticket = new Ticket(req.body);
    await ticket.save();
    await ticket.populate({
      path: 'assignedTo',
      select: 'firstName lastName email department',
      populate: {
        path: 'department',
        select: 'name _id'
      }
    });
    res.status(201).json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error creating ticket', error: error.message });
  }
});

// Update ticket
router.put('/:id', requireAuth, [
  body('ticketNumber').optional().trim().notEmpty().withMessage('Ticket number cannot be empty'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  // No validation for description - allow any value including empty strings
  body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('assignedTo').optional().custom((value) => {
    if (Array.isArray(value)) {
      // If it's an array, validate each ID
      for (const id of value) {
        if (!mongoose.Types.ObjectId.isValid(id)) {
          throw new Error('Invalid technician ID in array');
        }
      }
      return true;
    } else if (typeof value === 'string' && value.trim() !== '') {
      // Single ID validation (for backwards compatibility)
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid technician ID');
      }
      return true;
    }
    return true; // Optional field, so undefined/null is valid
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Fetch the ticket with populated assignedTo to check ownership
    const existingTicket = await Ticket.findById(req.params.id).populate({
      path: 'assignedTo',
      select: 'email firstName lastName'
    });

    if (!existingTicket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Check if user owns this ticket
    const userEmail = req.session.user.email;
    const ownsTicket = await checkTicketOwnership(userEmail, existingTicket);

    console.log('🔍 Ticket Edit Check:', {
      userEmail,
      userRole: req.session.user.role,
      ticketId: req.params.id,
      ownsTicket,
      assignedTechnicians: existingTicket.assignedTo ? 
        (Array.isArray(existingTicket.assignedTo) 
          ? existingTicket.assignedTo.map(t => t.email) 
          : [existingTicket.assignedTo.email]) 
        : []
    });

    // Check permissions
    const canEditOwn = await hasPermission(req.session.user, 'editOwnTickets');
    const canEditAll = await hasPermission(req.session.user, 'editAllTickets');

    console.log('🔍 Permissions:', { canEditOwn, canEditAll });

    // Determine if user can edit this ticket
    let canEdit = false;
    if (canEditAll) {
      canEdit = true;
    } else if (canEditOwn && ownsTicket) {
      canEdit = true;
    }

    if (!canEdit) {
      console.log('❌ Edit denied:', { canEditOwn, canEditAll, ownsTicket });
      
      let errorMessage;
      if (!canEditOwn && !canEditAll) {
        errorMessage = 'You do not have permission to edit tickets. Please contact your administrator.';
      } else if (canEditOwn && !ownsTicket) {
        const assignedEmails = existingTicket.assignedTo 
          ? (Array.isArray(existingTicket.assignedTo) 
              ? existingTicket.assignedTo.map(t => t.email).join(', ') 
              : existingTicket.assignedTo.email)
          : 'none';
        errorMessage = `You can only edit tickets assigned to you. This ticket is assigned to: ${assignedEmails}. Your email: ${userEmail}`;
      } else {
        errorMessage = 'You do not have permission to edit this ticket.';
      }
      
      return res.status(403).json({ message: errorMessage });
    }

    // If user is trying to change the assignedTo field, check assignTickets permission
    if (req.body.hasOwnProperty('assignedTo')) {
      // Check if assignedTo is actually being changed
      const oldAssignedTo = existingTicket.assignedTo 
        ? (Array.isArray(existingTicket.assignedTo) 
            ? existingTicket.assignedTo.map(t => t._id.toString()).sort().join(',')
            : existingTicket.assignedTo._id.toString())
        : null;
      
      const newAssignedTo = req.body.assignedTo
        ? (Array.isArray(req.body.assignedTo)
            ? req.body.assignedTo.sort().join(',')
            : req.body.assignedTo.toString())
        : null;
      
      const isChangingAssignment = oldAssignedTo !== newAssignedTo;
      
      console.log('🔍 Assignment change check:', { 
        oldAssignedTo, 
        newAssignedTo, 
        isChangingAssignment 
      });
      
      if (isChangingAssignment) {
        const canAssign = await hasPermission(req.session.user, 'assignTickets');
        if (!canAssign) {
          return res.status(403).json({ 
            message: 'You do not have permission to change ticket assignments' 
          });
        }
      }
    }

    // Build update object explicitly to handle empty descriptions
    const updateData = {};
    if (req.body.hasOwnProperty('ticketNumber')) updateData.ticketNumber = req.body.ticketNumber;
    if (req.body.hasOwnProperty('title')) updateData.title = req.body.title;
    if (req.body.hasOwnProperty('description')) updateData.description = req.body.description !== undefined ? req.body.description : '';
    if (req.body.hasOwnProperty('address')) updateData.address = req.body.address !== undefined ? req.body.address : '';
    if (req.body.hasOwnProperty('startDate')) updateData.startDate = req.body.startDate;
    if (req.body.hasOwnProperty('endDate')) updateData.endDate = req.body.endDate;
    if (req.body.hasOwnProperty('assignedTo')) updateData.assignedTo = req.body.assignedTo;
    if (req.body.hasOwnProperty('createdBy')) updateData.createdBy = req.body.createdBy;
    if (req.body.hasOwnProperty('activityNumbers')) updateData.activityNumbers = req.body.activityNumbers;

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate({
      path: 'assignedTo',
      select: 'firstName lastName email department',
      populate: {
        path: 'department',
        select: 'name _id'
      }
    });
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error updating ticket', error: error.message });
  }
});

// Add note to ticket
router.post('/:id/notes', [
  body('content').trim().notEmpty().withMessage('Note content is required'),
  body('addedBy').trim().notEmpty().withMessage('Added by is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    ticket.notes.push({
      content: req.body.content,
      addedBy: req.body.addedBy,
      addedAt: new Date()
    });

    await ticket.save();
    await ticket.populate({
      path: 'assignedTo',
      select: 'firstName lastName email department',
      populate: {
        path: 'department',
        select: 'name _id'
      }
    });
    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error adding note', error: error.message });
  }
});

// Delete ticket
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Check if user has permission to delete tickets
    const canDelete = await hasPermission(req.session.user, 'deleteTickets');
    if (!canDelete) {
      return res.status(403).json({ 
        message: 'You do not have permission to delete tickets' 
      });
    }

    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    res.json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting ticket', error: error.message });
  }
});

module.exports = router;