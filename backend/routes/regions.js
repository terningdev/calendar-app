const express = require('express');
const router = express.Router();
const Region = require('../models/Region');
const Department = require('../models/Department');
const { requireAuth } = require('../middleware/auth');

// GET /api/regions - Get all regions
router.get('/', requireAuth, async (req, res) => {
  try {
    const regions = await Region.find()
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName')
      .sort({ name: 1 });
    
    res.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ message: 'Error fetching regions', error: error.message });
  }
});

// GET /api/regions/:id - Get single region with departments
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const region = await Region.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');
    
    if (!region) {
      return res.status(404).json({ message: 'Region not found' });
    }

    // Get departments in this region
    const departments = await Department.find({ regionId: region._id })
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 });

    res.json({
      ...region.toObject(),
      departments
    });
  } catch (error) {
    console.error('Error fetching region:', error);
    res.status(500).json({ message: 'Error fetching region', error: error.message });
  }
});

// POST /api/regions - Create new region
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description } = req.body;

    // Check if region with this name already exists
    const existingRegion = await Region.findOne({ name: name.trim() });
    if (existingRegion) {
      return res.status(400).json({ message: 'Region with this name already exists' });
    }

    const region = new Region({
      name: name.trim(),
      description: description ? description.trim() : '',
      createdBy: req.user.id,
      updatedBy: req.user.id
    });

    await region.save();

    // Populate the created region
    const populatedRegion = await Region.findById(region._id)
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    res.status(201).json(populatedRegion);
  } catch (error) {
    console.error('Error creating region:', error);
    res.status(500).json({ message: 'Error creating region', error: error.message });
  }
});

// PUT /api/regions/:id - Update region
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    // Check if another region with this name exists
    const existingRegion = await Region.findOne({ 
      name: name.trim(), 
      _id: { $ne: req.params.id } 
    });
    if (existingRegion) {
      return res.status(400).json({ message: 'Region with this name already exists' });
    }

    const region = await Region.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        description: description ? description.trim() : '',
        isActive: isActive !== undefined ? isActive : true,
        updatedBy: req.user.id,
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName')
     .populate('updatedBy', 'firstName lastName');

    if (!region) {
      return res.status(404).json({ message: 'Region not found' });
    }

    res.json(region);
  } catch (error) {
    console.error('Error updating region:', error);
    res.status(500).json({ message: 'Error updating region', error: error.message });
  }
});

// DELETE /api/regions/:id - Delete region
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    // Check if region has any departments
    const departmentCount = await Department.countDocuments({ regionId: req.params.id });
    if (departmentCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete region. It has ${departmentCount} department(s) assigned. Please move or delete departments first.` 
      });
    }

    const region = await Region.findByIdAndDelete(req.params.id);
    
    if (!region) {
      return res.status(404).json({ message: 'Region not found' });
    }

    res.json({ message: 'Region deleted successfully' });
  } catch (error) {
    console.error('Error deleting region:', error);
    res.status(500).json({ message: 'Error deleting region', error: error.message });
  }
});

// GET /api/regions/:id/departments - Get departments in a region
router.get('/:id/departments', requireAuth, async (req, res) => {
  try {
    const departments = await Department.find({ regionId: req.params.id })
      .populate('createdBy', 'firstName lastName')
      .sort({ name: 1 });
    
    res.json(departments);
  } catch (error) {
    console.error('Error fetching region departments:', error);
    res.status(500).json({ message: 'Error fetching region departments', error: error.message });
  }
});

module.exports = router;