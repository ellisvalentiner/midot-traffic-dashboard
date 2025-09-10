import React, {useEffect, useState} from 'react';
import {
    Activity,
    AlertTriangle,
    BarChart3,
    CheckCircle,
    Clock,
    Cpu,
    Gauge,
    HardDrive,
    RefreshCw,
    RotateCcw,
    Server,
    Shield,
    Wrench,
    XCircle
} from 'lucide-react';
import {useToast} from '../contexts/ToastContext';
import {parseSQLiteDate} from '../utils/dateUtils';
import axios from 'axios';

const SystemManagement = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [activeTab, setActiveTab] = useState('health');
  const [loading, setLoading] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [config, setConfig] = useState(null);
  const [configSchema, setConfigSchema] = useState(null);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [editingConfig, setEditingConfig] = useState({});
  const [showConfigEditor, setShowConfigEditor] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchHealthStatus();
    fetchMetrics();
    fetchConfig();
    fetchMaintenanceStatus();
  }, []);

  // Fetch health status
  const fetchHealthStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/system/health');
      setHealthStatus(response.data);
    } catch (error) {
      showError('Failed to fetch health status');
      console.error('Error fetching health status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      const response = await axios.get('/api/system/metrics');
      setMetrics(response.data.data);
    } catch (error) {
      showError('Failed to fetch metrics');
      console.error('Error fetching metrics:', error);
    }
  };

  // Fetch configuration
  const fetchConfig = async () => {
    try {
      const [configResponse, schemaResponse] = await Promise.all([
        axios.get('/api/system/config'),
        axios.get('/api/system/config/schema')
      ]);
      setConfig(configResponse.data.data);
      setConfigSchema(schemaResponse.data.data);
    } catch (error) {
      showError('Failed to fetch configuration');
      console.error('Error fetching configuration:', error);
    }
  };

  // Fetch maintenance status
  const fetchMaintenanceStatus = async () => {
    try {
      const response = await axios.get('/api/system/maintenance');
      setMaintenanceMode(response.data.data.maintenanceMode);
      setMaintenanceMessage(response.data.data.message);
    } catch (error) {
      showError('Failed to fetch maintenance status');
      console.error('Error fetching maintenance status:', error);
    }
  };

  // Enable maintenance mode
  const enableMaintenanceMode = async () => {
    try {
      setLoading(true);
      await axios.post('/api/system/maintenance/enable', {
        message: maintenanceMessage
      });
      setMaintenanceMode(true);
      showSuccess('Maintenance mode enabled');
    } catch (error) {
      showError('Failed to enable maintenance mode');
      console.error('Error enabling maintenance mode:', error);
    } finally {
      setLoading(false);
    }
  };

  // Disable maintenance mode
  const disableMaintenanceMode = async () => {
    try {
      setLoading(true);
      await axios.post('/api/system/maintenance/disable');
      setMaintenanceMode(false);
      showSuccess('Maintenance mode disabled');
    } catch (error) {
      showError('Failed to disable maintenance mode');
      console.error('Error disabling maintenance mode:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update configuration
  const updateConfig = async (key, value) => {
    try {
      await axios.put(`/api/system/config/${key}`, { value });
      showSuccess(`Configuration updated: ${key}`);
      fetchConfig(); // Refresh config
    } catch (error) {
      showError(`Failed to update configuration: ${key}`);
      console.error('Error updating configuration:', error);
    }
  };

  // Reset configuration
  const resetConfig = async () => {
    try {
      setLoading(true);
      await axios.post('/api/system/config/reset');
      showSuccess('Configuration reset to defaults');
      fetchConfig(); // Refresh config
    } catch (error) {
      showError('Failed to reset configuration');
      console.error('Error resetting configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset metrics
  const resetMetrics = async () => {
    try {
      await axios.post('/api/system/metrics/reset');
      showSuccess('Metrics reset successfully');
      fetchMetrics(); // Refresh metrics
    } catch (error) {
      showError('Failed to reset metrics');
      console.error('Error resetting metrics:', error);
    }
  };

  // Get health status color
  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      case 'degraded': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'unhealthy': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // Get health status icon
  const getHealthStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5" />;
      case 'unhealthy': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  // Render health status
  const renderHealthStatus = () => (
    <div className="space-y-6">
      {/* Health Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <span>System Health Overview</span>
          </h3>
          <button
            onClick={fetchHealthStatus}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {healthStatus ? (
          <div className="space-y-4">
            {/* Overall Status */}
            <div className={`p-4 rounded-lg border ${getHealthStatusColor(healthStatus.status)}`}>
              <div className="flex items-center space-x-3">
                {getHealthStatusIcon(healthStatus.status)}
                <div>
                  <h4 className="font-semibold">Overall Status: {healthStatus.status}</h4>
                  <p className="text-sm opacity-75">
                    Last checked: {parseSQLiteDate(healthStatus.timestamp)?.toLocaleString() || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Health Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {healthStatus.summary?.total || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Checks</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {healthStatus.summary?.healthy || 0}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">Healthy</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
                  {healthStatus.summary?.unhealthy || 0}
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">Issues</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {healthStatus.duration}
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300">Check Duration</div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">Health Check Details</h4>
              {Object.entries(healthStatus.results || {}).map(([name, result]) => (
                <div key={name} className={`p-3 rounded-lg border ${
                  result.status === 'healthy' 
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700' 
                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {result.status === 'healthy' ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <h5 className="font-medium text-gray-900 dark:text-white capitalize">
                          {name.replace(/([A-Z])/g, ' $1').trim()}
                        </h5>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {result.message || result.error || 'No details available'}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {result.duration}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading health status...</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render metrics
  const renderMetrics = () => (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <span>Performance Metrics</span>
          </h3>
          <div className="flex space-x-3">
            <button
              onClick={fetchMetrics}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
            <button
              onClick={resetMetrics}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </button>
          </div>
        </div>

        {metrics ? (
          <div className="space-y-6">
            {/* System Metrics */}
            {metrics.system && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">System Metrics</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center space-x-3">
                      <HardDrive className="w-6 h-6 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Memory Usage</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {metrics.system.memory?.usagePercent?.toFixed(1) || 'N/A'}%
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                    <div className="flex items-center space-x-3">
                      <Cpu className="w-6 h-6 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">CPU Load</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {metrics.system.cpu?.loadAverage?.[0]?.toFixed(2) || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center space-x-3">
                      <Server className="w-6 h-6 text-purple-600" />
                      <div>
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Uptime</p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                          {metrics.uptime ? `${Math.floor(metrics.uptime / 1000)}s` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Performance Metrics */}
            {metrics.performance && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Performance Metrics</h4>
                <div className="space-y-4">
                  {/* Request Metrics */}
                  {Object.entries(metrics.performance.requests || {}).map(([endpoint, data]) => (
                    <div key={endpoint} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">{endpoint}</h5>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Total:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{data.total}</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Error Rate:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">{data.errorRate?.toFixed(2)}%</span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Status Codes:</span>
                          <span className="ml-2 font-medium text-gray-900 dark:text-white">
                            {Object.entries(data.byStatus || {}).map(([code, count]) => `${code}:${count}`).join(', ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading metrics...</p>
          </div>
        )}
      </div>
    </div>
  );

  // Render maintenance
  const renderMaintenance = () => (
    <div className="space-y-6">
      {/* Maintenance Control */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
            <Wrench className="w-5 h-5 text-amber-600" />
            <span>Maintenance Mode</span>
          </h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            maintenanceMode 
              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' 
              : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
          }`}>
            {maintenanceMode ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>

        <div className="space-y-4">
          {/* Current Status */}
          <div className={`p-4 rounded-lg border ${
            maintenanceMode 
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' 
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
          }`}>
            <div className="flex items-center space-x-3">
              {maintenanceMode ? (
                <AlertTriangle className="w-6 h-6 text-red-600" />
              ) : (
                <CheckCircle className="w-6 h-6 text-green-600" />
              )}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {maintenanceMode ? 'System is in maintenance mode' : 'System is operational'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {maintenanceMode ? maintenanceMessage : 'All services are running normally'}
                </p>
              </div>
            </div>
          </div>

          {/* Maintenance Message */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Maintenance Message
            </label>
            <textarea
              value={maintenanceMessage}
              onChange={(e) => setMaintenanceMessage(e.target.value)}
              placeholder="Enter maintenance message..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={3}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex space-x-3">
            {!maintenanceMode ? (
              <button
                onClick={enableMaintenanceMode}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center disabled:opacity-50"
              >
                <Shield className="w-4 h-4 mr-2" />
                Enable Maintenance Mode
              </button>
            ) : (
              <button
                onClick={disableMaintenanceMode}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Disable Maintenance Mode
              </button>
            )}
          </div>

          {/* Warning */}
          {maintenanceMode && (
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800 dark:text-amber-200">Maintenance Mode Active</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    When maintenance mode is enabled, all API endpoints (except health checks) will return a 503 Service Unavailable response.
                    This is useful for planned maintenance or emergency situations.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Management</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Monitor system health, configure settings, and manage maintenance mode
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'health', label: 'Health Monitoring', icon: Activity },
              { id: 'metrics', label: 'Performance Metrics', icon: Gauge },
              { id: 'maintenance', label: 'Maintenance', icon: Wrench }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'health' && renderHealthStatus()}
          {activeTab === 'metrics' && renderMetrics()}
          {activeTab === 'maintenance' && renderMaintenance()}
        </div>
      </div>
    </div>
  );
};

export default SystemManagement;
