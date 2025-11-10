const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Department = require('../models/Department');
const ActivityLogger = require('../services/ActivityLogger');

// Get all departments (with optional region filtering)
router.get('/', async (req, res) => {
  try {
    let filter = {};
    
    // Filter by region if regionId is provided
    if (req.query.regionId) {
      filter.regionId = req.query.regionId;
    }
    
    const departments = await Department.find(filter)
      .populate('regionId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ name: 1 });
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
});

// Get department by ID
router.get('/:id', async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('regionId', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }
    res.json(department);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching department', error: error.message });
  }
});

// Create new department
router.post('/', [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('description').optional().trim(),
  body('regionId').optional().isMongoId().withMessage('Invalid region ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const department = new Department(req.body);
    await department.save();

    // Log department creation
    await ActivityLogger.logDepartment(
      req.session?.user,
      'DEPARTMENT_CREATED',
      `Created department "${department.name}"`,
      department,
      null,
      req
    );

    res.status(201).json(department);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Department name already exists' });
    } else {
      res.status(500).json({ message: 'Error creating department', error: error.message });
    }
  }
});

// Update department
router.put('/:id', [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get existing department for logging changes
    const existingDepartment = await Department.findById(req.params.id);
    if (!existingDepartment) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    // Log department update
    const changes = {};
    if (existingDepartment.name !== req.body.name) {
      changes.name = { from: existingDepartment.name, to: req.body.name };
    }
    if (existingDepartment.description !== req.body.description) {
      changes.description = { from: existingDepartment.description, to: req.body.description };
    }

    await ActivityLogger.logDepartment(
      req.session?.user,
      'DEPARTMENT_UPDATED',
      `Updated department "${department.name}"`,
      department,
      changes,
      req
    );
    
    res.json(department);
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ message: 'Department name already exists' });
    } else {
      res.status(500).json({ message: 'Error updating department', error: error.message });
    }
  }
});

// Delete department
router.delete('/:id', async (req, res) => {
  try {
    // Get department details before deletion for logging
    const departmentToDelete = await Department.findById(req.params.id);
    if (!departmentToDelete) {
      return res.status(404).json({ message: 'Department not found' });
    }

    const department = await Department.findByIdAndDelete(req.params.id);

    // Log department deletion
    await ActivityLogger.logDepartment(
      req.session?.user,
      'DEPARTMENT_DELETED',
      `Deleted department "${departmentToDelete.name}"`,
      departmentToDelete,
      null,
      req
    );

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting department', error: error.message });
  }
});

module.exports = router;