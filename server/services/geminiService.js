/**
 * Gemini AI Service for Vehicle Detection
 * 
 * This service now returns only bounding boxes from Gemini AI and derives
 * vehicle counts and confidence scores from the bounding boxes.
 * 
 * Key changes:
 * - Gemini response format simplified to only include bounding_boxes array
 * - Vehicle counts are derived by counting bounding boxes by vehicle type
 * - Confidence score is calculated as the average of all bounding box confidence scores
 * - Enhanced validation ensures all bounding boxes have required fields and valid ranges
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs-extra');
const path = require('path');

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

// Database connection
let dbConnection = null;

// Initialize Gemini AI client
let genAI = null;
let model = null;
let client = null;

// Enhanced Configuration with Safety Settings
const CONFIG = {
  // API Configuration
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  
  // Batch Processing Configuration
  USE_BATCH_MODE: process.env.GEMINI_USE_BATCH_MODE !== 'false', // Default to true
  BATCH_SIZE: Math.min(parseInt(process.env.GEMINI_BATCH_SIZE) || 10, 50), // Cap at 50
  BATCH_POLLING_INTERVAL: Math.max(parseInt(process.env.GEMINI_BATCH_POLLING_INTERVAL) || 30000, 10000), // Min 10s
  
  // Processing Configuration
  MAX_RETRIES: Math.min(parseInt(process.env.GEMINI_MAX_RETRIES) || 3, 5), // Cap at 5
  CONFIDENCE_THRESHOLD: Math.max(Math.min(parseFloat(process.env.GEMINI_CONFIDENCE_THRESHOLD) || 0.7, 1.0), 0.1), // 0.1-1.0
  MAX_IMAGES_PER_BATCH: Math.min(parseInt(process.env.GEMINI_MAX_IMAGES_PER_BATCH) || 20, 100), // Cap at 100
  
  // Rate Limiting Configuration
  RATE_LIMIT_DELAY: Math.max(parseInt(process.env.GEMINI_RATE_LIMIT_DELAY) || 2000, 1000), // Min 1s
  MAX_CONCURRENT_REQUESTS: Math.min(parseInt(process.env.GEMINI_MAX_CONCURRENT_REQUESTS) || 5, 10), // Cap at 10
  
  // Safety Configuration
  SAFETY_SETTINGS: {
    HARM_CATEGORY_HARASSMENT: process.env.GEMINI_SAFETY_HARASSMENT || 'BLOCK_MEDIUM_AND_ABOVE',
    HARM_CATEGORY_HATE_SPEECH: process.env.GEMINI_SAFETY_HATE_SPEECH || 'BLOCK_MEDIUM_AND_ABOVE',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: process.env.GEMINI_SAFETY_SEXUALLY_EXPLICIT || 'BLOCK_MEDIUM_AND_ABOVE',
    HARM_CATEGORY_DANGEROUS_CONTENT: process.env.GEMINI_SAFETY_DANGEROUS_CONTENT || 'BLOCK_MEDIUM_AND_ABOVE'
  },
  
  // Content Filtering
  ENABLE_CONTENT_FILTERING: process.env.GEMINI_ENABLE_CONTENT_FILTERING !== 'false', // Default to true
  MAX_RESPONSE_LENGTH: parseInt(process.env.GEMINI_MAX_RESPONSE_LENGTH) || 10000, // Max response length
  
  // Error Handling
  ENABLE_RETRY_ON_FAILURE: process.env.GEMINI_ENABLE_RETRY_ON_FAILURE !== 'false', // Default to true
  RETRY_BACKOFF_MULTIPLIER: parseFloat(process.env.GEMINI_RETRY_BACKOFF_MULTIPLIER) || 2.0,
  MAX_RETRY_DELAY: parseInt(process.env.GEMINI_MAX_RETRY_DELAY) || 30000, // Max 30s
  
  // Monitoring and Logging
  ENABLE_DETAILED_LOGGING: process.env.GEMINI_ENABLE_DETAILED_LOGGING === 'true', // Default to false
  LOG_PROCESSING_METRICS: process.env.GEMINI_LOG_PROCESSING_METRICS !== 'false', // Default to true
  METRICS_RETENTION_HOURS: parseInt(process.env.GEMINI_METRICS_RETENTION_HOURS) || 24
};

// Validate configuration
const validateConfig = () => {
  console.log('=== GEMINI SERVICE: Validating configuration ===')
  console.log('Environment variables:')
  console.log('- GEMINI_API_KEY:', CONFIG.GEMINI_API_KEY ? 'SET' : 'NOT SET')
  console.log('- GEMINI_MODEL:', CONFIG.GEMINI_MODEL)
  console.log('- GEMINI_USE_BATCH_MODE:', CONFIG.USE_BATCH_MODE)
  console.log('- GEMINI_BATCH_SIZE:', CONFIG.BATCH_SIZE)
  
  if (!CONFIG.GEMINI_API_KEY) {
    console.error('=== GEMINI SERVICE: GEMINI_API_KEY is required ===')
    console.error('GEMINI_API_KEY is required')
    return false
  }
  
  if (!CONFIG.GEMINI_MODEL) {
    console.error('=== GEMINI SERVICE: GEMINI_MODEL is required ===')
    console.error('GEMINI_MODEL is required')
    return false
  }
  
  if (CONFIG.BATCH_SIZE < 1 || CONFIG.BATCH_SIZE > 100) {
    console.error('=== GEMINI SERVICE: BATCH_SIZE must be between 1 and 100 ===')
    console.error('BATCH_SIZE must be between 1 and 100')
    return false
  }
  
  if (CONFIG.MAX_CONCURRENT_REQUESTS < 1 || CONFIG.MAX_CONCURRENT_REQUESTS > 50) {
    console.error('=== GEMINI SERVICE: MAX_CONCURRENT_REQUESTS must be between 1 and 50 ===')
    console.error('MAX_CONCURRENT_REQUESTS must be between 1 and 50')
    return false
  }
  
  if (CONFIG.CONFIDENCE_THRESHOLD < 0 || CONFIG.CONFIDENCE_THRESHOLD > 1) {
    console.error('=== GEMINI SERVICE: CONFIDENCE_THRESHOLD must be between 0 and 1 ===')
    console.error('CONFIDENCE_THRESHOLD must be between 0 and 1')
    return false
  }
  
  console.log('=== GEMINI SERVICE: Configuration validation passed ===')
  return true
}

// Enhanced safety settings mapping
const getSafetySettings = () => {
  return [
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: CONFIG.SAFETY_SETTINGS.HARM_CATEGORY_HARASSMENT
    },
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: CONFIG.SAFETY_SETTINGS.HARM_CATEGORY_HATE_SPEECH
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: CONFIG.SAFETY_SETTINGS.HARM_CATEGORY_SEXUALLY_EXPLICIT
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: CONFIG.SAFETY_SETTINGS.HARM_CATEGORY_DANGEROUS_CONTENT
    }
  ]
}

// Configuration logging
const logConfiguration = () => {
  if (CONFIG.ENABLE_DETAILED_LOGGING) {
    log('info', '=== Gemini AI Configuration ===')
    log('info', `Model: ${CONFIG.GEMINI_MODEL}`)
    log('info', `Batch Mode: ${CONFIG.USE_BATCH_MODE}`)
    log('info', `Batch Size: ${CONFIG.BATCH_SIZE}`)
    log('info', `Confidence Threshold: ${CONFIG.CONFIDENCE_THRESHOLD}`)
    log('info', `Max Retries: ${CONFIG.MAX_RETRIES}`)
    log('info', `Rate Limit Delay: ${CONFIG.RATE_LIMIT_DELAY}ms`)
    log('info', `Max Concurrent Requests: ${CONFIG.MAX_CONCURRENT_REQUESTS}`)
    log('info', `Content Filtering: ${CONFIG.ENABLE_CONTENT_FILTERING}`)
    log('info', `Safety Settings:`, CONFIG.SAFETY_SETTINGS)
    log('info', '==============================')
  }
};

// Coordinate validation function
const validateBoundingBoxCoordinates = (box) => {
  const { x_min, y_min, x_max, y_max } = box;
  
  // Check if coordinates are within 0-1000 range
  const isValidRange = x_min >= 0 && x_min <= 1000 && 
                      y_min >= 0 && y_min <= 1000 && 
                      x_max >= 0 && x_max <= 1000 && 
                      y_max >= 0 && y_max <= 1000;
  
  // Check if coordinates make logical sense (min < max)
  const isValidLogic = x_min < x_max && y_min < y_max;
  
  // Check if coordinates are reasonable (not too small or too large)
  const hasReasonableSize = (x_max - x_min) > 10 && (y_max - y_min) > 10;
  
  return isValidRange && isValidLogic && hasReasonableSize;
};

// Helper function to derive vehicle counts from bounding boxes
const deriveVehicleCounts = (boundingBoxes) => {
  if (!Array.isArray(boundingBoxes) || boundingBoxes.length === 0) {
    return {
      cars: 0, trucks: 0, motorcycles: 0, buses: 0, rvs: 0,
      emergency_vehicles: 0, construction_vehicles: 0, other_vehicles: 0
    };
  }
  
  // Normalize vehicle types to handle variations in Gemini responses
  const normalizeVehicleType = (type) => {
    const normalized = type.toLowerCase().trim();
    if (normalized.includes('car') || normalized === 'sedan' || normalized === 'suv') return 'cars';
    if (normalized.includes('truck') || normalized === 'pickup') return 'trucks';
    if (normalized.includes('motorcycle') || normalized === 'bike') return 'other_vehicles'; // motorcycles go to other_vehicles
    if (normalized.includes('bus')) return 'buses';
    if (normalized.includes('rv') || normalized === 'recreational') return 'other_vehicles'; // RVs go to other_vehicles
    if (normalized.includes('emergency') || normalized.includes('police') || normalized.includes('ambulance')) return 'emergency_vehicles';
    if (normalized.includes('construction') || normalized.includes('excavator') || normalized.includes('bulldozer')) return 'construction_vehicles';
    return 'other_vehicles';
  };
  
  const counts = {
    cars: 0, trucks: 0, buses: 0,
    emergency_vehicles: 0, construction_vehicles: 0, other_vehicles: 0
  };
  
  boundingBoxes.forEach(box => {
    if (box.vehicle_type) {
      const normalizedType = normalizeVehicleType(box.vehicle_type);
      counts[normalizedType]++;
    }
  });
  
  return counts;
};

// Helper function to calculate average confidence score from bounding boxes
const calculateAverageConfidence = (boundingBoxes) => {
  if (!Array.isArray(boundingBoxes) || boundingBoxes.length === 0) {
    return 0.0;
  }
  
  // Filter out invalid confidence scores and calculate average
  const validConfidences = boundingBoxes
    .map(box => box.confidence_score)
    .filter(score => typeof score === 'number' && score >= 0 && score <= 1);
  
  if (validConfidences.length === 0) {
    return 0.0;
  }
  
  const sum = validConfidences.reduce((acc, score) => acc + score, 0);
  return sum / validConfidences.length;
};

// Vehicle detection prompt
const VEHICLE_DETECTION_PROMPT = `Analyze this highway traffic camera image and detect ALL vehicles with their bounding boxes. 

CRITICAL: You MUST return ONLY a JSON response in this EXACT format - no other text, no explanations, no additional fields:

{
  "bounding_boxes": [
    {
      "vehicle_type": "<type>",
      "x_min": <0-1000>,
      "y_min": <0-1000>,
      "x_max": <0-1000>,
      "y_max": <0-1000>,
      "confidence_score": <0.0-1.0>
    }
  ]
}

Focus on motor vehicles on the highway only. Do not count pedestrians, bicycles, or stationary objects. Be accurate and conservative in your counts. 

IMPORTANT: The bounding box coordinates MUST be normalized to 0-1000 range where:
- x_min, y_min, x_max, y_max are all values between 0 and 1000
- (0,0) is the top-left corner of the image
- (1000,1000) is the bottom-right corner of the image
- This ensures coordinates work correctly regardless of the actual image resolution
- Coordinates will be validated and must be within this exact range

DO NOT return total_vehicles, vehicles object, notes, or any other fields. ONLY return the bounding_boxes array with the exact structure shown above.

Do NOT return raw pixel coordinates or coordinates outside the 0-1000 range.`;

// Initialize Gemini AI
const initializeGemini = async () => {
  try {
    console.log('=== GEMINI SERVICE: Starting initialization ===')
    
    // Load configuration
    console.log('=== GEMINI SERVICE: Validating configuration ===')
    if (!validateConfig()) {
      console.log('=== GEMINI SERVICE: Configuration validation failed ===')
      throw new Error('Invalid Gemini configuration')
    }

    console.log('=== GEMINI SERVICE: Configuration validation passed, creating GoogleGenerativeAI instance ===')
    
    // Create GoogleGenerativeAI instance
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    console.log('=== GEMINI SERVICE: GoogleGenerativeAI imported successfully ===')
    
    genAI = new GoogleGenerativeAI(CONFIG.GEMINI_API_KEY)
    console.log('=== GEMINI SERVICE: GoogleGenerativeAI instance created ===')

    console.log('=== GEMINI SERVICE: Configuring model ===')
    
    // Configure model with safety settings
    model = genAI.getGenerativeModel({
      model: CONFIG.GEMINI_MODEL,
      safetySettings: getSafetySettings()
    })

    console.log('=== GEMINI SERVICE: Model configured, initializing database connection ===')
    
    // Initialize database connection
    const dbModule = require('../database/connection')
    console.log('=== GEMINI SERVICE: Database module imported ===')
    
    await dbModule.initializeDatabase()
    console.log('=== GEMINI SERVICE: Database initialized ===')
    
    dbConnection = {
      run: dbModule.run,
      runQuery: dbModule.runQuery,
      runSingle: dbModule.runSingle
    }

    console.log('=== GEMINI SERVICE: Database connection configured, testing connection ===')
    
    // Test database connection
    const testQuery = await dbConnection.runSingle('SELECT 1 as test')
    if (!testQuery) {
      throw new Error('Database connection test failed')
    }

    console.log('=== GEMINI SERVICE: Database connection test passed, initializing batch processing ===')
    
    // Initialize batch processing
    await initializeBatchProcessing()

    log('info', 'Gemini AI initialized successfully with enhanced safety settings')
    log('info', `Model: ${CONFIG.GEMINI_MODEL}`)
    log('info', `Safety Level: ${CONFIG.SAFETY_SETTINGS.HARM_CATEGORY_HARASSMENT}`)
    log('info', `Batch Processing: ${CONFIG.USE_BATCH_MODE ? 'Enabled' : 'Disabled'}`)

    console.log('=== GEMINI SERVICE: Initialization completed successfully ===')
    return true
  } catch (error) {
    console.error('=== GEMINI SERVICE: Initialization failed ===')
    console.error('Error details:', error.message)
    console.error('Stack trace:', error.stack)
    console.error('=== END GEMINI ERROR ===')
    log('error', `Failed to initialize Gemini AI: ${error.message}`)
    throw error
  }
}

// Get base64 image data
const getBase64Image = async (imagePath) => {
  const imageBuffer = await fs.readFile(imagePath);
  return imageBuffer.toString('base64');
};

const createInlineBatchJob = async (images) => {
  if (!client) {
    log('error', 'Gemini AI not initialized, skipping inline batch job')
    return []
  }
  
  try {
    log('info', `Creating inline batch job for ${images.length} images...`)
    
    // For now, fall back to individual processing since batch API isn't available
    // TODO: Implement proper batch API when available
    log('info', 'Batch API not yet available, falling back to individual processing')
    return await processImagesIndividually(images)
    
  } catch (error) {
    log('error', `Error creating inline batch job: ${error.message}`)
    throw error
  }
}

const createFileBasedBatchJob = async (images) => {
  if (!client) {
    log('error', 'Gemini AI not initialized, skipping file-based batch job')
    return []
  }
  
  try {
    log('info', `Creating file-based batch job for ${images.length} images...`)
    
    // For now, fall back to individual processing since batch API isn't available
    // TODO: Implement proper batch API when available
    log('info', 'Batch API not yet available, falling back to individual processing')
    return await processImagesIndividually(images)
    
  } catch (error) {
    log('error', `Error creating file-based batch job: ${error.message}`)
    throw error
  }
}

const monitorBatchJob = async (jobName, images) => {
  // TODO: Implement when batch API is available
  log('info', 'Batch monitoring not yet implemented')
  return []
}

const processBatchResults = async (batchJob, images) => {
  // TODO: Implement when batch API is available
  log('info', 'Batch result processing not yet implemented')
  return []
}

const parseGeminiResponse = (responseText) => {
  try {
    // Clean the response text
    const cleanedText = responseText.replace(/```json\s*|\s*```/g, '').trim()
    
    // Parse JSON
    const parsedResponse = JSON.parse(cleanedText)
    
    // Validate response structure
    if (!parsedResponse.bounding_boxes || !Array.isArray(parsedResponse.bounding_boxes)) {
      throw new Error('Response missing or invalid bounding_boxes array')
    }
    
    // Validate each bounding box
    for (const box of parsedResponse.bounding_boxes) {
      if (!box.vehicle_type || 
          typeof box.x_min !== 'number' || 
          typeof box.y_min !== 'number' || 
          typeof box.x_max !== 'number' || 
          typeof box.y_max !== 'number' ||
          typeof box.confidence_score !== 'number') {
        throw new Error('Invalid bounding box structure')
      }
      
      // Check if coordinates are already in 0-1000 range
      const isNormalized = box.x_min >= 0 && box.x_min <= 1000 && 
                          box.y_min >= 0 && box.y_min <= 1000 && 
                          box.x_max >= 0 && box.x_max <= 1000 && 
                          box.y_max >= 0 && box.y_max <= 1000;
      
      // If coordinates are not normalized, assume they're raw pixel coordinates and transform them
      if (!isNormalized) {
        log('warn', `Coordinates not in 0-1000 range, assuming raw pixel coordinates and normalizing`)
        
        // Find the maximum coordinate values to determine image dimensions
        const maxX = Math.max(box.x_min, box.x_max)
        const maxY = Math.max(box.y_min, box.y_max)
        
        // Normalize to 0-1000 range
        box.x_min = Math.round((box.x_min / maxX) * 1000)
        box.y_min = Math.round((box.y_min / maxY) * 1000)
        box.x_max = Math.round((box.x_max / maxX) * 1000)
        box.y_max = Math.round((box.y_max / maxY) * 1000)
        
        log('info', `Normalized coordinates: [${box.x_min}, ${box.y_min}, ${box.x_max}, ${box.y_max}]`)
      }
      
      // Validate coordinate ranges after normalization
      if (box.x_min < 0 || box.x_min > 1000 || 
          box.y_min < 0 || box.y_min > 1000 || 
          box.x_max < 0 || box.x_max > 1000 || 
          box.y_max < 0 || box.y_max > 1000) {
        throw new Error('Bounding box coordinates out of range (0-1000) after normalization')
      }
      
      // Validate confidence score range
      if (box.confidence_score < 0 || box.confidence_score > 1) {
        throw new Error('Confidence score out of range (0-1)')
      }
    }
    
    log('info', `Successfully parsed Gemini response with ${parsedResponse.bounding_boxes.length} bounding boxes`)
    return parsedResponse
  } catch (parseError) {
    log('error', `Failed to parse Gemini response: ${parseError.message}`)
    log('error', `Raw response: ${responseText}`)
    return null
  }
}

const retryWithBackoff = async (operation, operationName, retries = CONFIG.MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const isRetryable = isRetryableError(error)
      const isRateLimitError = isRateLimitError(error)
      
      if (!isRetryable || attempt === retries) {
        log('error', `${operationName} failed permanently after ${attempt} attempts: ${error.message}`)
        throw error
      }
      
      if (isRateLimitError) {
        log('warn', `${operationName} rate limited, waiting before retry ${attempt}/${retries}`)
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY * attempt))
      } else {
        const delay = Math.min(
          CONFIG.BASE_RETRY_DELAY * Math.pow(2, attempt - 1),
          CONFIG.MAX_RETRY_DELAY
        )
        log('warn', `${operationName} failed, retrying in ${delay}ms (attempt ${attempt}/${retries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
}

// Error categorization
const isRetryableError = (error) => {
  // Network errors, timeouts, and rate limits are retryable
  if (error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ENOTFOUND' ||
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.message.includes('rate limit')) {
    return true
  }
  
  // Gemini API specific retryable errors
  if (error.message.includes('quota exceeded') ||
      error.message.includes('rate limit') ||
      error.message.includes('temporary') ||
      error.message.includes('retry')) {
    return true
  }
  
  return false
}

const isRateLimitError = (error) => {
  return error.message.includes('rate limit') || 
         error.message.includes('quota exceeded') ||
         error.status === 429
}



// Enhanced content filtering
const filterContent = (text) => {
  if (!CONFIG.ENABLE_CONTENT_FILTERING) {
    return text
  }
  
  // Remove potentially harmful content
  const filtered = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
  
  return filtered
}

// Process a batch of images using official batch mode
const processImageBatch = async (images) => {
  if (!model) {
    log('error', 'Gemini AI model not initialized')
    return []
  }

  if (!CONFIG.USE_BATCH_MODE) {
    log('info', 'Batch mode disabled, falling back to individual processing')
    return await processImagesIndividually(images)
  }

  try {
    log('info', `Processing batch of ${images.length} images with Gemini AI Batch Mode...`)
    
    // Check if batch API is available
    if (!model.batchGenerateContent) {
      log('info', 'Batch API not yet available, using individual processing')
      return await processImagesIndividually(images)
    }

    // Fallback to individual processing for now
    log('info', 'Falling back to individual image processing...')
    return await processImagesIndividually(images)
  } catch (error) {
    log('error', `Batch processing failed: ${error.message}`)
    // Fallback to individual processing
    return await processImagesIndividually(images)
  }
}

// Fallback: Process images individually (legacy method)
const processImagesIndividually = async (images) => {
  if (!model) {
    log('error', 'Gemini AI model not initialized')
    return []
  }

  const batchSize = Math.min(images.length, CONFIG.BATCH_SIZE)
  const concurrencyLimit = CONFIG.MAX_CONCURRENT_REQUESTS
  
  log('info', `Processing ${batchSize} images individually with enhanced safety settings...`)

  // Process images in chunks to respect concurrency limits
  const chunks = []
  for (let i = 0; i < batchSize; i += concurrencyLimit) {
    chunks.push(images.slice(i, i + concurrencyLimit))
  }

  const results = []
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    log('info', `Processing chunk of ${chunk.length} images...`)
    
    const chunkPromises = chunk.map(async (image) => {
      try {
        const fullImagePath = path.join(__dirname, '../storage/images', image.local_path)
        
        if (!fs.existsSync(fullImagePath)) {
          log('error', `Image file not found: ${fullImagePath}`)
          return {
            image_id: image.id,
            success: false,
            error: 'Image file not found'
          }
        }

        // Read and encode image
        const imageBuffer = fs.readFileSync(fullImagePath)
        const base64Image = imageBuffer.toString('base64')
        
        // Create image part for Gemini
        const imagePart = {
          inlineData: {
            data: base64Image,
            mimeType: 'image/jpeg'
          }
        }

        // Call Gemini AI
        log('info', `Calling Gemini AI for image ${image.id}...`)
        
        const result = await model.generateContent([
          VEHICLE_DETECTION_PROMPT,
          imagePart
        ])

        const response = await result.response
        const responseText = response.text()
        
        log('info', `Gemini API response received for image ${image.id}`)
        
        // Clean and parse response
        const filteredResponse = responseText.replace(/```json\s*|\s*```/g, '').trim()
        
        // Parse JSON response
        const parsedResponse = parseGeminiResponse(filteredResponse)
        
        if (!parsedResponse) {
          throw new Error('Failed to parse Gemini response')
        }

        // Create result object for storeVehicleDetection
        const detectionResult = {
          image_id: image.id,
          success: true,
          bounding_boxes: parsedResponse.bounding_boxes
        }
        
        // Store vehicle detection data
        await storeVehicleDetection(detectionResult)
        
        log('info', `Image ${image.id} processed successfully: ${parsedResponse.bounding_boxes.length} vehicles detected from bounding boxes`)
        
        return detectionResult
      } catch (error) {
        log('error', `Error processing image ${image.id}: ${error.message}`)
        return {
          image_id: image.id,
          success: false,
          error: error.message
        }
      }
    })

    const chunkResults = await Promise.all(chunkPromises)
    results.push(...chunkResults)
    
    log('info', `Chunk completed with ${chunkResults.length} results`)
    
    // Rate limiting between chunks
    if (i < chunks.length - 1) {
      log('info', `Waiting ${CONFIG.RATE_LIMIT_DELAY}ms before processing next chunk...`)
      await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY))
    }
  }

  log('info', `All chunks completed. Total results: ${results.length}`)
  return results
}

// Queue for processing images
let processingQueue = [];
let isProcessing = false;
let batchProcessingTimer = null;

// Initialize batch processing timer (runs every 5 minutes)
const initializeBatchProcessing = async () => {
  try {
    log('info', 'Starting initializeBatchProcessing...')
    
    // Clear existing timer if any
    if (batchProcessingTimer) {
      clearInterval(batchProcessingTimer)
      log('info', 'Clearing existing batch processing timer...')
    }
    
    // Check database connection
    if (!dbConnection) {
      log('error', 'Database connection not available for batch processing')
      return false
    }
    
    log('info', 'Checking database connection...')
    
    // Test database connection
    try {
      const testQuery = await dbConnection.runSingle('SELECT 1 as test')
      log('info', 'Database connection test successful:', testQuery)
    } catch (error) {
      log('error', 'Database connection test failed:', error.message)
      return false
    }
    
    // Set up batch processing timer - no need to preload images
    batchProcessingTimer = setInterval(async () => {
      log('info', 'Batch processing timer triggered, calling processQueue...')
      await processQueue()
    }, 5 * 60 * 1000) // Every 5 minutes
    
    log('info', 'AI analytics batch processing initialized (every 5 minutes)')
    return true
  } catch (error) {
    log('error', `Failed to initialize batch processing: ${error.message}`)
    return false
  }
}

// Update processing status for an image
const updateProcessingStatus = async (imageId, status) => {
  if (!dbConnection) {
    log('error', 'Database connection not available for updating processing status')
    return
  }
  
  try {
    log('info', `Updating processing status for image ${imageId} to '${status}'...`)
    const result = await dbConnection.run(`
      UPDATE vehicle_detections 
      SET processing_status = ?, processed_at = datetime('now')
      WHERE image_id = ?
    `, [status, imageId])
    
    log('info', `Updated processing status for image ${imageId} to '${status}', result:`, result)
  } catch (error) {
    log('error', `Error updating processing status for image ${imageId}: ${error.message}`)
  }
}

// Add image to processing queue
const queueImageForAnalysis = async (image) => {
  if (!dbConnection) {
    log('error', 'Database connection not available for queuing image')
    return false
  }
  
  try {
    // Check if vehicle detection record already exists
    const existingRecord = await dbConnection.runQuery(`
      SELECT id, processing_status 
      FROM vehicle_detections 
      WHERE image_id = ?
    `, [image.id])
    
    if (existingRecord && existingRecord.length > 0) {
      // Update existing record to 'queued' status
      await dbConnection.run(`
        UPDATE vehicle_detections 
        SET processing_status = 'queued', processed_at = NULL
        WHERE image_id = ?
      `, [image.id])
      
      log('info', `Updating existing vehicle detection record for image ${image.id} to 'queued' status`)
    } else {
      // Create new vehicle detection record
      const result = await dbConnection.run(`
        INSERT INTO vehicle_detections (image_id, camera_id, processing_status, created_at)
        VALUES (?, ?, 'queued', datetime('now'))
      `, [image.id, image.camera_id])
      
      log('info', `Creating vehicle detection record for image ${image.id}...`)
      
      if (result.changes > 0) {
        log('info', `Created vehicle detection record for image ${image.id} with 'queued' status, result:`, result)
      } else {
        log('error', `Failed to create vehicle detection record for image ${image.id}`)
        return false
      }
    }
    
    log('info', `Image ${image.id} queued for AI analysis successfully`)
    return true
  } catch (error) {
    log('error', `Error handling vehicle detection record for image ${image.id}: ${error.message}`)
    return false
  }
}

// Process the queue
const processQueue = async () => {
  log('info', '=== processQueue called ===')
  log('info', `isProcessing: ${isProcessing}`)
  
  if (isProcessing) {
    log('info', 'Queue processing already in progress, skipping...')
    return
  }
  
  // Always reload queued images from database instead of relying on in-memory queue
  log('info', 'Reloading queued images from database...')
  const queuedImages = await dbConnection.runQuery(`
    SELECT 
      i.id, 
      i.camera_id, 
      i.local_path,
      vd.id as vehicle_detection_id
    FROM images i
    JOIN vehicle_detections vd ON i.id = vd.image_id
    WHERE vd.processing_status = 'queued'
    ORDER BY i.created_at ASC
  `)
  
  log('info', `Found ${queuedImages.length} queued images in database`)
  
  if (queuedImages.length === 0) {
    log('info', 'No images in queue to process')
    return
  }
  
  isProcessing = true
  log('info', `Starting to process ${queuedImages.length} images from database...`)
  
  try {
    // Process images in batches
    for (let i = 0; i < queuedImages.length; i += CONFIG.BATCH_SIZE) {
      const batch = queuedImages.slice(i, i + CONFIG.BATCH_SIZE)
      log('info', `Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1} of ${Math.ceil(queuedImages.length / CONFIG.BATCH_SIZE)} (${batch.length} images)...`)
      
      // Update status to 'processing' for all images in batch
      for (const image of batch) {
        log('info', `Updating status to 'processing' for image ${image.id}`)
        await updateProcessingStatus(image.id, 'processing')
      }
      
      log('info', 'Calling processImageBatch...')
      const results = await processImageBatch(batch)
      log('info', `Received ${results.length} results from batch processing`)
      
      // Log each result
      results.forEach((result, index) => {
        log('info', `Result ${index + 1}: Image ${result.image_id}, Success: ${result.success}, Error: ${result.error || 'none'}`)
      })
      
      // Store results in database and update status
      for (const result of results) {
        log('info', `Storing result for image ${result.image_id}, success: ${result.success}`)
        await storeVehicleDetection(result)
      }
      
      // Rate limiting between batches
      if (i + CONFIG.BATCH_SIZE < queuedImages.length) {
        log('info', `Waiting ${CONFIG.RATE_LIMIT_DELAY}ms before processing next batch...`)
        await new Promise(resolve => setTimeout(resolve, CONFIG.RATE_LIMIT_DELAY))
      }
    }
    
    log('info', 'All batches completed successfully')
  } catch (error) {
    log('error', `Error processing image queue: ${error.message}`)
    log('error', 'Error stack:', error.stack)
  } finally {
    isProcessing = false
    log('info', 'Finished processing image queue')
  }
}

// Store vehicle detection results in database
const storeVehicleDetection = async (result) => {
  if (!dbConnection) {
    log('error', 'Database connection not available for storing vehicle detection')
    return {
      success: false,
      error: 'Database connection not available'
    }
  }
  
  try {
    if (!result || !result.image_id) {
      log('error', 'Invalid result format for storing vehicle detection')
      return {
        success: false,
        error: 'Invalid result format'
      }
    }
    
    // Check if vehicle detection record already exists
    const vehicleDetectionResult = await dbConnection.runQuery(`
      SELECT id FROM vehicle_detections WHERE image_id = ?
    `, [result.image_id])
    
    if (vehicleDetectionResult.length === 0) {
      log('error', `No vehicle detection record found for image ${result.image_id}`)
      return {
        success: false,
        error: 'No vehicle detection record found'
      }
    }
    
    const vehicleDetectionId = vehicleDetectionResult[0].id
    
    // Check if result has bounding boxes data
    if (result.success && result.bounding_boxes && Array.isArray(result.bounding_boxes)) {
      const boundingBoxes = result.bounding_boxes
      
      log('info', `Storing vehicle detection for image ${result.image_id} with ${boundingBoxes.length} bounding boxes`)
      
      // Derive vehicle counts and confidence from bounding boxes
      const vehicleCounts = deriveVehicleCounts(boundingBoxes)
      const avgConfidence = calculateAverageConfidence(boundingBoxes)
      
      log('info', `Derived vehicle counts:`, vehicleCounts)
      log('info', `Average confidence: ${avgConfidence}`)
      
      // Update existing vehicle detection record with results
      log('info', `Updating vehicle detection record for image ${result.image_id}...`)
      const updateResult = await dbConnection.run(`
        UPDATE vehicle_detections SET
          total_vehicles = ?,
          cars = ?,
          trucks = ?,
          buses = ?,
          emergency_vehicles = ?,
          construction_vehicles = ?,
          other_vehicles = ?,
          confidence_score = ?,
          processed_at = datetime('now')
        WHERE id = ?
      `, [
        boundingBoxes.length,
        vehicleCounts.cars,
        vehicleCounts.trucks,
        vehicleCounts.buses,
        vehicleCounts.emergency_vehicles,
        vehicleCounts.construction_vehicles,
        vehicleCounts.other_vehicles,
        avgConfidence,
        vehicleDetectionId
      ])
      
      log('info', `Update result:`, updateResult)
      log('info', `Found vehicle detection record with ID: ${vehicleDetectionId}`)
      
      // Store bounding boxes if they exist
      if (boundingBoxes && Array.isArray(boundingBoxes) && boundingBoxes.length > 0) {
        log('info', `Processing ${boundingBoxes.length} bounding boxes...`)
        let validBoxes = 0
        let invalidBoxes = 0
        
        for (const box of boundingBoxes) {
          try {
            // Validate bounding box coordinates
            const isValid = box.x_min >= 0 && box.x_min <= 1000 &&
                           box.y_min >= 0 && box.y_min <= 1000 &&
                           box.x_max >= 0 && box.x_max <= 1000 &&
                           box.y_max >= 0 && box.y_max <= 1000 &&
                           box.x_min < box.x_max && box.y_min < box.y_max
            
            // Insert bounding box
            const insertResult = await dbConnection.run(`
              INSERT INTO vehicle_bounding_boxes (
                vehicle_detection_id, image_id, vehicle_type, x_min, y_min, x_max, y_max, 
                confidence_score, is_valid, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            `, [
              vehicleDetectionId,
              result.image_id,
              box.vehicle_type || 'unknown',
              box.x_min,
              box.y_min,
              box.x_max,
              box.y_max,
              box.confidence_score || 0.0,
              isValid ? 1 : 0
            ])
            
            log('info', `Inserted bounding box with result:`, insertResult)
            
            if (isValid) {
              validBoxes++
              log('info', `Stored valid bounding box for ${box.vehicle_type} at [${box.x_min}, ${box.y_min}, ${box.x_max}, ${box.y_max}]`)
            } else {
              invalidBoxes++
              log('info', `Stored invalid bounding box for ${box.vehicle_type} at [${box.x_min}, ${box.y_min}, ${box.x_max}, ${box.y_max}] - marked as invalid`)
            }
          } catch (boxError) {
            log('error', `Error storing bounding box for ${box.vehicle_type || 'unknown'}: ${boxError.message}`)
          }
        }
        log('info', `Stored ${validBoxes} valid and ${invalidBoxes} invalid bounding boxes for image ${result.image_id}`)
      } else {
        log('info', `No bounding boxes to store for image ${result.image_id}`)
      }
      
      log('info', `Stored vehicle detection for image ${result.image_id}: ${boundingBoxes.length} vehicles`)
      log('info', `Derived vehicle counts:`, vehicleCounts)
      log('info', `Average confidence score: ${avgConfidence.toFixed(3)}`)
      
      // Log vehicle type normalization if detailed logging is enabled
      if (CONFIG.ENABLE_DETAILED_LOGGING) {
        log('info', `Vehicle type normalization for image ${result.image_id}:`, boundingBoxes.map(box => ({
          original: box.vehicle_type,
          normalized: normalizeVehicleType(box.vehicle_type)
        })))
      }
      
      // Update processing status to completed
      await updateProcessingStatus(result.image_id, 'completed')
      
      return {
        success: true,
        image_id: result.image_id,
        vehicle_count: boundingBoxes.length,
        confidence_score: avgConfidence
      }
    } else {
      log('error', `Invalid result format for image ${result.image_id}:`, result)
      return {
        success: false,
        image_id: result.image_id,
        error: 'Invalid result format'
      }
    }
  } catch (error) {
    log('error', `Error in storeVehicleDetection: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}

// Re-analyze existing images that are missing bounding boxes
const reanalyzeMissingBoundingBoxes = async () => {
  if (!dbConnection) {
    log('error', 'Database connection not available for reanalysis')
    return false
  }
  
  try {
    log('info', 'Starting reanalysis of images missing bounding boxes...')
    
    // Find images that have vehicle detection records but no bounding boxes
    const imagesToReanalyze = await dbConnection.runQuery(`
      SELECT DISTINCT i.id, i.camera_id, i.local_path
      FROM images i
      JOIN vehicle_detections vd ON i.id = vd.image_id
      LEFT JOIN vehicle_bounding_boxes vbb ON vd.id = vbb.vehicle_detection_id
      WHERE vd.processing_status = 'completed' 
        AND vbb.id IS NULL
        AND vd.total_vehicles > 0
      ORDER BY i.created_at DESC
      LIMIT 10
    `)
    
    if (imagesToReanalyze.length === 0) {
      log('info', 'No images found that need reanalysis')
      return true
    }
    
    log('info', `Found ${imagesToReanalyze.length} images that need reanalysis`)
    
    // Process each image individually
    for (const image of imagesToReanalyze) {
      try {
        log('info', `Reanalyzing image ${image.id}...`)
        
        // Update status to processing
        await updateProcessingStatus(image.id, 'processing')
        
        // Process the image
        const results = await processImagesIndividually([image])
        
        if (results.length > 0 && results[0].success) {
          log('info', `Successfully reanalyzed image ${image.id}`)
        } else {
          log('error', `Failed to reanalyze image ${image.id}: ${results[0]?.error || 'Unknown error'}`)
          await updateProcessingStatus(image.id, 'failed')
        }
        
        // Small delay between images
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        log('error', `Error reanalyzing image ${image.id}: ${error.message}`)
        await updateProcessingStatus(image.id, 'failed')
      }
    }
    
    log('info', 'Reanalysis completed')
    return true
  } catch (error) {
    log('error', `Error during reanalysis: ${error.message}`)
    return false
  }
}

// Get vehicle detection statistics
const getVehicleDetectionStats = async (cameraId = null, timeRange = '24h') => {
  if (!dbConnection) {
    log('error', 'Database connection not available for getting vehicle detection stats')
    return {}
  }
  
  try {
    let whereClause = ''
    let params = []
    
    if (cameraId) {
      whereClause = 'WHERE vd.camera_id = ?'
      params.push(cameraId)
    }
    
    // Add time range filter
    if (timeRange === '24h') {
      whereClause += whereClause ? ' AND ' : 'WHERE '
      whereClause += 'vd.processed_at >= datetime("now", "-24 hours")'
    } else if (timeRange === '7d') {
      whereClause += whereClause ? ' AND ' : 'WHERE '
      whereClause += 'vd.processed_at >= datetime("now", "-7 days")'
    } else if (timeRange === '30d') {
      whereClause += whereClause ? ' AND ' : 'WHERE '
      whereClause += 'vd.processed_at >= datetime("now", "-30 days")'
    }
    
    const stats = await dbConnection.runQuery(`
      SELECT 
        COUNT(*) as total_images,
        SUM(vd.total_vehicles) as total_vehicles,
        AVG(vd.confidence_score) as avg_confidence,
        COUNT(CASE WHEN vd.processing_status = 'completed' THEN 1 END) as completed_images,
        COUNT(CASE WHEN vd.processing_status = 'failed' THEN 1 END) as failed_images,
        COUNT(CASE WHEN vd.processing_status = 'queued' THEN 1 END) as queued_images
      FROM vehicle_detections vd
      ${whereClause}
    `, params)
    
    return stats[0] || {}
  } catch (error) {
    log('error', `Error getting vehicle detection stats: ${error.message}`)
    return {}
  }
}

// Get current configuration
const getConfiguration = () => {
  return {
    ...CONFIG,
    api_key_configured: !!CONFIG.GEMINI_API_KEY,
    model_configured: !!CONFIG.GEMINI_MODEL
  }
}

// Update configuration at runtime (for testing/debugging)
const updateConfiguration = (updates) => {
  // Update configuration values
  Object.assign(CONFIG, updates)
  
  // Validate the updated configuration
  if (!validateConfig()) {
    log('error', 'Configuration validation failed after update')
    return false
  }
  
  log('info', 'Configuration updated successfully')
  return true
}

module.exports = {
  initializeGemini,
  queueImageForAnalysis,
  getVehicleDetectionStats,
  isGeminiAvailable: () => !!model,
  updateProcessingStatus,
  reanalyzeMissingBoundingBoxes,
  initializeBatchProcessing,
  processQueue,
  processImageBatch,
  getConfiguration,
  updateConfiguration,
  validateConfig,
  deriveVehicleCounts,
  calculateAverageConfidence
};

