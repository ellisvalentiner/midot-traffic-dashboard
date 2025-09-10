const express = require('express')
const { runQuery, run, runSingle } = require('../database/connection')
const { getVehicleDetectionStats, isGeminiAvailable } = require('../services/geminiService')
const configService = require('../services/configService')

const router = express.Router()

// Re-analyze missing bounding boxes for existing images
router.post('/reanalyze-missing-boxes', async (req, res) => {
  try {
    const { reanalyzeMissingBoundingBoxes } = require('../services/geminiService');
    
    console.log('Manual trigger: Starting to re-analyze missing bounding boxes...');
    await reanalyzeMissingBoundingBoxes();
    
    res.json({
      success: true,
      message: 'Re-analysis of missing bounding boxes completed'
    });
  } catch (error) {
    console.error('Error re-analyzing missing bounding boxes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to re-analyze missing bounding boxes'
    });
  }
});

// Get overall vehicle detection statistics
router.get('/stats', async (req, res) => {
  try {
    const { time_range = '24h' } = req.query
    const stats = await getVehicleDetectionStats(null, time_range)
    
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

// Get real-time queue status
router.get('/queue-status', async (req, res) => {
  try {
    const result = await runQuery(`
      SELECT 
        processing_status,
        COUNT(*) as count
      FROM vehicle_detections 
      GROUP BY processing_status
    `)
    
    // Convert to a more usable format
    const queueStatus = {
      queued_images: 0,
      processing_images: 0,
      completed_images: 0,
      failed_images: 0,
      pending_images: 0
    }
    
    result.forEach(row => {
      const status = row.processing_status
      const count = row.count
      
      switch (status) {
        case 'queued':
          queueStatus.queued_images = count
          break
        case 'processing':
          queueStatus.processing_images = count
          break
        case 'completed':
          queueStatus.completed_images = count
          break
        case 'failed':
          queueStatus.failed_images = count
          break
        case 'pending':
          queueStatus.pending_images = count
          break
      }
    })
    
    res.json({
      success: true,
      data: queueStatus
    })
  } catch (error) {
    console.error('Error fetching queue status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch queue status'
    })
  }
})

// Reset stuck processing images
router.post('/reset-stuck-processing', async (req, res) => {
  try {
    console.log('=== RESETTING STUCK PROCESSING IMAGES ===')
    
    // Find images that have been stuck in processing for more than 30 minutes
    const stuckImages = await runQuery(`
      SELECT 
        vd.id,
        vd.image_id,
        vd.processing_status,
        vd.processed_at,
        i.local_path
      FROM vehicle_detections vd
      JOIN images i ON vd.image_id = i.id
      WHERE vd.processing_status = 'processing'
      AND vd.processed_at < datetime('now', '-30 minutes')
      ORDER BY vd.processed_at ASC
    `)
    
    console.log(`Found ${stuckImages.length} stuck processing images`)
    
    if (stuckImages.length === 0) {
      return res.json({
        success: true,
        message: 'No stuck processing images found',
        resetCount: 0
      })
    }
    
    // Reset these images back to queued status
    let resetCount = 0
    for (const image of stuckImages) {
      try {
        await run(`
          UPDATE vehicle_detections 
          SET 
            processing_status = 'queued',
            processed_at = NULL
          WHERE id = ?
        `, [image.id])
        
        console.log(`Reset image ${image.image_id} (${image.local_path}) from processing to queued`)
        resetCount++
      } catch (error) {
        console.error(`Failed to reset image ${image.image_id}:`, error)
      }
    }
    
    console.log(`Successfully reset ${resetCount} stuck processing images`)
    
    res.json({
      success: true,
      message: `Reset ${resetCount} stuck processing images back to queued status`,
      resetCount,
      totalStuck: stuckImages.length
    })
  } catch (error) {
    console.error('Error resetting stuck processing images:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to reset stuck processing images'
    })
  }
})

// Reset ALL processing images (emergency reset)
router.post('/reset-all-processing', async (req, res) => {
  try {
    console.log('=== EMERGENCY RESET: RESETTING ALL PROCESSING IMAGES ===')
    
    // Count current processing images
    console.log('Step 1: Counting processing images...')
    const processingCount = await runSingle(`
      SELECT COUNT(*) as count
      FROM vehicle_detections 
      WHERE processing_status = 'processing'
    `)
    
    console.log('Processing count result:', processingCount)
    
    if (!processingCount || processingCount.count === 0) {
      console.log('No processing images found')
      return res.json({
        success: true,
        message: 'No processing images found to reset',
        resetCount: 0
      })
    }
    
    console.log(`Found ${processingCount.count} processing images to reset`)
    
    // Reset ALL processing images back to queued status
    console.log('Step 2: Executing UPDATE query...')
    const result = await run(`
      UPDATE vehicle_detections 
      SET 
        processing_status = 'queued',
        processed_at = NULL
      WHERE processing_status = 'processing'
    `)
    
    console.log('UPDATE result:', result)
    console.log(`Successfully reset ${result.changes} processing images back to queued status`)
    
    res.json({
      success: true,
      message: `Emergency reset: Reset ${result.changes} processing images back to queued status`,
      resetCount: result.changes,
      previousProcessingCount: processingCount.count
    })
  } catch (error) {
    console.error('=== ERROR DURING EMERGENCY RESET ===')
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    console.error('=== END ERROR ===')
    res.status(500).json({
      success: false,
      error: 'Failed to reset processing images',
      details: error.message
    })
  }
})

// Manually trigger batch processing
router.post('/trigger-processing', async (req, res) => {
  try {
    console.log('=== MANUAL TRIGGER: TRIGGERING BATCH PROCESSING ===')
    
    // Import the Gemini service
    const { processQueue } = require('../services/geminiService')
    
    if (!processQueue) {
      throw new Error('processQueue function not available')
    }
    
    console.log('Calling processQueue...')
    await processQueue()
    
    console.log('Batch processing triggered successfully')
    
    res.json({
      success: true,
      message: 'Batch processing triggered successfully'
    })
  } catch (error) {
    console.error('=== ERROR TRIGGERING BATCH PROCESSING ===')
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    console.error('=== END ERROR ===')
    res.status(500).json({
      success: false,
      error: 'Failed to trigger batch processing',
      details: error.message
    })
  }
})

// Force processing: Reset all stuck images and process them immediately
router.post('/force-processing', async (req, res) => {
  try {
    console.log('=== FORCE PROCESSING: RESETTING ALL PROCESSING IMAGES ===')
    
    // Step 1: Reset all processing images back to queued
    console.log('Step 1: Resetting all processing images...')
    const resetResult = await run(`
      UPDATE vehicle_detections 
      SET 
        processing_status = 'queued',
        processed_at = NULL
      WHERE processing_status = 'processing'
    `)
    
    console.log(`Reset ${resetResult.changes} processing images back to queued`)
    
    // Step 2: Get current queue status
    console.log('Step 2: Getting current queue status...')
    const queueStatus = await runQuery(`
      SELECT 
        processing_status,
        COUNT(*) as count
      FROM vehicle_detections 
      GROUP BY processing_status
    `)
    
    console.log('Queue status after reset:', queueStatus)
    
    // Step 3: DON'T trigger processing automatically - let user do it manually
    console.log('Step 3: Images reset to queued status. Processing NOT triggered automatically.')
    
    res.json({
      success: true,
      message: 'Images reset to queued status. Use /trigger-processing to start processing.',
      resetCount: resetResult.changes,
      queueStatus: queueStatus
    })
  } catch (error) {
    console.error('=== ERROR DURING FORCE PROCESSING ===')
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    console.error('=== END ERROR ===')
    res.status(500).json({
      success: false,
      error: 'Failed to reset processing images',
      details: error.message
    })
  }
})

// Debug endpoint to show processing status and test individual functions
router.get('/debug-processing', async (req, res) => {
  try {
    console.log('=== DEBUG PROCESSING STATUS ===')
    
    // Get detailed queue status
    const detailedStatus = await runQuery(`
      SELECT 
        vd.processing_status,
        vd.id,
        vd.image_id,
        vd.processed_at,
        vd.created_at,
        i.local_path,
        i.captured_at
      FROM vehicle_detections vd
      JOIN images i ON vd.image_id = i.id
      WHERE vd.processing_status IN ('queued', 'processing')
      ORDER BY vd.created_at ASC
      LIMIT 10
    `)
    
    // Test database connection
    const dbTest = await runSingle('SELECT 1 as test')
    
    // Test Gemini service availability
    const { isGeminiAvailable } = require('../services/geminiService')
    const geminiAvailable = await isGeminiAvailable()
    
    console.log('Debug info collected successfully')
    
    res.json({
      success: true,
      debug: {
        databaseConnection: dbTest ? 'OK' : 'FAILED',
        geminiService: geminiAvailable ? 'AVAILABLE' : 'NOT AVAILABLE',
        detailedStatus: detailedStatus,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('=== ERROR IN DEBUG ENDPOINT ===')
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    console.error('=== END ERROR ===')
    res.status(500).json({
      success: false,
      error: 'Failed to get debug info',
      details: error.message
    })
  }
})

// Test endpoint to process just one image and see what happens
router.post('/test-single-image', async (req, res) => {
  try {
    console.log('=== TESTING SINGLE IMAGE PROCESSING ===')
    
    // Get one queued image
    const queuedImage = await runSingle(`
      SELECT 
        i.id, 
        i.camera_id, 
        i.local_path,
        vd.id as vehicle_detection_id
      FROM images i
      JOIN vehicle_detections vd ON i.id = vd.image_id
      WHERE vd.processing_status = 'queued'
      ORDER BY i.created_at ASC
      LIMIT 1
    `)
    
    if (!queuedImage) {
      return res.json({
        success: false,
        message: 'No queued images found'
      })
    }
    
    console.log('Testing with image:', queuedImage)
    
    // Test the processImageBatch function with just this one image
    const { processImageBatch } = require('../services/geminiService')
    
    if (!processImageBatch) {
      throw new Error('processImageBatch function not available')
    }
    
    console.log('Calling processImageBatch with single image...')
    const results = await processImageBatch([queuedImage])
    
    console.log('processImageBatch results:', results)
    
    res.json({
      success: true,
      message: 'Single image processing test completed',
      testImage: queuedImage,
      results: results
    })
  } catch (error) {
    console.error('=== ERROR IN SINGLE IMAGE TEST ===')
    console.error('Error details:', error.message)
    console.error('Error stack:', error.stack)
    console.error('=== END ERROR ===')
    res.status(500).json({
      success: false,
      error: 'Failed to test single image processing',
      details: error.message
    })
  }
})

// Get vehicle detection statistics for a specific camera
router.get('/camera/:cameraId/stats', async (req, res) => {
  try {
    const { cameraId } = req.params
    const { time_range = '24h' } = req.query
    const stats = await getVehicleDetectionStats(cameraId, time_range)
    
    res.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Error fetching camera vehicle detection stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch camera vehicle detection statistics'
    })
  }
})

// Get recent vehicle detections
router.get('/recent', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query
    
    const result = await runQuery(`
      SELECT 
        vd.*,
        i.local_path,
        i.captured_at,
        c.name as camera_name,
        c.road_name,
        c.intersection
      FROM vehicle_detections vd
      JOIN images i ON vd.image_id = i.id
      JOIN cameras c ON vd.camera_id = c.camera_id
      WHERE vd.processing_status = 'completed'
      ORDER BY vd.processed_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)])
    
    res.json({
      success: true,
      data: result,
      count: result.length
    })
  } catch (error) {
    console.error('Error fetching recent vehicle detections:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent vehicle detections'
    })
  }
})

// Get vehicle detection trends over time
router.get('/trends', async (req, res) => {
  try {
    const { days = 7 } = req.query
    
    const result = await runQuery(`
      SELECT 
        DATE(processed_at) as date,
        COUNT(*) as images_analyzed,
        SUM(total_vehicles) as total_vehicles,
        AVG(total_vehicles) as avg_vehicles_per_image,
        SUM(cars) as total_cars,
        SUM(trucks) as total_trucks,
        SUM(motorcycles) as total_motorcycles,
        SUM(buses) as total_buses
      FROM vehicle_detections
      WHERE processing_status = 'completed'
        AND processed_at >= datetime('now', '-${days} days')
      GROUP BY DATE(processed_at)
      ORDER BY date DESC
    `)
    
    res.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Error fetching vehicle detection trends:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle detection trends'
    })
  }
})

// Get vehicle counts by minute for the past 24 hours
router.get('/counts-by-minute', async (req, res) => {
  try {
    const { camera_id, hours = 24 } = req.query
    
    // Get the configurable aggregation interval (default to 10 minutes)
    const aggregationInterval = configService.get('analytics.vehicleCountAggregationInterval', 600000) // 10 minutes default
    const intervalMinutes = Math.floor(aggregationInterval / 60000) // Convert ms to minutes
    
    let query = `
      SELECT 
        strftime('%Y-%m-%d %H:%M:00', i.captured_at) as minute_bucket,
        COUNT(*) as image_count,
        SUM(COALESCE(vd.total_vehicles, 0)) as total_vehicles,
        AVG(COALESCE(vd.total_vehicles, 0)) as avg_vehicles_per_image
      FROM images i
      LEFT JOIN vehicle_detections vd ON i.id = vd.image_id AND vd.processing_status = 'completed'
      WHERE i.captured_at >= datetime('now', '-${hours} hours')
    `
    
    const params = []
    
    if (camera_id) {
      query += ' AND i.camera_id = ?'
      params.push(camera_id)
    }
    
    query += `
      GROUP BY strftime('%Y-%m-%d %H:%M:00', i.captured_at)
      ORDER BY minute_bucket ASC
    `
    
    const result = await runQuery(query, params)
    
    res.json({
      success: true,
      data: result,
      count: result.length,
      aggregationInterval: aggregationInterval,
      intervalMinutes: intervalMinutes
    })
  } catch (error) {
    console.error('Error fetching vehicle counts by minute:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle counts by minute'
    })
  }
})

// Get aggregated vehicle counts by minute across all cameras
router.get('/counts-by-minute/aggregated', async (req, res) => {
  try {
    const { hours = 24 } = req.query
    
    // Get the configurable aggregation interval (default to 10 minutes)
    const aggregationInterval = configService.get('analytics.vehicleCountAggregationInterval', 600000) // 10 minutes default
    const intervalMinutes = Math.floor(aggregationInterval / 60000) // Convert ms to minutes
    
    const result = await runQuery(`
      SELECT 
        strftime('%Y-%m-%d %H:%M:00', i.captured_at) as minute_bucket,
        COUNT(DISTINCT i.camera_id) as active_cameras,
        COUNT(*) as total_images,
        SUM(COALESCE(vd.total_vehicles, 0)) as total_vehicles,
        AVG(COALESCE(vd.total_vehicles, 0)) as avg_vehicles_per_image
      FROM images i
      LEFT JOIN vehicle_detections vd ON i.id = vd.image_id AND vd.processing_status = 'completed'
      WHERE i.captured_at >= datetime('now', '-${hours} hours')
      GROUP BY strftime('%Y-%m-%d %H:%M:00', i.captured_at)
      ORDER BY minute_bucket ASC
    `)
    
    res.json({
      success: true,
      data: result,
      count: result.length,
      aggregationInterval: aggregationInterval,
      intervalMinutes: intervalMinutes
    })
  } catch (error) {
    console.error('Error fetching aggregated vehicle counts by minute:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch aggregated vehicle counts by minute'
    })
  }
})

// Get Gemini AI service status
router.get('/status', async (req, res) => {
  try {
    const geminiAvailable = isGeminiAvailable()
    
    // Get queue status
    const pendingCount = await runQuery(`
      SELECT COUNT(*) as count FROM vehicle_detections 
      WHERE processing_status = 'pending'
    `)
    
    const failedCount = await runQuery(`
      SELECT COUNT(*) as count FROM vehicle_detections 
      WHERE processing_status = 'failed'
    `)
    
    res.json({
      success: true,
      data: {
        gemini_available: geminiAvailable,
        pending_analyses: pendingCount[0]?.count || 0,
        failed_analyses: failedCount[0]?.count || 0,
        service_status: geminiAvailable ? 'operational' : 'unavailable'
      }
    })
  } catch (error) {
    console.error('Error fetching vehicle detection status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vehicle detection status'
    })
  }
})

// Retry failed vehicle detection analysis
router.post('/:id/retry', async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if the detection exists and failed
    const detection = await runQuery(`
      SELECT * FROM vehicle_detections WHERE id = ?
    `, [id])
    
    if (detection.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle detection not found'
      })
    }
    
    if (detection[0].processing_status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Can only retry failed analyses'
      })
    }
    
    // Reset status for retry
    await run(`
      UPDATE vehicle_detections 
      SET processing_status = 'pending', retry_count = retry_count + 1, last_retry_at = datetime('now')
      WHERE id = ?
    `, [id])
    
    res.json({
      success: true,
      message: 'Vehicle detection queued for retry'
    })
  } catch (error) {
    console.error('Error retrying vehicle detection:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to retry vehicle detection'
    })
  }
})

module.exports = router
