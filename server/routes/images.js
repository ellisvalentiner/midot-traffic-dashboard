const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { runQuery } = require('../database/connection');

const router = express.Router();

// Get all images for a specific camera
router.get('/camera/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await runQuery(`
      SELECT 
        i.*,
        c.name as camera_name,
        c.road_name,
        c.county,
        vd.processing_status as analysis_status,
        vd.total_vehicles as vehicle_count,
        vd.confidence_score,
        vd.processed_at
      FROM images i
      JOIN cameras c ON i.camera_id = c.camera_id
      LEFT JOIN vehicle_detections vd ON i.id = vd.image_id
      WHERE i.camera_id = ?
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `, [cameraId, parseInt(limit), parseInt(offset)]);
    
    res.json({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch images'
    });
  }
});

// Get recent images across all cameras
router.get('/recent', async (req, res) => {
  try {
    const { limit = 20, changed_only = false } = req.query;
    
    let query = `
      SELECT 
        i.*,
        c.name as camera_name,
        c.road_name,
        c.county,
        vd.processing_status as analysis_status,
        vd.total_vehicles as vehicle_count,
        vd.confidence_score,
        vd.processed_at
      FROM images i
      JOIN cameras c ON i.camera_id = c.camera_id
      LEFT JOIN vehicle_detections vd ON i.id = vd.image_id
    `;
    
    if (changed_only === 'true') {
      query += ' WHERE i.has_changed = 1';
    }
    
    query += ' ORDER BY i.created_at DESC LIMIT ?';
    
    const result = await runQuery(query, [parseInt(limit)]);
    
    res.json({
      success: true,
      data: result,
      count: result.length
    });
  } catch (error) {
    console.error('Error fetching recent images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent images'
    });
  }
});

// Get image comparison data
router.get('/comparison/:cameraId', async (req, res) => {
  try {
    const { cameraId } = req.params;
    const { hours = 24 } = req.query;
    
    const result = await runQuery(`
      SELECT 
        created_at,
        has_changed,
        image_hash,
        previous_hash
      FROM images
      WHERE camera_id = ? 
        AND created_at >= datetime('now', '-${hours} hours')
      ORDER BY created_at ASC
    `, [cameraId]);
    
    // Calculate change frequency
    const totalImages = result.length;
    const changedImages = result.filter(row => row.has_changed === 1).length;
    const changeRate = totalImages > 0 ? (changedImages / totalImages) * 100 : 0;
    
    res.json({
      success: true,
      data: {
        images: result,
        summary: {
          total_images: totalImages,
          changed_images: changedImages,
          change_rate: Math.round(changeRate * 100) / 100,
          time_period_hours: parseInt(hours)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching image comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch image comparison'
    });
  }
});

// Serve local image files
router.get('/file/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, '../storage/images', filename);
    
    // Basic security check - ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename'
      });
    }
    
    res.sendFile(imagePath, (err) => {
      if (err) {
        console.error('Error serving image file:', err);
        res.status(404).json({
          success: false,
          error: 'Image file not found'
        });
      }
    });
  } catch (error) {
    console.error('Error serving image file:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to serve image file'
    });
  }
});

// Get image statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { hours = 24, camera_id } = req.query;
    
    let whereClause = `WHERE i.created_at >= datetime('now', '-${hours} hours')`;
    let queryParams = [];
    
    if (camera_id) {
      whereClause += ` AND i.camera_id = ?`;
      queryParams.push(camera_id);
    }
    
    const result = await runQuery(`
      SELECT 
        COUNT(i.id) as total_images,
        COUNT(CASE WHEN i.has_changed = 1 THEN 1 END) as changed_images,
        COUNT(DISTINCT i.camera_id) as active_cameras,
        MAX(i.created_at) as last_capture,
        MIN(i.created_at) as first_capture,
        COALESCE(SUM(vd.total_vehicles), 0) as total_vehicles,
        COALESCE(AVG(vd.confidence_score), 0) as avg_confidence
      FROM images i
      LEFT JOIN vehicle_detections vd ON i.id = vd.image_id AND vd.processing_status = 'completed'
      ${whereClause}
    `, queryParams);
    
    const changeRate = result[0].total_images > 0 
      ? (result[0].changed_images / result[0].total_images) * 100 
      : 0;
    
    res.json({
      success: true,
      data: {
        ...result[0],
        change_rate: Math.round(changeRate * 100) / 100,
        time_period_hours: parseInt(hours)
      }
    });
  } catch (error) {
    console.error('Error fetching image stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch image statistics'
    });
  }
});

// Delete all images
router.delete('/all', async (req, res) => {
  try {
    console.log('Deleting all images...');
    
    // Get all image file paths before deleting from database
    const images = await runQuery('SELECT local_path FROM images WHERE local_path IS NOT NULL');
    
    // Delete from database first
    await runQuery('DELETE FROM images');
    
    // Delete all image files from storage
    const storageDir = path.join(__dirname, '../storage/images');
    let deletedFiles = 0;
    
    for (const image of images) {
      if (image.local_path && fs.existsSync(image.local_path)) {
        try {
          await fs.remove(image.local_path);
          deletedFiles++;
        } catch (fileError) {
          console.error(`Failed to delete file: ${image.local_path}`, fileError);
        }
      }
    }
    
    console.log(`Deleted ${images.length} image records and ${deletedFiles} image files`);
    
    res.json({
      success: true,
      message: `Successfully deleted all images`,
      data: {
        deleted_records: images.length,
        deleted_files: deletedFiles
      }
    });
  } catch (error) {
    console.error('Error deleting all images:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete all images'
    });
  }
});

// Get vehicle detection statistics
router.get('/vehicle-stats', async (req, res) => {
  try {
    const { camera_id, time_range = '24h' } = req.query
    const { getVehicleDetectionStats } = require('../services/geminiService')
    
    const stats = await getVehicleDetectionStats(camera_id, time_range)
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching vehicle detection stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle detection statistics'
    })
  }
})

// Get vehicle detection results for a specific image
router.get('/:id/vehicle-detection', async (req, res) => {
  try {
    const { id } = req.params
    
    // Get vehicle detection data
    const detectionResult = await runQuery(`
      SELECT * FROM vehicle_detections 
      WHERE image_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [id])
    
    if (detectionResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle detection not found for this image'
      })
    }
    
    const detection = detectionResult[0]
    
    // Get bounding boxes for this detection (including invalid ones for debugging)
    const boundingBoxes = await runQuery(`
      SELECT vehicle_type, x_min, y_min, x_max, y_max, confidence_score, is_valid
      FROM vehicle_bounding_boxes 
      WHERE vehicle_detection_id = ?
      ORDER BY id
    `, [detection.id])
    
    console.log('Database query results:', {
      detection: detection,
      boundingBoxes: boundingBoxes,
      boundingBoxesCount: boundingBoxes.length,
      validBoxes: boundingBoxes.filter(box => box.is_valid === 1).length,
      invalidBoxes: boundingBoxes.filter(box => box.is_valid === 0).length
    });
    
    // Combine the data
    const responseData = {
      ...detection,
      bounding_boxes: boundingBoxes
    }
    
    console.log('Final response data:', {
      hasBoundingBoxes: !!responseData.bounding_boxes,
      boundingBoxesLength: responseData.bounding_boxes?.length || 0,
      sampleBoundingBox: responseData.bounding_boxes?.[0]
    });
    
    res.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('Error fetching vehicle detection:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle detection data'
    })
  }
})

// Trigger analysis for a specific image
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params
    
    console.log(`Analysis requested for image ${id}`)
    
    // Check if image exists
    const imageResult = await runQuery(`
      SELECT i.*, c.ai_analysis_enabled 
      FROM images i 
      JOIN cameras c ON i.camera_id = c.camera_id 
      WHERE i.id = ?
    `, [id])
    
    if (imageResult.length === 0) {
      console.log(`Image ${id} not found`)
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      })
    }
    
    const image = imageResult[0]
    console.log(`Image ${id} found:`, { camera_id: image.camera_id, ai_analysis_enabled: image.ai_analysis_enabled })
    
    // Allow individual image analysis regardless of camera AI settings
    // The camera AI setting only affects automatic analysis, not manual requests
    
    // Check if analysis already exists
    const existingAnalysis = await runQuery(`
      SELECT * FROM vehicle_detections WHERE image_id = ?
    `, [id])
    
    if (existingAnalysis.length > 0) {
      console.log(`Updating existing analysis for image ${id} to pending`)
      // Update existing analysis to pending
      await runQuery(`
        UPDATE vehicle_detections 
        SET processing_status = 'pending', retry_count = retry_count + 1, last_retry_at = datetime('now')
        WHERE image_id = ?
      `, [id])
    } else {
      console.log(`Creating new analysis record for image ${id}`)
      // Create new analysis record
      await runQuery(`
        INSERT INTO vehicle_detections (
          image_id, camera_id, processing_status, created_at
        ) VALUES (?, ?, 'pending', datetime('now'))
      `, [id, image.camera_id])
    }
    
    // Queue the image for actual analysis processing
    console.log(`Queueing image ${id} for analysis processing`)
    
    // Check if Gemini service is available
    try {
      const geminiService = require('../services/geminiService')
      console.log('Gemini service imported successfully:', Object.keys(geminiService))
      
      if (!geminiService.queueImageForAnalysis) {
        console.error('queueImageForAnalysis function not found in Gemini service')
        return res.status(500).json({
          success: false,
          error: 'Gemini service not properly initialized'
        })
      }
      
      const { queueImageForAnalysis } = geminiService
      
      const imageRecord = {
        id: id,
        camera_id: image.camera_id,
        local_path: image.local_path
      }
      
      const queueResult = await queueImageForAnalysis(imageRecord)
      console.log(`Queue result for image ${id}:`, queueResult)
      
      if (!queueResult) {
        console.error(`Failed to queue image ${id} for analysis`)
        return res.status(500).json({
          success: false,
          error: 'Failed to queue image for analysis'
        })
      }
    } catch (geminiError) {
      console.error('Error with Gemini service:', geminiError)
      return res.status(500).json({
        success: false,
        error: 'Gemini service error',
        details: geminiError.message
      })
    }
    
    res.json({
      success: true,
      message: 'Image queued for analysis',
      data: {
        image_id: id,
        status: 'pending'
      }
    })
  } catch (error) {
    console.error('Error triggering analysis:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to trigger analysis',
      details: error.message
    })
  }
})

// Get vehicle detection results for a camera
router.get('/camera/:cameraId/vehicle-detections', async (req, res) => {
  try {
    const { cameraId } = req.params
    const { limit = 50, offset = 0 } = req.query
    const { runQuery } = require('../database/connection')
    
    const result = await runQuery(`
      SELECT 
        vd.*,
        i.local_path,
        i.captured_at,
        i.has_changed
      FROM vehicle_detections vd
      JOIN images i ON vd.image_id = i.id
      WHERE vd.camera_id = ?
      ORDER BY vd.processed_at DESC
      LIMIT ? OFFSET ?
    `, [cameraId, parseInt(limit), parseInt(offset)])
    
    res.json({
      success: true,
      data: result,
      count: result.length
    })
  } catch (error) {
    console.error('Error fetching camera vehicle detections:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch camera vehicle detection data'
    })
  }
})

module.exports = router;
