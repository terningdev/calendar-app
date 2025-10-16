const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Technician = require('../models/Technician');

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

    const technician = await Technician.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('department', 'name');
    
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    
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
    const technician = await Technician.findByIdAndDelete(req.params.id);
    if (!technician) {
      return res.status(404).json({ message: 'Technician not found' });
    }
    res.json({ message: 'Technician deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting technician', error: error.message });
  }
});

module.exports = router;