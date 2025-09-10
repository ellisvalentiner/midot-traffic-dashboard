import api from './api'

const cameraService = {
  // Get all cameras
  getAllCameras: async () => {
    return await api.get('/cameras')
  },

  // Get camera by ID
  getCameraById: async (cameraId) => {
    return await api.get(`/cameras/${cameraId}`)
  },

  // Get camera statistics
  getCameraStats: async (timeRange = '24h') => {
    return await api.get(`/cameras/stats/summary?time_range=${timeRange}`)
  },

  // Get camera statistics by ID
  getCameraStatsById: async (cameraId, timeRange = '24h') => {
    return await api.get(`/cameras/${cameraId}/stats?time_range=${timeRange}`)
  },

  // Toggle camera enabled status
  toggleCameraStatus: async (cameraId, enabled) => {
    return await api.patch(`/cameras/${cameraId}/toggle`, { enabled })
  },

  // Toggle AI analysis for camera
  toggleAIAnalysis: async (cameraId, aiAnalysisEnabled) => {
    return await api.patch(`/cameras/${cameraId}/toggle-ai-analysis`, { 
      ai_analysis_enabled: aiAnalysisEnabled 
    })
  },

  // Refresh cameras (fetch latest from external source)
  refreshCameras: async () => {
    return await api.post('/cameras/refresh')
  },

  // Update camera details
  updateCamera: async (cameraId, updates) => {
    return await api.patch(`/cameras/${cameraId}`, updates)
  },

  // Delete camera
  deleteCamera: async (cameraId) => {
    return await api.delete(`/cameras/${cameraId}`)
  },

  // Get camera images
  getCameraImages: async (cameraId, options = {}) => {
    const { limit = 50, offset = 0, showLatestOnly = false } = options
    const params = new URLSearchParams()
    
    if (limit) params.append('limit', limit)
    if (offset) params.append('offset', offset)
    if (showLatestOnly) params.append('show_latest_only', showLatestOnly)
    
    const queryString = params.toString()
    const url = `/images/camera/${cameraId}${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get camera comparison data
  getCameraComparison: async (cameraId, hours = 24) => {
    return await api.get(`/images/comparison/${cameraId}?hours=${hours}`)
  },

  // Get camera analytics
  getCameraAnalytics: async (cameraId, timeRange = '168h') => {
    return await api.get(`/images/stats/summary?hours=${timeRange}&camera_id=${cameraId}`)
  },

  // Batch operations
  batchToggleStatus: async (cameraIds, enabled) => {
    const requests = cameraIds.map(id => ({
      method: 'PATCH',
      url: `/cameras/${id}/toggle`,
      data: { enabled }
    }))
    return await api.batch(requests)
  },

  batchToggleAI: async (cameraIds, aiAnalysisEnabled) => {
    const requests = cameraIds.map(id => ({
      method: 'PATCH',
      url: `/cameras/${id}/toggle-ai-analysis`,
      data: { ai_analysis_enabled: aiAnalysisEnabled }
    }))
    return await api.batch(requests)
  }
}

export default cameraService
