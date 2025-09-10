import api from './api'

const analyticsService = {
  // Get dashboard summary statistics
  getDashboardStats: async (timeRange = '24h') => {
    return await api.get(`/cameras/stats/summary?time_range=${timeRange}`)
  },

  // Get image statistics
  getImageStats: async (options = {}) => {
    const { hours = 168, cameraId = null } = options
    const params = new URLSearchParams()
    
    if (hours) params.append('hours', hours)
    if (cameraId) params.append('camera_id', cameraId)
    
    const queryString = params.toString()
    const url = `/images/stats/summary${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get vehicle detection statistics
  getVehicleDetectionStats: async (options = {}) => {
    const { timeRange = '24h', cameraId = null, vehicleType = null } = options
    const params = new URLSearchParams()
    
    if (timeRange) params.append('time_range', timeRange)
    if (cameraId) params.append('camera_id', cameraId)
    if (vehicleType) params.append('vehicle_type', vehicleType)
    
    const queryString = params.toString()
    const url = `/vehicle-detection/stats${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get traffic density analysis
  getTrafficDensityAnalysis: async (options = {}) => {
    const { timeRange = '24h', cameraId = null, roadName = null } = options
    const params = new URLSearchParams()
    
    if (timeRange) params.append('time_range', timeRange)
    if (cameraId) params.append('camera_id', cameraId)
    if (roadName) params.append('road_name', roadName)
    
    const queryString = params.toString()
    const url = `/analytics/traffic-density${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get hourly traffic patterns
  getHourlyTrafficPatterns: async (options = {}) => {
    const { date = null, cameraId = null } = options
    const params = new URLSearchParams()
    
    if (date) params.append('date', date)
    if (cameraId) params.append('camera_id', cameraId)
    
    const queryString = params.toString()
    const url = `/analytics/hourly-patterns${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get daily traffic trends
  getDailyTrafficTrends: async (options = {}) => {
    const { days = 7, cameraId = null } = options
    const params = new URLSearchParams()
    
    if (days) params.append('days', days)
    if (cameraId) params.append('camera_id', cameraId)
    
    const queryString = params.toString()
    const url = `/analytics/daily-trends${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get vehicle type distribution
  getVehicleTypeDistribution: async (options = {}) => {
    const { timeRange = '24h', cameraId = null } = options
    const params = new URLSearchParams()
    
    if (timeRange) params.append('time_range', timeRange)
    if (cameraId) params.append('camera_id', cameraId)
    
    const queryString = params.toString()
    const url = `/analytics/vehicle-types${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get confidence score analysis
  getConfidenceScoreAnalysis: async (options = {}) => {
    const { timeRange = '24h', cameraId = null, minConfidence = null } = options
    const params = new URLSearchParams()
    
    if (timeRange) params.append('time_range', timeRange)
    if (cameraId) params.append('camera_id', cameraId)
    if (minConfidence) params.append('min_confidence', minConfidence)
    
    const queryString = params.toString()
    const url = `/analytics/confidence-scores${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get change detection analysis
  getChangeDetectionAnalysis: async (options = {}) => {
    const { timeRange = '24h', cameraId = null, threshold = null } = options
    const params = new URLSearchParams()
    
    if (timeRange) params.append('time_range', timeRange)
    if (cameraId) params.append('camera_id', cameraId)
    if (threshold) params.append('threshold', threshold)
    
    const queryString = params.toString()
    const url = `/analytics/change-detection${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get performance metrics
  getPerformanceMetrics: async (options = {}) => {
    const { timeRange = '24h', cameraId = null } = options
    const params = new URLSearchParams()
    
    if (timeRange) params.append('time_range', timeRange)
    if (cameraId) params.append('camera_id', cameraId)
    
    const queryString = params.toString()
    const url = `/analytics/performance${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Export analytics data
  exportAnalyticsData: async (options = {}) => {
    const { 
      timeRange = '24h', 
      cameraId = null, 
      format = 'json',
      includeImages = false 
    } = options
    
    const params = new URLSearchParams()
    
    if (timeRange) params.append('time_range', timeRange)
    if (cameraId) params.append('camera_id', cameraId)
    if (format) params.append('format', format)
    if (includeImages) params.append('include_images', includeImages)
    
    const queryString = params.toString()
    const url = `/analytics/export${queryString ? `?${queryString}` : ''}`
    
    try {
      const response = await api.get(url, {
        responseType: format === 'csv' ? 'blob' : 'json'
      })
      
      if (response.success) {
        // Handle file download for CSV
        if (format === 'csv') {
          const url = window.URL.createObjectURL(response.data)
          const link = document.createElement('a')
          link.href = url
          link.download = `analytics-${Date.now()}.csv`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        }
        
        return { success: true, data: response.data, message: 'Data exported successfully' }
      } else {
        return { success: false, error: response.error }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Get real-time analytics
  getRealTimeAnalytics: async (options = {}) => {
    const { cameraId = null, updateInterval = 5000 } = options
    const params = new URLSearchParams()
    
    if (cameraId) params.append('camera_id', cameraId)
    if (updateInterval) params.append('update_interval', updateInterval)
    
    const queryString = params.toString()
    const url = `/analytics/realtime${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get vehicle counts by minute
  getVehicleCountsByMinute: async (options = {}) => {
    const { cameraId = null, hours = 24 } = options
    const params = new URLSearchParams()
    
    if (hours) params.append('hours', hours)
    if (cameraId) params.append('camera_id', cameraId)
    
    const queryString = params.toString()
    const url = `/vehicle-detection/counts-by-minute${queryString ? `?${queryString}` : ''}`
    
    const response = await api.get(url)
    
    // Extract aggregation interval from response for chart configuration
    if (response.data && response.data.success) {
      response.data.aggregationInterval = response.data.aggregationInterval || 600000 // Default to 10 minutes
      response.data.intervalMinutes = response.data.intervalMinutes || 10
    }
    
    return response
  },

  // Get aggregated vehicle counts by minute across all cameras
  getAggregatedVehicleCounts: async (options = {}) => {
    const { hours = 24 } = options
    const params = new URLSearchParams()
    
    const queryString = params.toString()
    const url = `/vehicle-detection/counts-by-minute/aggregated${queryString ? `?${queryString}` : ''}`
    
    const response = await api.get(url)
    
    // Extract aggregation interval from response for chart configuration
    if (response.data && response.data.success) {
      response.data.aggregationInterval = response.data.aggregationInterval || 600000 // Default to 10 minutes
      response.data.intervalMinutes = response.data.intervalMinutes || 10
    }
    
    return response
  }
}

export default analyticsService
