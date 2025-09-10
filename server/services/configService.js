const fs = require('fs-extra');
const path = require('path');
const { log } = require('./loggerService');

class ConfigService {
  constructor() {
    this.configPath = path.join(__dirname, '../config');
    this.configFile = path.join(this.configPath, 'runtime.json');
    this.defaultConfig = this.getDefaultConfig();
    this.config = { ...this.defaultConfig };
    this.watchers = new Map();
    this.changeCallbacks = [];
    
    this.initialize();
  }

  // Initialize configuration service
  async initialize() {
    try {
      // Ensure config directory exists
      await fs.ensureDir(this.configPath);
      
      // Load existing configuration or create default
      await this.loadConfig();
      
      // Set up file watcher for config changes
      this.setupFileWatcher();
      
      log.system('Configuration service initialized');
    } catch (error) {
      log.error('Failed to initialize configuration service', { error: error.message });
      // Use default config if loading fails
      this.config = { ...this.defaultConfig };
    }
  }

  // Get default configuration
  getDefaultConfig() {
    return {
      system: {
        maintenanceMode: false,
        maintenanceMessage: 'System is under maintenance. Please try again later.',
        logLevel: process.env.LOG_LEVEL || 'info',
        healthCheckInterval: 30000, // 30 seconds
        maxLogFiles: 5,
        maxLogSize: '5MB'
      },
      database: {
        maxConnections: 10,
        connectionTimeout: 30000,
        queryTimeout: 60000
      },
      camera: {
        updateInterval: 60000, // 1 minute
        maxConcurrentDownloads: 3,
        retryAttempts: 3,
        retryDelay: 5000
      },
      ai: {
        batchSize: 10,
        processingInterval: 300000, // 5 minutes
        maxConcurrentAnalysis: 2,
        confidenceThreshold: 0.7
      },
      storage: {
        maxImageAge: 30, // days
        compressionQuality: 80,
        maxImageSize: '10MB',
        cleanupInterval: 86400000 // 24 hours
      },
      analytics: {
        vehicleCountAggregationInterval: 600000 // 10 minutes in milliseconds
      },
      api: {
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 100
        },
        cors: {
          enabled: true,
          origins: ['http://localhost:3000', 'http://localhost:3001']
        }
      },
      monitoring: {
        metricsEnabled: true,
        alertingEnabled: true,
        performanceThresholds: {
          responseTime: 1000, // ms
          memoryUsage: 90, // percent
          cpuUsage: 80 // percent
        }
      }
    };
  }

  // Load configuration from file
  async loadConfig() {
    try {
      if (await fs.pathExists(this.configFile)) {
        const configData = await fs.readFile(this.configFile, 'utf8');
        const loadedConfig = JSON.parse(configData);
        
        // Merge with default config (new properties will be added)
        this.config = this.mergeConfig(this.defaultConfig, loadedConfig);
        
        log.info('Configuration loaded from file', { 
          file: this.configFile,
          configKeys: Object.keys(this.config)
        });
      } else {
        // Create default config file
        await this.saveConfig();
        log.info('Default configuration file created', { file: this.configFile });
      }
    } catch (error) {
      log.error('Failed to load configuration', { error: error.message });
      throw error;
    }
  }

  // Save configuration to file
  async saveConfig() {
    try {
      await fs.writeFile(this.configFile, JSON.stringify(this.config, null, 2));
      log.info('Configuration saved to file', { file: this.configFile });
    } catch (error) {
      log.error('Failed to save configuration', { error: error.message });
      throw error;
    }
  }

  // Get configuration value
  get(key, defaultValue = undefined) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return defaultValue;
      }
    }
    
    return value;
  }

  // Set configuration value
  async set(key, value) {
    // Validate the configuration value first
    const validation = this.validate(key, value);
    if (!validation.valid) {
      throw new Error(`Invalid configuration value: ${validation.error}`);
    }
    
    const keys = key.split('.');
    const lastKey = keys.pop();
    let current = this.config;
    
    // Navigate to the parent object
    for (const k of keys) {
      if (!(k in current) || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    // Set the value
    const oldValue = current[lastKey];
    current[lastKey] = value;
    
    // Save configuration
    await this.saveConfig();
    
    // Notify change callbacks
    this.notifyChange(key, value, oldValue);
    
    log.info('Configuration updated', { key, newValue: value, oldValue });
    
    return { success: true, key, newValue: value, oldValue };
  }

  // Update multiple configuration values
  async update(updates) {
    const results = [];
    
    for (const [key, value] of Object.entries(updates)) {
      try {
        const result = await this.set(key, value);
        results.push(result);
      } catch (error) {
        results.push({ success: false, key, error: error.message });
      }
    }
    
    return results;
  }

  // Reset configuration to default
  async reset() {
    this.config = { ...this.defaultConfig };
    await this.saveConfig();
    
    log.info('Configuration reset to defaults');
    
    // Notify change callbacks
    this.notifyChange('*', this.config, null);
    
    return { success: true, message: 'Configuration reset to defaults' };
  }

  // Get entire configuration
  getAll() {
    return { ...this.config };
  }

  // Get configuration schema
  getSchema() {
    return this.generateSchema(this.defaultConfig);
  }

  // Generate configuration schema
  generateSchema(config, path = '') {
    const schema = {};
    
    for (const [key, value] of Object.entries(config)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        schema[key] = {
          type: 'object',
          path: currentPath,
          properties: this.generateSchema(value, currentPath)
        };
      } else {
        schema[key] = {
          type: typeof value,
          path: currentPath,
          defaultValue: value,
          example: this.getExampleValue(value)
        };
      }
    }
    
    return schema;
  }

  // Get example value for schema
  getExampleValue(value) {
    if (typeof value === 'string') {
      if (value.includes('ms') || value.includes('MB')) return '1000ms or 5MB';
      if (value.includes('localhost')) return 'http://localhost:3000';
      return 'example_value';
    }
    if (typeof value === 'number') return 1000;
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return ['example1', 'example2'];
    return value;
  }

  // Merge configurations (deep merge)
  mergeConfig(defaultConfig, userConfig) {
    const merged = { ...defaultConfig };
    
    for (const [key, value] of Object.entries(userConfig)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        merged[key] = this.mergeConfig(merged[key] || {}, value);
      } else {
        merged[key] = value;
      }
    }
    
    return merged;
  }

  // Validate configuration value
  validate(key, value) {
    const schema = this.getSchema();
    const keys = key.split('.');
    let currentSchema = schema;
    
    // Navigate to the schema for this key
    for (const k of keys) {
      if (currentSchema && currentSchema[k]) {
        currentSchema = currentSchema[k];
      } else {
        return { valid: false, error: `Unknown configuration key: ${key}` };
      }
    }
    
    // Type validation
    if (currentSchema.type && typeof value !== currentSchema.type) {
      return { 
        valid: false, 
        error: `Invalid type for ${key}. Expected ${currentSchema.type}, got ${typeof value}` 
      };
    }
    
    // Range validation for numbers
    if (currentSchema.type === 'number') {
      if (key.includes('Interval') && value < 1000) {
        return { valid: false, error: `${key} must be at least 1000ms` };
      }
      if (key.includes('Timeout') && value < 1000) {
        return { valid: false, error: `${key} must be at least 1000ms` };
      }
      
      // Specific validation for vehicle count aggregation interval
      if (key === 'analytics.vehicleCountAggregationInterval') {
        if (value < 60000) { // Less than 1 minute
          return { valid: false, error: 'Vehicle count aggregation interval must be at least 1 minute (60000ms)' };
        }
        if (value > 3600000) { // More than 60 minutes
          return { valid: false, error: 'Vehicle count aggregation interval must be at most 60 minutes (3600000ms)' };
        }
      }
    }
    
    return { valid: true };
  }

  // Set up file watcher for config changes
  setupFileWatcher() {
    try {
      const chokidar = require('chokidar');
      const watcher = chokidar.watch(this.configFile, {
        persistent: true,
        ignoreInitial: true
      });
      
      watcher.on('change', async (path) => {
        log.info('Configuration file changed, reloading...', { file: path });
        try {
          await this.loadConfig();
          this.notifyChange('*', this.config, null);
        } catch (error) {
          log.error('Failed to reload configuration', { error: error.message });
        }
      });
      
      this.watchers.set('config', watcher);
      log.debug('Configuration file watcher set up');
    } catch (error) {
      log.warn('File watcher not available, configuration changes will not be auto-detected', { error: error.message });
    }
  }

  // Register change callback
  onChange(callback) {
    this.changeCallbacks.push(callback);
    return () => {
      const index = this.changeCallbacks.indexOf(callback);
      if (index > -1) {
        this.changeCallbacks.splice(index, 1);
      }
    };
  }

  // Notify change callbacks
  notifyChange(key, newValue, oldValue) {
    for (const callback of this.changeCallbacks) {
      try {
        callback(key, newValue, oldValue);
      } catch (error) {
        log.error('Configuration change callback failed', { error: error.message });
      }
    }
  }

  // Check if system is in maintenance mode
  isMaintenanceMode() {
    return this.get('system.maintenanceMode', false);
  }

  // Get maintenance message
  getMaintenanceMessage() {
    return this.get('system.maintenanceMessage', 'System is under maintenance');
  }

  // Enable maintenance mode
  async enableMaintenanceMode(message = null) {
    if (message) {
      await this.set('system.maintenanceMessage', message);
    }
    await this.set('system.maintenanceMode', true);
    log.system('Maintenance mode enabled', { message: message || this.get('system.maintenanceMessage') });
  }

  // Disable maintenance mode
  async disableMaintenanceMode() {
    await this.set('system.maintenanceMode', false);
    log.system('Maintenance mode disabled');
  }

  // Cleanup
  cleanup() {
    // Stop file watchers
    for (const [name, watcher] of this.watchers) {
      watcher.close();
      log.debug(`File watcher closed: ${name}`);
    }
    
    log.system('Configuration service cleaned up');
  }
}

// Create singleton instance
const configService = new ConfigService();

module.exports = configService;
