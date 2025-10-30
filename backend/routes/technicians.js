const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Technician = require('../models/Technician');
const ActivityLogger = require('../services/ActivityLogger');

// Get all technicians
router.get('/', async (req, res) => {
  try {
    const technicians = await Technician.find()
      .populate('department', 'name')
      .sort({ lastName: 1, firstName: 1 });
    res.json(technicians);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching technicians', error: error.message });
  }
});

// Get technician by ID
router.get('/:id', async (req, res) => {
  try {
    const technician = await Technician.findById(req.params.id).populate('department', 'name');
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    res.json(technician);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching technician', error: error.message });
  }
});

// Get technicians by department
router.get('/department/:departmentId', async (req, res) => {
  try {
    const technicians = await Technician.find({ 
      department: req.params.departmentId,
      isActive: true 
    }).populate('department', 'name').sort({ lastName: 1, firstName: 1 });
    res.json(technicians);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching technicians', error: error.message });
  }
});

// Create new technician
router.post('/', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('department').notEmpty().withMessage('Department is required'),
  body('skills').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const technician = new Technician(req.body);
    await technician.save();
    await technician.populate('department', 'name');

    // Log technician creation
    await ActivityLogger.logTechnician(
      req.session?.user,
      'TECHNICIAN_CREATED',
      `Created technician "${technician.firstName} ${technician.lastName}"`,
      req,
      null,
      {
        technicianId: technician._id,
        firstName: technician.firstName,
        lastName: technician.lastName,
        email: technician.email,
        department: technician.department,
        skills: technician.skills
      }
    );

    res.status(201).json(technician);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Error creating technician', error: error.message });
    }
  }
});

// Update technician
router.put('/:id', [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('department').notEmpty().withMessage('Department is required'),
  body('skills').optional().isArray()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get existing technician for logging changes
    const existingTechnician = await Technician.findById(req.params.id).populate('department', 'name');
    if (!existingTechnician) {
      return res.status(404).json({ message: 'Technician not found' });
    }

    const technician = await Technician.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('department', 'name');

    // Log technician update
    const changes = {};
    if (existingTechnician.firstName !== req.body.firstName) {
      changes.firstName = { from: existingTechnician.firstName, to: req.body.firstName };
    }
    if (existingTechnician.lastName !== req.body.lastName) {
      changes.lastName = { from: existingTechnician.lastName, to: req.body.lastName };
    }
    if (existingTechnician.email !== req.body.email) {
      changes.email = { from: existingTechnician.email, to: req.body.email };
    }
    if (existingTechnician.phone !== req.body.phone) {
      changes.phone = { from: existingTechnician.phone, to: req.body.phone };
    }
    if (existingTechnician.department._id.toString() !== req.body.department) {
      changes.department = { from: existingTechnician.department._id, to: req.body.department };
    }
    if (JSON.stringify(existingTechnician.skills) !== JSON.stringify(req.body.skills)) {
      changes.skills = { from: existingTechnician.skills, to: req.body.skills };
    }

    await ActivityLogger.logTechnician(
      req.session?.user,
      'TECHNICIAN_UPDATED',
      `Updated technician "${technician.firstName} ${technician.lastName}"`,
      req,
      changes,
      {
        technicianId: technician._id,
        firstName: technician.firstName,
        lastName: technician.lastName,
        email: technician.email,
        fieldsUpdated: Object.keys(changes)
      }
    );
    
    res.json(technician);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Email already exists' });
    } else {
      res.status(500).json({ message: 'Error updating technician', error: error.message });
    }
  }
});

// Delete technician
router.delete('/:id', async (req, res) => {
  try {
    // Get technician details before deletion for logging
    const technicianToDelete = await Technician.findById(req.params.id).populate('department', 'name');
    if (!technicianToDelete) {
      return res.status(404).json({ message: 'Technician not found' });
    }

    const technician = await Technician.findByIdAndDelete(req.params.id);

    // Log technician deletion
    await ActivityLogger.logTechnician(
      req.session?.user,
      'TECHNICIAN_DELETED',
      `Deleted technician "${technicianToDelete.firstName} ${technicianToDelete.lastName}"`,
      req,
      null,
      {
        technicianId: technicianToDelete._id,
        firstName: technicianToDelete.firstName,
        lastName: technicianToDelete.lastName,
        email: technicianToDelete.email,
        originalData: {
          firstName: technicianToDelete.firstName,
          lastName: technicianToDelete.lastName,
          email: technicianToDelete.email,
          department: technicianToDelete.department,
          skills: technicianToDelete.skills
        }
      }
    );

    res.json({ message: 'Technician deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting technician', error: error.message });
  }
});

module.exports = router;