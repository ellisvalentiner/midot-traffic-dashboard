const os = require('os');
const { log } = require('./loggerService');

class MetricsService {
  constructor() {
    this.metrics = new Map();
    this.historicalData = new Map();
    this.startTime = Date.now();
    this.requestCounts = new Map();
    this.responseTimes = new Map();
    this.errorCounts = new Map();
    this.customMetrics = new Map();
    
    // Performance thresholds
    this.thresholds = {
      responseTime: 1000, // ms
      memoryUsage: 90, // percent
      cpuUsage: 80, // percent
      errorRate: 5 // percent
    };
    
    this.initialize();
  }

  // Initialize metrics service
  initialize() {
    // Start collecting system metrics
    this.startSystemMetricsCollection();
    
    // Start collecting performance metrics
    this.startPerformanceMetricsCollection();
    
    log.system('Metrics service initialized');
  }

  // Start system metrics collection
  startSystemMetricsCollection() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000); // Every 30 seconds
  }

  // Start performance metrics collection
  startPerformanceMetricsCollection() {
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 60000); // Every minute
  }

  // Collect system metrics
  collectSystemMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        uptime: process.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          used: os.totalmem() - os.freemem(),
          usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
        },
        cpu: {
          loadAverage: os.loadavg(),
          cores: os.cpus().length
        },
        process: {
          pid: process.pid,
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage()
        }
      };

      this.metrics.set('system', metrics);
      
      // Store historical data (keep last 100 entries)
      if (!this.historicalData.has('system')) {
        this.historicalData.set('system', []);
      }
      
      const systemHistory = this.historicalData.get('system');
      systemHistory.push(metrics);
      
      if (systemHistory.length > 100) {
        systemHistory.shift();
      }
      
      // Check thresholds and log warnings
      this.checkThresholds(metrics);
      
    } catch (error) {
      log.error('Failed to collect system metrics', { error: error.message });
    }
  }

  // Collect performance metrics
  collectPerformanceMetrics() {
    try {
      const metrics = {
        timestamp: Date.now(),
        requests: this.getRequestMetrics(),
        responseTimes: this.getResponseTimeMetrics(),
        errors: this.getErrorMetrics(),
        custom: this.getCustomMetrics()
      };

      this.metrics.set('performance', metrics);
      
      // Store historical data
      if (!this.historicalData.has('performance')) {
        this.historicalData.set('performance', []);
      }
      
      const perfHistory = this.historicalData.get('performance');
      perfHistory.push(metrics);
      
      if (perfHistory.length > 100) {
        perfHistory.shift();
      }
      
    } catch (error) {
      log.error('Failed to collect performance metrics', { error: error.message });
    }
  }

  // Check performance thresholds
  checkThresholds(metrics) {
    const warnings = [];
    
    // Memory usage threshold
    if (metrics.memory.usagePercent > this.thresholds.memoryUsage) {
      warnings.push(`High memory usage: ${metrics.memory.usagePercent.toFixed(1)}%`);
    }
    
    // CPU load threshold
    const avgLoad = metrics.cpu.loadAverage[0];
    const maxLoad = metrics.cpu.cores * (this.thresholds.cpuUsage / 100);
    if (avgLoad > maxLoad) {
      warnings.push(`High CPU load: ${avgLoad.toFixed(2)} (max: ${maxLoad.toFixed(2)})`);
    }
    
    // Log warnings
    if (warnings.length > 0) {
      log.warn('Performance thresholds exceeded', { warnings, metrics });
    }
  }

  // Record API request
  recordRequest(method, path, statusCode, responseTime) {
    const key = `${method} ${path}`;
    
    // Update request count
    if (!this.requestCounts.has(key)) {
      this.requestCounts.set(key, { total: 0, byStatus: {} });
    }
    
    const requestData = this.requestCounts.get(key);
    requestData.total++;
    
    if (!requestData.byStatus[statusCode]) {
      requestData.byStatus[statusCode] = 0;
    }
    requestData.byStatus[statusCode]++;
    
    // Update response time
    if (!this.responseTimes.has(key)) {
      this.responseTimes.set(key, []);
    }
    
    const responseTimeData = this.responseTimes.get(key);
    responseTimeData.push(responseTime);
    
    // Keep only last 1000 response times
    if (responseTimeData.length > 1000) {
      responseTimeData.shift();
    }
    
    // Record errors
    if (statusCode >= 400) {
      if (!this.errorCounts.has(key)) {
        this.errorCounts.set(key, 0);
      }
      this.errorCounts.set(key, this.errorCounts.get(key) + 1);
    }
  }

  // Record custom metric
  recordCustomMetric(name, value, tags = {}) {
    if (!this.customMetrics.has(name)) {
      this.customMetrics.set(name, []);
    }
    
    const metricData = this.customMetrics.get(name);
    metricData.push({
      timestamp: Date.now(),
      value,
      tags
    });
    
    // Keep only last 1000 entries
    if (metricData.length > 1000) {
      metricData.shift();
    }
  }

  // Get request metrics
  getRequestMetrics() {
    const metrics = {};
    
    for (const [key, data] of this.requestCounts) {
      metrics[key] = {
        total: data.total,
        byStatus: { ...data.byStatus },
        errorRate: this.calculateErrorRate(key)
      };
    }
    
    return metrics;
  }

  // Get response time metrics
  getResponseTimeMetrics() {
    const metrics = {};
    
    for (const [key, times] of this.responseTimes) {
      if (times.length > 0) {
        const sorted = [...times].sort((a, b) => a - b);
        metrics[key] = {
          count: times.length,
          min: sorted[0],
          max: sorted[sorted.length - 1],
          mean: times.reduce((a, b) => a + b, 0) / times.length,
          median: sorted[Math.floor(sorted.length / 2)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)]
        };
      }
    }
    
    return metrics;
  }

  // Get error metrics
  getErrorMetrics() {
    const metrics = {};
    
    for (const [key, count] of this.errorCounts) {
      const total = this.requestCounts.get(key)?.total || 0;
      metrics[key] = {
        count,
        total,
        rate: total > 0 ? (count / total) * 100 : 0
      };
    }
    
    return metrics;
  }

  // Get custom metrics
  getCustomMetrics() {
    const metrics = {};
    
    for (const [name, data] of this.customMetrics) {
      if (data.length > 0) {
        const values = data.map(d => d.value);
        metrics[name] = {
          count: data.length,
          latest: data[data.length - 1],
          min: Math.min(...values),
          max: Math.max(...values),
          mean: values.reduce((a, b) => a + b, 0) / values.length
        };
      }
    }
    
    return metrics;
  }

  // Calculate error rate for a specific endpoint
  calculateErrorRate(key) {
    const requestData = this.requestCounts.get(key);
    if (!requestData) return 0;
    
    const total = requestData.total;
    const errors = Object.entries(requestData.byStatus)
      .filter(([status]) => parseInt(status) >= 400)
      .reduce((sum, [, count]) => sum + count, 0);
    
    return total > 0 ? (errors / total) * 100 : 0;
  }

  // Get current metrics
  getCurrentMetrics() {
    return {
      system: this.metrics.get('system'),
      performance: this.metrics.get('performance'),
      uptime: Date.now() - this.startTime
    };
  }

  // Get historical metrics
  getHistoricalMetrics(type, limit = 50) {
    const history = this.historicalData.get(type) || [];
    return history.slice(-limit);
  }

  // Get metrics summary
  getMetricsSummary() {
    const system = this.metrics.get('system');
    const performance = this.metrics.get('performance');
    
    if (!system || !performance) {
      return { error: 'Metrics not available' };
    }
    
    const totalRequests = Object.values(performance.requests)
      .reduce((sum, req) => sum + req.total, 0);
    
    const totalErrors = Object.values(performance.errors)
      .reduce((sum, err) => sum + err.count, 0);
    
    const avgResponseTime = Object.values(performance.responseTimes)
      .reduce((sum, rt) => sum + rt.mean, 0) / Math.max(Object.keys(performance.responseTimes).length, 1);
    
    return {
      uptime: `${Math.floor((Date.now() - this.startTime) / 1000)}s`,
      system: {
        memoryUsage: `${system.memory.usagePercent.toFixed(1)}%`,
        cpuLoad: system.cpu.loadAverage[0].toFixed(2),
        cores: system.cpu.cores
      },
      performance: {
        totalRequests,
        totalErrors,
        errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) : 0,
        avgResponseTime: `${avgResponseTime.toFixed(2)}ms`
      },
      thresholds: this.thresholds
    };
  }

  // Reset metrics
  resetMetrics() {
    this.requestCounts.clear();
    this.responseTimes.clear();
    this.errorCounts.clear();
    this.customMetrics.clear();
    this.historicalData.clear();
    
    log.info('Metrics reset');
  }

  // Export metrics for external monitoring
  exportMetrics() {
    return {
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      system: this.metrics.get('system'),
      performance: this.metrics.get('performance'),
      custom: this.getCustomMetrics()
    };
  }

  // Get metrics in Prometheus format
  getPrometheusMetrics() {
    const lines = [];
    
    // System metrics
    const system = this.metrics.get('system');
    if (system) {
      lines.push(`# HELP midot_traffic_memory_usage_bytes Memory usage in bytes`);
      lines.push(`# TYPE midot_traffic_memory_usage_bytes gauge`);
      lines.push(`midot_traffic_memory_usage_bytes{type="used"} ${system.memory.used}`);
      lines.push(`midot_traffic_memory_usage_bytes{type="free"} ${system.memory.free}`);
      
      lines.push(`# HELP midot_traffic_cpu_load_average CPU load average`);
      lines.push(`# TYPE midot_traffic_cpu_load_average gauge`);
      lines.push(`midot_traffic_cpu_load_average{period="1min"} ${system.cpu.loadAverage[0]}`);
      lines.push(`midot_traffic_cpu_load_average{period="5min"} ${system.cpu.loadAverage[1]}`);
      lines.push(`midot_traffic_cpu_load_average{period="15min"} ${system.cpu.loadAverage[2]}`);
    }
    
    // Request metrics
    for (const [endpoint, data] of this.requestCounts) {
      lines.push(`# HELP midot_traffic_requests_total Total requests by endpoint`);
      lines.push(`# TYPE midot_traffic_requests_total counter`);
      lines.push(`midot_traffic_requests_total{endpoint="${endpoint}"} ${data.total}`);
    }
    
    // Response time metrics
    for (const [endpoint, data] of this.responseTimes) {
      if (data.length > 0) {
        lines.push(`# HELP midot_traffic_response_time_seconds Response time in seconds`);
        lines.push(`# TYPE midot_traffic_response_time_seconds histogram`);
        lines.push(`midot_traffic_response_time_seconds{endpoint="${endpoint}",quantile="0.5"} ${data.median / 1000}`);
        lines.push(`midot_traffic_response_time_seconds{endpoint="${endpoint}",quantile="0.95"} ${data.p95 / 1000}`);
        lines.push(`midot_traffic_response_time_seconds{endpoint="${endpoint}",quantile="0.99"} ${data.p99 / 1000}`);
      }
    }
    
    return lines.join('\n');
  }

  // Cleanup
  cleanup() {
    this.resetMetrics();
    log.system('Metrics service cleaned up');
  }
}

// Create singleton instance
const metricsService = new MetricsService();

module.exports = metricsService;
