const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Absence = require('../models/Absence');
const ActivityLogger = require('../services/ActivityLogger');

// Get all absences
router.get('/', async (req, res) => {
  try {
    const { technicianId, startDate, endDate } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (technicianId) filter.technicianId = technicianId;
    
    if (startDate || endDate) {
      filter.$or = [
        {
          startDate: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) })
          }
        },
        {
          endDate: {
            ...(startDate && { $gte: new Date(startDate) }),
            ...(endDate && { $lte: new Date(endDate) })
          }
        },
        {
          $and: [
            { startDate: { $lte: new Date(startDate || endDate) } },
            { endDate: { $gte: new Date(endDate || startDate) } }
          ]
        }
      ];
    }

    const absences = await Absence.find(filter)
      .populate('technicianId', 'firstName lastName email fullName')
      .sort({ startDate: 1 });
    
    res.json(absences);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching absences', error: error.message });
  }
});

// Get absences for calendar view (by date range)
router.get('/calendar', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start || !end) {
      return res.status(400).json({ message: 'Start and end dates are required' });
    }

    const absences = await Absence.find({
      $or: [
        {
          startDate: {
            $gte: new Date(start),
            $lte: new Date(end)
          }
        },
        {
          endDate: {
            $gte: new Date(start),
            $lte: new Date(end)
          }
        },
        {
          $and: [
            { startDate: { $lte: new Date(start) } },
            { endDate: { $gte: new Date(end) } }
          ]
        }
      ]
    })
    .populate('technicianId', 'firstName lastName fullName')
    .sort({ startDate: 1 });

    res.json(absences);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching calendar absences', error: error.message });
  }
});

// Get absence by ID
router.get('/:id', async (req, res) => {
  try {
    const absence = await Absence.findById(req.params.id)
      .populate('technicianId', 'firstName lastName email fullName');
    if (!absence) {
      return res.status(404).json({ message: 'Absence not found' });
    }
    res.json(absence);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching absence', error: error.message });
  }
});

// Create new absence
router.post('/', [
  body('technicianId').isMongoId().withMessage('Valid technician ID is required'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('createdBy').trim().notEmpty().withMessage('Created by is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const absence = new Absence(req.body);
    await absence.save();
    await absence.populate('technicianId', 'firstName lastName email fullName');

    // Log absence creation
    await ActivityLogger.logAbsence(
      req.session?.user,
      'ABSENCE_CREATED',
      `Created absence "${absence.title}" for ${absence.technicianId.fullName}`,
      req,
      null,
      {
        absenceId: absence._id,
        title: absence.title,
        technicianId: absence.technicianId._id,
        technicianName: absence.technicianId.fullName,
        startDate: absence.startDate,
        endDate: absence.endDate,
        createdBy: absence.createdBy
      }
    );

    res.status(201).json(absence);
  } catch (error) {
    res.status(500).json({ message: 'Error creating absence', error: error.message });
  }
});

// Update absence
router.put('/:id', [
  body('technicianId').optional().isMongoId().withMessage('Valid technician ID is required'),
  body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Get existing absence for logging changes
    const existingAbsence = await Absence.findById(req.params.id).populate('technicianId', 'firstName lastName email fullName');
    if (!existingAbsence) {
      return res.status(404).json({ message: 'Absence not found' });
    }

    const absence = await Absence.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('technicianId', 'firstName lastName email fullName');

    // Log absence update
    const changes = {};
    if (req.body.technicianId && existingAbsence.technicianId._id.toString() !== req.body.technicianId) {
      changes.technicianId = { from: existingAbsence.technicianId._id, to: req.body.technicianId };
    }
    if (req.body.title && existingAbsence.title !== req.body.title) {
      changes.title = { from: existingAbsence.title, to: req.body.title };
    }
    if (req.body.startDate && existingAbsence.startDate.toISOString() !== new Date(req.body.startDate).toISOString()) {
      changes.startDate = { from: existingAbsence.startDate, to: req.body.startDate };
    }
    if (req.body.endDate && existingAbsence.endDate.toISOString() !== new Date(req.body.endDate).toISOString()) {
      changes.endDate = { from: existingAbsence.endDate, to: req.body.endDate };
    }

    await ActivityLogger.logAbsence(
      req.session?.user,
      'ABSENCE_UPDATED',
      `Updated absence "${absence.title}" for ${absence.technicianId.fullName}`,
      req,
      changes,
      {
        absenceId: absence._id,
        title: absence.title,
        technicianId: absence.technicianId._id,
        technicianName: absence.technicianId.fullName,
        fieldsUpdated: Object.keys(changes)
      }
    );

    res.json(absence);
  } catch (error) {
    res.status(500).json({ message: 'Error updating absence', error: error.message });
  }
});

// Delete absence
router.delete('/:id', async (req, res) => {
  try {
    // Get absence details before deletion for logging
    const absenceToDelete = await Absence.findById(req.params.id).populate('technicianId', 'firstName lastName email fullName');
    if (!absenceToDelete) {
      return res.status(404).json({ message: 'Absence not found' });
    }

    const absence = await Absence.findByIdAndDelete(req.params.id);

    // Log absence deletion
    await ActivityLogger.logAbsence(
      req.session?.user,
      'ABSENCE_DELETED',
      `Deleted absence "${absenceToDelete.title}" for ${absenceToDelete.technicianId.fullName}`,
      req,
      null,
      {
        absenceId: absenceToDelete._id,
        title: absenceToDelete.title,
        technicianId: absenceToDelete.technicianId._id,
        technicianName: absenceToDelete.technicianId.fullName,
        originalData: {
          title: absenceToDelete.title,
          startDate: absenceToDelete.startDate,
          endDate: absenceToDelete.endDate,
          createdBy: absenceToDelete.createdBy
        }
      }
    );

    res.json({ message: 'Absence deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting absence', error: error.message });
  }
});

module.exports = router;