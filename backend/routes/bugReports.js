const express = require('express');
const router = express.Router();
const BugReport = require('../models/BugReport');
const { PermissionsModel } = require('../models/PermissionsModel');

// Helper function to get user permissions
const getUserPermissions = async (role) => {
  try {
    if (role === 'sysadmin') {
      return {
        submitBugReport: true,
        viewBugReports: true
      };
    }
    const rolePermissions = await PermissionsModel.findOne({ role });
    return rolePermissions ? rolePermissions.permissions : {};
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return {};
  }
};

// GET all bug reports (admin only)
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // Get user role from session or database
    const User = require('../models/User');
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check viewBugReports permission
    const permissions = await getUserPermissions(user.role);
    if (!permissions.viewBugReports) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bugReports = await BugReport.find()
      .populate('submittedBy', 'firstName lastName username')
      .sort({ createdAt: -1 });
    
    res.json(bugReports);
  } catch (error) {
    console.error('Error fetching bug reports:', error);
    res.status(500).json({ message: 'Error fetching bug reports', error: error.message });
  }
});

// GET count of bug reports
router.get('/count', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check viewBugReports permission
    const permissions = await getUserPermissions(user.role);
    if (!permissions.viewBugReports) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const count = await BugReport.countDocuments();
    res.json({ count });
  } catch (error) {
    console.error('Error counting bug reports:', error);
    res.status(500).json({ message: 'Error counting bug reports', error: error.message });
  }
});

// POST create new bug report
router.post('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Bug report message is required' });
    }

    // Get user info
    const User = require('../models/User');
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check submitBugReport permission
    const permissions = await getUserPermissions(user.role);
    if (!permissions.submitBugReport) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bugReport = new BugReport({
      message: message.trim(),
      submittedBy: user._id,
      submittedByName: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user.username
    });

    await bugReport.save();
    
    // Populate the submittedBy field before sending response
    await bugReport.populate('submittedBy', 'firstName lastName username');
    
    res.status(201).json(bugReport);
  } catch (error) {
    console.error('Error creating bug report:', error);
    res.status(500).json({ message: 'Error creating bug report', error: error.message });
  }
});

// DELETE bug report (admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const User = require('../models/User');
    const user = await User.findById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check viewBugReports permission
    const permissions = await getUserPermissions(user.role);
    if (!permissions.viewBugReports) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const bugReport = await BugReport.findByIdAndDelete(req.params.id);
    
    if (!bugReport) {
      return res.status(404).json({ message: 'Bug report not found' });
    }
    
    res.json({ message: 'Bug report deleted successfully' });
  } catch (error) {
    console.error('Error deleting bug report:', error);
    res.status(500).json({ message: 'Error deleting bug report', error: error.message });
  }
});

module.exports = router;
