const express = require('express');
const healthService = require('../services/healthService');
const configService = require('../services/configService');
const metricsService = require('../services/metricsService');
const { log } = require('../services/loggerService');

const router = express.Router();

// Middleware to check maintenance mode
const checkMaintenanceMode = (req, res, next) => {
  if (configService.isMaintenanceMode() && 
      !req.path.startsWith('/health') && 
      !req.path.startsWith('/maintenance') &&
      !req.path.startsWith('/config')) {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: configService.getMaintenanceMessage(),
      maintenanceMode: true
    });
  }
  next();
};

// Apply maintenance mode check to all routes
router.use(checkMaintenanceMode);

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await healthService.getHealthStatus();
    
    // Set appropriate HTTP status
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      duration: healthStatus.duration,
      summary: healthStatus.summary,
      results: healthStatus.results,
      errors: healthStatus.errors
    });
  } catch (error) {
    log.error('Health check endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
});

// Quick health check (lightweight)
router.get('/health/quick', async (req, res) => {
  try {
    const healthStatus = await healthService.getHealthStatus();
    
    res.json({
      success: true,
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      summary: healthStatus.summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Quick health check failed'
    });
  }
});

// System metrics endpoint
router.get('/metrics', (req, res) => {
  try {
    const format = req.query.format || 'json';
    
    if (format === 'prometheus') {
      res.set('Content-Type', 'text/plain');
      res.send(metricsService.getPrometheusMetrics());
    } else {
      res.json({
        success: true,
        data: metricsService.exportMetrics()
      });
    }
  } catch (error) {
    log.error('Metrics endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics'
    });
  }
});

// Metrics summary endpoint
router.get('/metrics/summary', (req, res) => {
  try {
    const summary = metricsService.getMetricsSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    log.error('Metrics summary endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics summary'
    });
  }
});

// Historical metrics endpoint
router.get('/metrics/historical/:type', (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const history = metricsService.getHistoricalMetrics(type, limit);
    
    res.json({
      success: true,
      data: {
        type,
        limit,
        count: history.length,
        history
      }
    });
  } catch (error) {
    log.error('Historical metrics endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve historical metrics'
    });
  }
});

// Configuration endpoints
router.get('/config', (req, res) => {
  try {
    const config = configService.getAll();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    log.error('Config retrieval failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration'
    });
  }
});

// Get configuration schema
router.get('/config/schema', (req, res) => {
  try {
    const schema = configService.getSchema();
    
    res.json({
      success: true,
      data: schema
    });
  } catch (error) {
    log.error('Config schema retrieval failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration schema'
    });
  }
});

// Get specific configuration value
router.get('/config/:key(*)', (req, res) => {
  try {
    const { key } = req.params;
    const value = configService.get(key);
    
    if (value === undefined) {
      return res.status(404).json({
        success: false,
        error: 'Configuration key not found',
        key
      });
    }
    
    res.json({
      success: true,
      data: {
        key,
        value
      }
    });
  } catch (error) {
    log.error('Config value retrieval failed', { error: error.message, key: req.params.key });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve configuration value'
    });
  }
});

// Update configuration
router.put('/config/:key(*)', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required in request body'
      });
    }
    
    // Validate the configuration value
    const validation = configService.validate(key, value);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration value',
        details: validation.error
      });
    }
    
    const result = await configService.set(key, value);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    log.error('Config update failed', { error: error.message, key: req.params.key });
    res.status(500).json({
      success: false,
      error: 'Failed to update configuration'
    });
  }
});

// Update multiple configuration values
router.patch('/config', async (req, res) => {
  try {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Updates object is required in request body'
      });
    }
    
    const results = await configService.update(updates);
    
    res.json({
      success: true,
      data: {
        updated: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      }
    });
  } catch (error) {
    log.error('Bulk config update failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update configurations'
    });
  }
});

// Reset configuration to defaults
router.post('/config/reset', async (req, res) => {
  try {
    const result = await configService.reset();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    log.error('Config reset failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to reset configuration'
    });
  }
});

// Maintenance mode endpoints
router.get('/maintenance', (req, res) => {
  try {
    const isMaintenance = configService.isMaintenanceMode();
    const message = configService.getMaintenanceMessage();
    
    res.json({
      success: true,
      data: {
        maintenanceMode: isMaintenance,
        message
      }
    });
  } catch (error) {
    log.error('Maintenance status check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to check maintenance status'
    });
  }
});

// Enable maintenance mode
router.post('/maintenance/enable', async (req, res) => {
  try {
    const { message } = req.body;
    
    await configService.enableMaintenanceMode(message);
    
    res.json({
      success: true,
      message: 'Maintenance mode enabled',
      data: {
        maintenanceMode: true,
        message: configService.getMaintenanceMessage()
      }
    });
  } catch (error) {
    log.error('Maintenance mode enable failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to enable maintenance mode'
    });
  }
});

// Disable maintenance mode
router.post('/maintenance/disable', async (req, res) => {
  try {
    await configService.disableMaintenanceMode();
    
    res.json({
      success: true,
      message: 'Maintenance mode disabled',
      data: {
        maintenanceMode: false
      }
    });
  } catch (error) {
    log.error('Maintenance mode disable failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to disable maintenance mode'
    });
  }
});

// System information endpoint
router.get('/info', (req, res) => {
  try {
    const info = {
      version: require('../../package.json').version,
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: info
    });
  } catch (error) {
    log.error('System info retrieval failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system information'
    });
  }
});

// System logs endpoint
router.get('/logs', (req, res) => {
  try {
    const { level, limit = 100, since } = req.query;
    
    // This would typically read from log files
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Log retrieval not yet implemented',
      data: {
        level: level || 'all',
        limit: parseInt(limit),
        since: since || '24h'
      }
    });
  } catch (error) {
    log.error('Log retrieval failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve logs'
    });
  }
});

// Reset metrics endpoint
router.post('/metrics/reset', (req, res) => {
  try {
    metricsService.resetMetrics();
    
    res.json({
      success: true,
      message: 'Metrics reset successfully'
    });
  } catch (error) {
    log.error('Metrics reset failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics'
    });
  }
});

// Health check interval configuration
router.put('/health/interval', async (req, res) => {
  try {
    const { interval } = req.body;
    
    if (!interval || typeof interval !== 'number' || interval < 1000) {
      return res.status(400).json({
        success: false,
        error: 'Interval must be a number greater than 1000ms'
      });
    }
    
    healthService.setCheckInterval(interval);
    
    res.json({
      success: true,
      message: 'Health check interval updated',
      data: {
        interval: `${interval}ms`
      }
    });
  } catch (error) {
    log.error('Health interval update failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to update health check interval'
    });
  }
});

// Manual health check trigger
router.post('/health/check', async (req, res) => {
  try {
    const healthStatus = await healthService.runHealthChecks();
    
    res.json({
      success: true,
      message: 'Manual health check completed',
      data: healthStatus
    });
  } catch (error) {
    log.error('Manual health check failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Manual health check failed'
    });
  }
});

module.exports = router;
