const express = require('express');
const router = express.Router();

// For Node.js versions that don't have global fetch
const fetch = globalThis.fetch || require('node-fetch');

// Render API configuration - these should be in environment variables on the server
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;
const RENDER_API_KEY = process.env.RENDER_API_KEY;

// Get deployment status from Render API
router.get('/status', async (req, res) => {
  try {
    if (!RENDER_SERVICE_ID || !RENDER_API_KEY) {
      return res.status(503).json({ 
        error: 'Deployment monitoring not configured',
        message: 'Render API credentials not set on server'
      });
    }

    const response = await fetch(`https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys`, {
      headers: {
        'Authorization': `Bearer ${RENDER_API_KEY}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Render API error: ${response.status}`);
    }

    const data = await response.json();
    const latestDeploy = data[0]; // Most recent deployment

    if (!latestDeploy) {
      return res.json({
        status: 'no_deployments',
        message: 'No deployments found'
      });
    }

    // Return sanitized deployment info
    res.json({
      id: latestDeploy.id,
      status: latestDeploy.status,
      createdAt: latestDeploy.createdAt,
      updatedAt: latestDeploy.updatedAt,
      finishedAt: latestDeploy.finishedAt,
      commit: latestDeploy.commit ? {
        id: latestDeploy.commit.id,
        message: latestDeploy.commit.message,
        createdAt: latestDeploy.commit.createdAt
      } : null
    });

  } catch (error) {
    console.error('Deployment status error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch deployment status',
      message: error.message 
    });
  }
});

module.exports = router;