// Load environment variables from .env file
require('dotenv').config()

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const cron = require('node-cron');
const morgan = require('morgan');

// Import system management services
const { logger } = require('./services/loggerService');
const healthService = require('./services/healthService');
const configService = require('./services/configService');
const metricsService = require('./services/metricsService');

const cameraRoutes = require('./routes/cameras');
const imageRoutes = require('./routes/images');
const vehicleDetectionRoutes = require('./routes/vehicleDetection');
const systemRoutes = require('./routes/system');
const { initializeDatabase } = require('./database/connection');
const { updateCameraImages } = require('./services/cameraService');

// Initialize Gemini AI service
const { initializeGemini, reanalyzeMissingBoundingBoxes, initializeBatchProcessing } = require('./services/geminiService');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// HTTP request logging with Morgan
app.use(morgan('combined', { stream: logger.stream }));

// Performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Record request start
  metricsService.recordCustomMetric('http_request_start', 1, {
    method: req.method,
    path: req.path
  });
  
  // Override res.end to record metrics
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - start;
    
    // Record request metrics
    metricsService.recordRequest(req.method, req.path, res.statusCode, responseTime);
    
    // Record custom metrics
    metricsService.recordCustomMetric('http_request_duration', responseTime, {
      method: req.method,
      path: req.path,
      status: res.statusCode
    });
    
    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
});

app.use(express.static(path.join(__dirname, '../client/dist')));

// API Routes
app.use('/api/cameras', cameraRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/vehicle-detection', vehicleDetectionRoutes);
app.use('/api/system', systemRoutes);

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Initialize database and start server
initializeDatabase()
  .then(async () => {
    console.log('Database initialized successfully')
    
    // Initialize system management services
    try {
      await healthService.initialize();
      console.log('Health monitoring service initialized');
    } catch (error) {
      console.error('Failed to initialize health service:', error.message);
    }
    
    // Initialize Gemini AI
    try {
      console.log('=== STARTING GEMINI INITIALIZATION ===')
      console.log('Environment check:')
      console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET' : 'NOT SET')
      console.log('- GEMINI_MODEL:', process.env.GEMINI_MODEL || 'gemini-2.0-flash')
      console.log('- NODE_ENV:', process.env.NODE_ENV)
      
      const geminiInitialized = await initializeGemini()
      console.log('Gemini initialization result:', geminiInitialized)
      
      if (geminiInitialized) {
        console.log('Gemini AI service initialized successfully')
        
        // Initialize batch processing for AI analytics
        try {
          console.log('Starting to initialize batch processing...')
          await initializeBatchProcessing()
          console.log('Batch processing initialized successfully')
        } catch (error) {
          console.error('Failed to initialize batch processing:', error.message)
        }
        
        // Re-analyze existing images that are missing bounding boxes
        setTimeout(async () => {
          try {
            console.log('Starting to re-analyze missing bounding boxes...')
            await reanalyzeMissingBoundingBoxes()
            console.log('Finished re-analyzing missing bounding boxes')
          } catch (error) {
            console.error('Error re-analyzing missing bounding boxes:', error.message)
          }
        }, 5000) // Wait 5 seconds after startup
      } else {
        console.warn('Gemini AI service not available (check GEMINI_API_KEY environment variable)')
      }
    } catch (error) {
      console.error('=== GEMINI INITIALIZATION FAILED ===')
      console.error('Error details:', error.message)
      console.error('Stack trace:', error.stack)
      console.error('=== END ERROR ===')
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
      console.log(`Frontend available at http://localhost:3000`)
      console.log(`API available at http://localhost:${PORT}/api`)
      console.log(`System management API available at http://localhost:${PORT}/api/system`)
      
      // Schedule camera image updates every minute (to capture all changes)
      cron.schedule('* * * * *', async () => {
        try {
          console.log('Running scheduled camera update...')
          await updateCameraImages()
        } catch (error) {
          console.error('Scheduled update failed:', error.message)
        }
      })
      
      // Schedule AI analytics batch processing every 5 minutes
      cron.schedule('*/5 * * * *', async () => {
        try {
          console.log('Running scheduled AI analytics batch processing...')
          console.log('Importing processQueue from geminiService...')
          
          // Import and call the geminiService queue processing
          const { processQueue } = require('./services/geminiService')
          console.log('processQueue imported successfully, calling function...')
          
          await processQueue()
          console.log('processQueue completed successfully')
        } catch (error) {
          console.error('Scheduled AI processing failed:', error.message)
        }
      })
      
      console.log('Scheduled camera updates enabled (every minute)')
      console.log('Scheduled AI analytics batch processing enabled (every 5 minutes)')
    })
  })
  .catch((error) => {
    console.error('Database initialization failed:', error.message)
    process.exit(1)
  })

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...')
  
  try {
    // Cleanup services
    healthService.cleanup();
    configService.cleanup();
    metricsService.cleanup();
    
    console.log('All services cleaned up, exiting...')
    process.exit(0)
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message)
    process.exit(1)
  }
})

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...')
  
  try {
    // Cleanup services
    healthService.cleanup();
    configService.cleanup();
    metricsService.cleanup();
    
    console.log('All services cleaned up, exiting...')
    process.exit(0)
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message)
    process.exit(1)
  }
})
