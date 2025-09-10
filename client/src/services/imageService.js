import api from './api'

const imageService = {
  // Get recent images across all cameras
  getRecentImages: async (options = {}) => {
    const { limit = 20, changedOnly = false } = options
    const params = new URLSearchParams()
    
    if (limit) params.append('limit', limit)
    if (changedOnly) params.append('changed_only', changedOnly)
    
    const queryString = params.toString()
    const url = `/images/recent${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get images for a specific camera
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

  // Get image by ID
  getImageById: async (imageId) => {
    return await api.get(`/images/${imageId}`)
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

  // Get vehicle detection data for an image
  getVehicleDetection: async (imageId) => {
    return await api.get(`/images/${imageId}/vehicle-detection`)
  },

  // Analyze an image
  analyzeImage: async (imageId) => {
    return await api.post(`/images/${imageId}/analyze`)
  },

  // Reanalyze an image
  reanalyzeImage: async (imageId) => {
    return await api.post(`/images/${imageId}/reanalyze`)
  },

  // Delete an image
  deleteImage: async (imageId) => {
    return await api.delete(`/images/${imageId}`)
  },

  // Delete all images
  deleteAllImages: async () => {
    return await api.delete('/images/all')
  },

  // Get image comparison data
  getImageComparison: async (cameraId, hours = 24) => {
    return await api.get(`/images/comparison/${cameraId}?hours=${hours}`)
  },

  // Get image file
  getImageFile: async (imagePath) => {
    return await api.get(`/images/file/${imagePath}`)
  },

  // Download image
  downloadImage: async (imagePath, filename) => {
    try {
      const response = await api.get(`/images/file/${imagePath}`, {
        responseType: 'blob'
      })
      
      if (response.success) {
        const url = window.URL.createObjectURL(response.data)
        const link = document.createElement('a')
        link.href = url
        link.download = filename || `image-${Date.now()}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
        
        return { success: true, message: 'Image downloaded successfully' }
      } else {
        return { success: false, error: response.error }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Batch analyze images
  batchAnalyzeImages: async (imageIds) => {
    const requests = imageIds.map(id => ({
      method: 'POST',
      url: `/images/${id}/analyze`
    }))
    return await api.batch(requests)
  },

  // Batch delete images
  batchDeleteImages: async (imageIds) => {
    const requests = imageIds.map(id => ({
      method: 'DELETE',
      url: `/images/${id}`
    }))
    return await api.batch(requests)
  },

  // Get filtered images
  getFilteredImages: async (filters = {}, pagination = {}) => {
    const { page = 1, limit = 20 } = pagination
    const offset = (page - 1) * limit
    
    const params = new URLSearchParams()
    params.append('limit', limit)
    params.append('offset', offset)
    
    // Add filter parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value)
      }
    })
    
    const queryString = params.toString()
    const url = `/images/filtered${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  },

  // Get traffic analysis data
  getTrafficAnalysis: async (options = {}) => {
    const { timeRange = '24h', cameraId = null, vehicleType = null } = options
    const params = new URLSearchParams()
    
    if (timeRange) params.append('time_range', timeRange)
    if (cameraId) params.append('camera_id', cameraId)
    if (vehicleType) params.append('vehicle_type', vehicleType)
    
    const queryString = params.toString()
    const url = `/vehicle-detection/stats${queryString ? `?${queryString}` : ''}`
    
    return await api.get(url)
  }
}

export default imageService
