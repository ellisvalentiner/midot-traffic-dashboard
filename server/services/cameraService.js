const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs-extra');
const path = require('path');
const { run, runSingle, runQuery } = require('../database/connection');

// Local log function to replace loggerService
const log = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const levelUpper = level.toUpperCase();
  
  switch (level) {
    case 'error':
      console.error(`${timestamp} [${levelUpper}]: ${message}`, ...args);
      break;
    case 'warn':
      console.warn(`${timestamp} [${levelUpper}]: ${message}`, ...args);
      break;
    case 'info':
      console.log(`${timestamp} [${levelUpper}]: ${message}`, ...args);
      break;
    case 'debug':
      console.log(`${timestamp} [${levelUpper}]: ${message}`, ...args);
      break;
    default:
      console.log(`${timestamp} [${levelUpper}]: ${message}`, ...args);
  }
};

// Import Gemini service
const { queueImageForAnalysis } = require('./geminiService');

// Import image compression service
const imageCompressionService = require('./imageCompressionService');

// MIDOT API endpoints
const MIDOT_CAMERAS_URL = 'https://mdotjboss.state.mi.us/MiDrive/camera/list';
const MIDOT_CAMERA_INFO_URL = 'https://mdotjboss.state.mi.us/MiDrive/camera/getCameraInformation';

const MIDOT_BASE_URL = 'https://mdotjboss.state.mi.us/MiDrive/camera';
const IMAGE_STORAGE_PATH = path.join(__dirname, '../storage/images');

// Ensure image storage directory exists
fs.ensureDirSync(IMAGE_STORAGE_PATH);

const fetchAllCameras = async () => {
  try {
    log('info', 'Fetching cameras from MIDOT API...');
    const response = await axios.get(MIDOT_CAMERAS_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'MIDOT-Traffic-Monitor/1.0'
      }
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response format from MIDOT API');
    }
    
    log('info', `Successfully fetched ${response.data.length} cameras from MIDOT API`);
    return response.data;
  } catch (error) {
    log('error', `Error fetching cameras from MIDOT API: ${error.message}`);
    throw error;
  }
};

const parseCameraData = (cameraData) => {
  try {
    // Extract county name from HTML-formatted county field
    let county = null
    if (cameraData.county && typeof cameraData.county === 'string') {
      // Extract county name before the HTML link
      const countyMatch = cameraData.county.match(/^([^<]+)/)
      if (countyMatch) {
        county = countyMatch[1].trim()
      }
    }
    
    // Extract camera ID from the image HTML if available
    let cameraId = null
    if (cameraData.image && typeof cameraData.image === 'string') {
      const idMatch = cameraData.image.match(/id="(\d+)Img"/)
      if (idMatch) {
        cameraId = idMatch[1]
      }
    }
    
    // Extract image URL from the image HTML if available
    let imageUrl = null
    if (cameraData.image && typeof cameraData.image === 'string') {
      const srcMatch = cameraData.image.match(/src="([^"]+)"/)
      if (srcMatch) {
        imageUrl = srcMatch[1]
      }
    }
    
    // Create a unique identifier if no camera ID found
    if (!cameraId) {
      const routeLocation = `${cameraData.route}${cameraData.location}`.replace(/[^a-zA-Z0-9]/g, '')
      cameraId = `auto_${routeLocation}_${Date.now()}`
    }
    
    // Build camera name from route and location
    const name = `${cameraData.route}${cameraData.location}`.trim()
    
    // Extract road name from route
    const roadName = cameraData.route || 'Unknown'
    
    // Extract intersection from location
    const intersection = cameraData.location ? cameraData.location.replace(/^@\s*/, '').trim() : 'Unknown'
    
    return {
      camera_id: cameraId,
      name: name,
      description: cameraData.direction || 'No description available',
      road_name: roadName,
      intersection: intersection,
      county: county,
      direction: cameraData.direction || null,
      image_url: imageUrl,
      enabled: 0 // Default to DISABLED - cameras must be manually enabled
    }
  } catch (error) {
    log('error', `Error parsing camera data: ${error}`);
    return null
  }
}

const storeCamera = async (cameraData) => {
  try {
    const parsedCamera = parseCameraData(cameraData);
    if (!parsedCamera) {
      log('error', 'Failed to parse camera data:', cameraData);
      return null;
    }
    
    log('info', 'Storing camera:', parsedCamera);
    
    // Check if camera already exists
    const existingCamera = await runSingle(
      'SELECT id FROM cameras WHERE camera_id = ?',
      [parsedCamera.camera_id]
    );
    
    if (existingCamera) {
      // Update existing camera
      await run(`
        UPDATE cameras SET
          name = ?, description = ?, road_name = ?, intersection = ?, county = ?, 
          direction = ?, image_url = ?, enabled = ?, updated_at = datetime('now')
        WHERE camera_id = ?
      `, [
        parsedCamera.name,
        parsedCamera.description,
        parsedCamera.road_name,
        parsedCamera.intersection,
        parsedCamera.county,
        parsedCamera.direction,
        parsedCamera.image_url,
        parsedCamera.enabled
      ]
      );
      log('info', `Updated camera: ${parsedCamera.camera_id}`);
      return existingCamera.id;
    } else {
      // Insert new camera
      const result = await run(`
        INSERT INTO cameras (
          camera_id, name, description, road_name, intersection, county, 
          direction, image_url, enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        parsedCamera.camera_id,
        parsedCamera.name,
        parsedCamera.description,
        parsedCamera.road_name,
        parsedCamera.intersection,
        parsedCamera.county,
        parsedCamera.direction,
        parsedCamera.image_url,
        parsedCamera.enabled
      ]
      );
      log('info', `Inserted new camera: ${parsedCamera.camera_id}`);
      return result.lastID;
    }
  } catch (error) {
    log('error', `Error storing camera: ${error}`);
    throw error;
  }
};

const downloadAndStoreImage = async (cameraId, imageUrl) => {
  try {
    if (!imageUrl) {
      log('warn', `No image URL available for camera ${cameraId}`);
      return null;
    }
    
    log('info', `Downloading image for camera ${cameraId} from: ${imageUrl}`);
    
    // Download image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'MIDOT-Traffic-Monitor/1.0'
      }
    });
    
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${cameraId}_${timestamp}.jpg`;
    const compressedFilename = `${cameraId}_${timestamp}_compressed.jpg`;
    const filePath = path.join(IMAGE_STORAGE_PATH, filename);
    const compressedPath = path.join(IMAGE_STORAGE_PATH, compressedFilename);
    
    // Write original image
    await fs.writeFile(filePath, response.data);
    
    // Try to compress the image
    let finalFilename = filename;
    let finalPath = filePath;
    
    try {
      const compressionResult = await imageCompressionService.compressImage(filePath, compressedPath);
      
      if (compressionResult.success) {
        log('info', `Image compressed successfully: ${compressionResult.compressionRatio}% size reduction`);
        // Use compressed image for storage, keep original for backup
        finalFilename = compressedFilename;
        finalPath = compressedPath;
      } else {
        log('warn', 'Image compression failed, using original image');
      }
    } catch (compressionError) {
      log('warn', `Image compression error, using original image: ${compressionError.message}`);
    }
    
    // Calculate image hash
    const imageBuffer = await fs.readFile(finalPath);
    const imageHash = crypto.createHash('md5').update(imageBuffer).digest('hex');
    
    // Check if image has changed
    const existingImage = await runSingle(
      'SELECT image_hash FROM images WHERE camera_id = ? ORDER BY created_at DESC LIMIT 1',
      [cameraId]
    );
    
    const hasChanged = !existingImage || existingImage.image_hash !== imageHash;
    
    // Store image record in database
    const result = await run(`
      INSERT INTO images (camera_id, local_path, image_hash, previous_hash, has_changed, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [
      cameraId,
      finalFilename,
      imageHash,
      existingImage ? existingImage.image_hash : null,
      hasChanged ? 1 : 0
    ]);
    
    log('info', `Image stored for camera ${cameraId}: ${filename} (changed: ${hasChanged})`);
    log('info', `Database result:`, JSON.stringify(result));
    
    // Queue image for vehicle detection analysis only if AI analysis is enabled for this camera
    if (hasChanged && result.id) {
      const camera = await runSingle(
        'SELECT ai_analysis_enabled FROM cameras WHERE camera_id = ?',
        [cameraId]
      );
      
      if (camera && camera.ai_analysis_enabled) {
        const imageRecord = {
          id: result.id,
          camera_id: cameraId,
          local_path: finalFilename
        };
        
        log('info', `Queueing image ${result.id} for vehicle detection analysis (AI analysis enabled)`);
        await queueImageForAnalysis(imageRecord);
      } else {
        log('warn', `Skipping vehicle detection analysis for image ${result.id} (AI analysis disabled for camera ${cameraId})`);
      }
    } else if (hasChanged) {
      log('warn', `Could not queue image for vehicle detection - missing image ID for camera ${cameraId}`);
      log('warn', `Result object:`, JSON.stringify(result));
    }
    
    return {
      id: result.id,
      filename: finalFilename,
      hasChanged,
      imageHash
    };
  } catch (error) {
    log('error', `Error downloading/storing image for camera ${cameraId}: ${error.message}`);
    throw error;
  }
};

const refreshCameras = async () => {
  try {
    log('info', 'Starting camera refresh...');
    
    // Fetch all cameras from MIDOT API
    const cameras = await fetchAllCameras();
    
    if (!cameras || cameras.length === 0) {
      log('error', 'No cameras received from MIDOT API');
      throw new Error('No cameras received from MIDOT API');
    }
    
    log('info', `Processing ${cameras.length} cameras...`);
    log('info', 'Sample camera data:', JSON.stringify(cameras[0], null, 2));
    
    // Store/update each camera in the database
    let processedCount = 0;
    let errorCount = 0;
    
    for (const camera of cameras) {
      try {
        log('info', `Processing camera: ${camera.route}${camera.location}`);
        const result = await storeCamera(camera);
        if (result) {
          processedCount++;
          log('info', `Successfully processed camera ${processedCount}/${cameras.length}`);
        } else {
          errorCount++;
          log('error', `Failed to store camera: ${camera.route}${camera.location}`);
        }
      } catch (error) {
        log('error', `Error processing camera: ${error.message}`);
        errorCount++;
      }
    }
    
    log('info', `Camera refresh completed. Processed: ${processedCount}, Errors: ${errorCount}`);
    
    return {
      success: true,
      processed: processedCount,
      errors: errorCount,
      total: cameras.length
    };
  } catch (error) {
    log('error', `Camera refresh failed: ${error.message}`);
    throw error;
  }
};

const updateCameraImages = async () => {
  try {
    // log('info', 'Starting camera image update...');
    
    // Get all enabled cameras
    const enabledCameras = await runQuery(
      'SELECT camera_id, image_url FROM cameras WHERE enabled = 1 AND image_url IS NOT NULL'
    );
    
    if (!enabledCameras || enabledCameras.length === 0) {
      // log('info', 'No enabled cameras found for image update');
      return;
    }
    
    // log('info', `Updating images for ${enabledCameras.length} enabled cameras...`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const camera of enabledCameras) {
      try {
        await downloadAndStoreImage(camera.camera_id, camera.image_url);
        updatedCount++;
      } catch (error) {
        // log('error', `Error updating image for camera ${camera.camera_id}: ${error.message}`);
        errorCount++;
      }
    }
    
    // log('info', `Image update completed. Updated: ${updatedCount}, Errors: ${errorCount}`);
  } catch (error) {
    // log('error', `Camera image update failed: ${error.message}`);
    throw error;
  }
};

const validateCameraLimit = async (cameraId, newEnabledStatus) => {
  try {
    // Get current count of enabled cameras
    const currentEnabled = await runSingle(
      'SELECT COUNT(*) as count FROM cameras WHERE enabled = 1'
    );
    
    const currentCount = currentEnabled ? currentEnabled.count : 0;
    
    if (newEnabledStatus && currentCount >= 5) {
      return { allowed: false, reason: 'Maximum of 5 cameras can be enabled simultaneously' };
    }
    
    return { allowed: true, reason: `Enabling camera will result in ${currentCount + 1} enabled cameras` };
  } catch (error) {
    log('error', `Error validating camera limit: ${error.message}`);
    return { allowed: false, reason: 'Error validating camera limit' };
  }
};

const toggleCameraStatus = async (cameraId, enabled) => {
  try {
    const validation = await validateCameraLimit(cameraId, enabled);
    
    if (!validation.allowed) {
      throw new Error(validation.reason);
    }
    
    const query = 'UPDATE cameras SET enabled = ?, updated_at = datetime("now") WHERE camera_id = ?';
    await run(query, [enabled ? 1 : 0, cameraId]);
    
    log('info', `Camera ${cameraId} ${enabled ? 'enabled' : 'disabled'}: ${validation.reason}`);
    return { success: true, message: validation.reason };
  } catch (error) {
    log('error', `Error toggling camera ${cameraId} status: ${error.message}`);
    throw error;
  }
};

const toggleAIAnalysisStatus = async (cameraId, aiAnalysisEnabled) => {
  try {
    const query = 'UPDATE cameras SET ai_analysis_enabled = ?, updated_at = datetime("now") WHERE camera_id = ?';
    await run(query, [aiAnalysisEnabled ? 1 : 0, cameraId]);
    
    log('info', `Camera ${cameraId} AI analysis ${aiAnalysisEnabled ? 'enabled' : 'disabled'}`);
    return { success: true, message: `AI analysis ${aiAnalysisEnabled ? 'enabled' : 'disabled'} for camera ${cameraId}` };
  } catch (error) {
    log('error', `Error toggling AI analysis status for camera ${cameraId}: ${error.message}`);
    throw error;
  }
};

const getCameraStatus = async (cameraId) => {
  try {
    const result = await runSingle(
      'SELECT enabled FROM cameras WHERE camera_id = ?',
      [cameraId]
    );
    return result ? result.enabled === 1 : false;
  } catch (error) {
    log('error', `Error getting camera ${cameraId} status: ${error.message}`);
    return false;
  }
};

module.exports = {
  fetchAllCameras,
  storeCamera,
  refreshCameras,
  updateCameraImages,
  downloadAndStoreImage,
  toggleCameraStatus,
  toggleAIAnalysisStatus,
  getCameraStatus
};