const express = require('express');
const { runQuery, run } = require('../database/connection');
const { fetchAllCameras, refreshCameras, toggleCameraStatus, toggleAIAnalysisStatus, getCameraStatus } = require('../services/cameraService');
const axios = require('axios'); // Added axios for the new endpoint

const router = express.Router();

// Get all cameras from database
router.get('/', async (req, res) => {
  try {
    const result = await runQuery(`
      SELECT * FROM cameras 
      ORDER BY name ASC
    `);
    
    res.json({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    console.error('Error fetching cameras:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cameras'
    });
  }
});

// Get camera limits and status
router.get('/limits/status', async (req, res) => {
  try {
    const enabledCount = await runQuery('SELECT COUNT(*) as count FROM cameras WHERE enabled = 1');
    const totalCount = await runQuery('SELECT COUNT(*) as count FROM cameras');
    
    const currentEnabled = enabledCount[0]?.count || 0;
    const totalCameras = totalCount[0]?.count || 0;
    const maxEnabled = 5;
    const remainingSlots = Math.max(0, maxEnabled - currentEnabled);
    
    res.json({
      success: true,
      data: {
        current_enabled: currentEnabled,
        total_cameras: totalCameras,
        max_enabled: maxEnabled,
        remaining_slots: remainingSlots,
        can_enable_more: remainingSlots > 0
      }
    });
  } catch (error) {
    console.error('Error getting camera limits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get camera limits'
    });
  }
});

// Get a specific camera by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await runQuery(`
      SELECT * FROM cameras 
      WHERE camera_id = ?
    `, [id]);
    
    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Camera not found'
      });
    }
    
    res.json({
      success: true,
      data: result[0]
    });
  } catch (error) {
    console.error('Error fetching camera:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch camera'
    });
  }
});

// Refresh cameras from MIDOT API
router.post('/refresh', async (req, res) => {
  try {
    console.log('Camera refresh endpoint called');
    const result = await refreshCameras();
    
    res.json({
      success: true,
      message: `Successfully refreshed ${result.processed} cameras`,
      count: result.processed,
      total: result.total,
      errors: result.errors
    });
  } catch (error) {
    console.error('Error refreshing cameras:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cameras'
    });
  }
});

// Test endpoint to debug image fetching
router.get('/:id/test-image', async (req, res) => {
  try {
    const { id } = req.params
    console.log(`Testing image fetch for camera ${id}...`)
    
    const response = await axios.get(`https://mdotjboss.state.mi.us/MiDrive/camera/getCameraInformation/${id}`)
    
    res.json({
      success: true,
      camera_id: id,
      response_data: response.data,
      available_fields: Object.keys(response.data),
      has_image_url: !!(response.data.imageUrl || response.data.image_url || response.data.image || response.data.url || response.data.cameraImage || response.data.camera_image)
    })
  } catch (error) {
    console.error(`Error testing image fetch for camera ${req.params.id}:`, error)
    res.status(500).json({
      success: false,
      error: error.message,
      camera_id: req.params.id
    })
  }
})

// Toggle camera status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'enabled must be a boolean'
      });
    }
    
    const result = await toggleCameraStatus(id, enabled);
    
    res.json({
      success: true,
      message: result.message,
      data: { camera_id: id, enabled }
    });
  } catch (error) {
    console.error('Error toggling camera status:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update camera status'
    });
  }
});

// Toggle AI analysis status for a camera
router.patch('/:id/toggle-ai-analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const { ai_analysis_enabled } = req.body;
    
    if (typeof ai_analysis_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'ai_analysis_enabled must be a boolean'
      });
    }
    
    const result = await toggleAIAnalysisStatus(id, ai_analysis_enabled);
    
    res.json({
      success: true,
      message: result.message,
      data: { camera_id: id, ai_analysis_enabled }
    });
  } catch (error) {
    console.error('Error toggling AI analysis status:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update AI analysis status'
    });
  }
});

// Bulk toggle camera status
router.patch('/bulk-toggle', async (req, res) => {
  try {
    const { cameraIds, enabled } = req.body;
    
    if (!Array.isArray(cameraIds) || typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'cameraIds must be an array and enabled must be a boolean'
      });
    }
    
    if (cameraIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'cameraIds array cannot be empty'
      });
    }
    
    console.log(`Bulk ${enabled ? 'enabling' : 'disabling'} ${cameraIds.length} cameras...`);
    
    // If enabling, check if we would exceed the 5 camera limit
    if (enabled) {
      const currentEnabled = await runQuery('SELECT COUNT(*) as count FROM cameras WHERE enabled = 1');
      const currentCount = currentEnabled[0]?.count || 0;
      
      if (currentCount + cameraIds.length > 5) {
        return res.status(400).json({
          success: false,
          error: `Cannot enable ${cameraIds.length} cameras. Currently ${currentCount} are enabled, and maximum is 5.`
        });
      }
    }
    
    // Update cameras one by one to handle individual failures
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const cameraId of cameraIds) {
      try {
        const result = await toggleCameraStatus(cameraId, enabled);
        results.push({ cameraId, success: true, message: result.message });
        successCount++;
      } catch (error) {
        results.push({ cameraId, success: false, error: error.message });
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Successfully ${enabled ? 'enabled' : 'disabled'} ${successCount} of ${cameraIds.length} cameras`,
      data: {
        total_requested: cameraIds.length,
        successful_updates: successCount,
        failed_updates: errorCount,
        results: results
      }
    });
  } catch (error) {
    console.error('Error bulk toggling cameras:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get camera status
router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const enabled = await getCameraStatus(id);
    
    res.json({
      success: true,
      data: { camera_id: id, enabled }
    });
  } catch (error) {
    console.error('Error getting camera status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Get camera statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const statsResult = await runQuery(`
      SELECT 
        COUNT(*) as total_cameras,
        COUNT(DISTINCT county) as total_counties,
        COUNT(DISTINCT road_name) as total_roads
      FROM cameras
    `);
    
    const recentImagesResult = await runQuery(`
      SELECT 
        COUNT(*) as total_images,
        COUNT(CASE WHEN has_changed = 1 THEN 1 END) as changed_images,
        MAX(created_at) as last_update
      FROM images
      WHERE created_at >= datetime('now', '-24 hours')
    `);
    
    res.json({
      success: true,
      data: {
        cameras: statsResult[0],
        images: recentImagesResult[0]
      }
    });
  } catch (error) {
    console.error('Error fetching camera stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch camera statistics'
    });
  }
});

// Manual trigger for camera image updates
router.post('/update-images', async (req, res) => {
  try {
    console.log('Manual camera image update triggered...');
    
    // Import the updateCameraImages function
    const { updateCameraImages } = require('../services/cameraService');
    
    await updateCameraImages();
    
    res.json({
      success: true,
      message: 'Camera image update completed successfully'
    });
  } catch (error) {
    console.error('Manual camera update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update camera images'
    });
  }
});

// Bulk toggle AI analysis status for multiple cameras
router.patch('/bulk-toggle-ai-analysis', async (req, res) => {
  try {
    const { cameraIds, ai_analysis_enabled } = req.body;
    
    if (!Array.isArray(cameraIds) || typeof ai_analysis_enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'cameraIds must be an array and ai_analysis_enabled must be a boolean'
      });
    }
    
    if (cameraIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'cameraIds array cannot be empty'
      });
    }
    
    console.log(`Bulk ${ai_analysis_enabled ? 'enabling' : 'disabling'} AI analysis for ${cameraIds.length} cameras...`);
    
    // Update cameras one by one to handle individual failures
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const cameraId of cameraIds) {
      try {
        const result = await toggleAIAnalysisStatus(cameraId, ai_analysis_enabled);
        results.push({ cameraId, success: true, message: result.message });
        successCount++;
      } catch (error) {
        results.push({ cameraId, success: false, error: error.message });
        errorCount++;
      }
    }
    
    res.json({
      success: true,
      message: `Successfully ${ai_analysis_enabled ? 'enabled' : 'disabled'} AI analysis for ${successCount} of ${cameraIds.length} cameras`,
      data: {
        total_requested: cameraIds.length,
        successful_updates: successCount,
        failed_updates: errorCount,
        results: results
      }
    });
  } catch (error) {
    console.error('Error bulk toggling AI analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;
