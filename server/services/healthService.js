const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const { runQuery } = require('../database/connection');
const { log } = require('./loggerService');

class HealthService {
  constructor() {
    this.healthChecks = new Map();
    this.metrics = new Map();
    this.lastCheck = null;
    this.checkInterval = 30000; // 30 seconds
    this.isRunning = false;
  }

  // Initialize health monitoring
  async initialize() {
    log.system('Health monitoring service initialized');
    
    // Register default health checks
    this.registerHealthCheck('database', this.checkDatabase.bind(this));
    this.registerHealthCheck('memory', this.checkMemory.bind(this));
    this.registerHealthCheck('disk', this.checkDiskSpace.bind(this));
    this.registerHealthCheck('cpu', this.checkCPU.bind(this));
    this.registerHealthCheck('process', this.checkProcess.bind(this));
    this.registerHealthCheck('storage', this.checkStorage.bind(this));
    
    // Start periodic health checks
    this.startPeriodicChecks();
  }

  // Register a custom health check
  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
    log.debug(`Health check registered: ${name}`);
  }

  // Unregister a health check
  unregisterHealthCheck(name) {
    this.healthChecks.delete(name);
    log.debug(`Health check unregistered: ${name}`);
  }

  // Run all health checks
  async runHealthChecks() {
    const startTime = Date.now();
    const results = {};
    const errors = [];

    log.debug('Starting health checks...');

    for (const [name, checkFunction] of this.healthChecks) {
      try {
        const start = Date.now();
        const result = await checkFunction();
        const duration = Date.now() - start;
        
        results[name] = {
          status: 'healthy',
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
          ...result
        };
        
        log.debug(`Health check passed: ${name} (${duration}ms)`);
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        errors.push({ name, error: error.message });
        log.error(`Health check failed: ${name}`, { error: error.message });
      }
    }

    const totalDuration = Date.now() - startTime;
    this.lastCheck = new Date();
    
    // Store metrics
    this.metrics.set('lastCheck', this.lastCheck);
    this.metrics.set('totalDuration', totalDuration);
    this.metrics.set('errorCount', errors.length);
    this.metrics.set('results', results);

    log.info('Health checks completed', {
      totalDuration: `${totalDuration}ms`,
      errorCount: errors.length,
      healthyChecks: Object.values(results).filter(r => r.status === 'healthy').length,
      totalChecks: results.length
    });

    return {
      status: errors.length === 0 ? 'healthy' : 'degraded',
      timestamp: this.lastCheck.toISOString(),
      duration: `${totalDuration}ms`,
      results,
      errors,
      summary: {
        total: Object.keys(results).length,
        healthy: Object.values(results).filter(r => r.status === 'healthy').length,
        unhealthy: Object.values(results).filter(r => r.status === 'unhealthy').length
      }
    };
  }

  // Database health check
  async checkDatabase() {
    const start = Date.now();
    
    try {
      // Test database connectivity
      const result = await runQuery('SELECT 1 as test');
      const duration = Date.now() - start;
      
      if (result && result.length > 0) {
        return {
          message: 'Database connection healthy',
          responseTime: `${duration}ms`,
          testResult: result[0].test
        };
      } else {
        throw new Error('Database query returned unexpected result');
      }
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  // Memory health check
  async checkMemory() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = (usedMem / totalMem) * 100;

    const result = {
      total: this.formatBytes(totalMem),
      used: this.formatBytes(usedMem),
      free: this.formatBytes(freeMem),
      usagePercent: Math.round(memoryUsagePercent * 100) / 100
    };

    // Check if memory usage is concerning
    if (memoryUsagePercent > 90) {
      log.warn('High memory usage detected', result);
    }

    return result;
  }

  // Disk space health check
  async checkDiskSpace() {
    try {
      const storagePath = path.join(__dirname, '../storage');
      const stats = await fs.stat(storagePath);
      
      // Note: This is a simplified check. In production, you might want to use a library like 'diskusage'
      const result = {
        storagePath,
        exists: true,
        message: 'Storage directory accessible'
      };

      return result;
    } catch (error) {
      throw new Error(`Storage health check failed: ${error.message}`);
    }
  }

  // CPU health check
  async checkCPU() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    const result = {
      cores: cpus.length,
      loadAverage: {
        '1min': Math.round(loadAvg[0] * 100) / 100,
        '5min': Math.round(loadAvg[1] * 100) / 100,
        '15min': Math.round(loadAvg[2] * 100) / 100
      },
      architecture: os.arch(),
      platform: os.platform()
    };

    // Check if load average is concerning
    if (loadAvg[0] > cpus.length * 0.8) {
      log.warn('High CPU load detected', result);
    }

    return result;
  }

  // Process health check
  async checkProcess() {
    const result = {
      pid: process.pid,
      uptime: `${Math.floor(process.uptime())}s`,
      version: process.version,
      platform: process.platform,
      memoryUsage: {
        rss: this.formatBytes(process.memoryUsage().rss),
        heapUsed: this.formatBytes(process.memoryUsage().heapUsed),
        heapTotal: this.formatBytes(process.memoryUsage().heapTotal),
        external: this.formatBytes(process.memoryUsage().external)
      }
    };

    return result;
  }

  // Storage health check
  async checkStorage() {
    try {
      const storagePath = path.join(__dirname, '../storage');
      const imagesPath = path.join(storagePath, 'images');
      
      // Check if directories exist
      const storageExists = await fs.pathExists(storagePath);
      const imagesExists = await fs.pathExists(imagesPath);
      
      // Count files in images directory
      let imageCount = 0;
      if (imagesExists) {
        try {
          const files = await fs.readdir(imagesPath);
          imageCount = files.length;
        } catch (error) {
          log.warn('Could not read images directory', { error: error.message });
        }
      }

      return {
        storageDirectory: storageExists,
        imagesDirectory: imagesExists,
        imageCount,
        message: 'Storage structure verified'
      };
    } catch (error) {
      throw new Error(`Storage structure check failed: ${error.message}`);
    }
  }

  // Get current health status
  async getHealthStatus() {
    if (!this.lastCheck || Date.now() - this.lastCheck.getTime() > this.checkInterval) {
      return await this.runHealthChecks();
    }
    
    return {
      status: 'cached',
      timestamp: this.lastCheck.toISOString(),
      results: this.metrics.get('results'),
      summary: {
        total: Object.keys(this.metrics.get('results') || {}).length,
        healthy: Object.values(this.metrics.get('results') || {}).filter(r => r.status === 'healthy').length,
        unhealthy: Object.values(this.metrics.get('results') || {}).filter(r => r.status === 'unhealthy').length
      }
    };
  }

  // Get system metrics
  getMetrics() {
    return {
      uptime: `${Math.floor(process.uptime())}s`,
      memory: {
        total: this.formatBytes(os.totalmem()),
        free: this.formatBytes(os.freemem()),
        used: this.formatBytes(os.totalmem() - os.freemem())
      },
      cpu: {
        cores: os.cpus().length,
        loadAverage: os.loadavg()
      },
      platform: {
        type: os.type(),
        platform: os.platform(),
        arch: os.arch(),
        release: os.release()
      },
      lastHealthCheck: this.lastCheck?.toISOString() || 'Never',
      healthCheckInterval: `${this.checkInterval / 1000}s`
    };
  }

  // Start periodic health checks
  startPeriodicChecks() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.interval = setInterval(async () => {
      try {
        await this.runHealthChecks();
      } catch (error) {
        log.error('Periodic health check failed', { error: error.message });
      }
    }, this.checkInterval);
    
    log.info('Periodic health checks started', { interval: `${this.checkInterval / 1000}s` });
  }

  // Stop periodic health checks
  stopPeriodicChecks() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      log.info('Periodic health checks stopped');
    }
  }

  // Update check interval
  setCheckInterval(intervalMs) {
    this.checkInterval = intervalMs;
    if (this.isRunning) {
      this.stopPeriodicChecks();
      this.startPeriodicChecks();
    }
    log.info('Health check interval updated', { newInterval: `${intervalMs / 1000}s` });
  }

  // Helper method to format bytes
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Cleanup
  cleanup() {
    this.stopPeriodicChecks();
    log.system('Health monitoring service cleaned up');
  }
}

// Create singleton instance
const healthService = new HealthService();

module.exports = healthService;
