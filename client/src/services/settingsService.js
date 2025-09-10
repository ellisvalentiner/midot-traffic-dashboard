import api from './api'

const settingsService = {
  // Get application settings
  getSettings: async () => {
    return await api.get('/settings')
  },

  // Update application settings
  updateSettings: async (settings) => {
    return await api.patch('/settings', settings)
  },

  // Get camera settings
  getCameraSettings: async (cameraId) => {
    return await api.get(`/cameras/${cameraId}/settings`)
  },

  // Update camera settings
  updateCameraSettings: async (cameraId, settings) => {
    return await api.patch(`/cameras/${cameraId}/settings`, settings)
  },

  // Get AI analysis settings
  getAIAnalysisSettings: async () => {
    return await api.get('/settings/ai-analysis')
  },

  // Update AI analysis settings
  updateAIAnalysisSettings: async (settings) => {
    return await api.patch('/settings/ai-analysis', settings)
  },

  // Get notification settings
  getNotificationSettings: async () => {
    return await api.get('/settings/notifications')
  },

  // Update notification settings
  updateNotificationSettings: async (settings) => {
    return await api.patch('/settings/notifications', settings)
  },

  // Get storage settings
  getStorageSettings: async () => {
    return await api.get('/settings/storage')
  },

  // Update storage settings
  updateStorageSettings: async (settings) => {
    return await api.patch('/settings/storage', settings)
  },

  // Get system information
  getSystemInfo: async () => {
    return await api.get('/settings/system-info')
  },

  // Get performance settings
  getPerformanceSettings: async () => {
    return await api.get('/settings/performance')
  },

  // Update performance settings
  updatePerformanceSettings: async (settings) => {
    return await api.patch('/settings/performance', settings)
  },

  // Reset settings to defaults
  resetSettings: async (category = null) => {
    const url = category ? `/settings/reset?category=${category}` : '/settings/reset'
    return await api.post(url)
  },

  // Export settings
  exportSettings: async (format = 'json') => {
    try {
      const response = await api.get(`/settings/export?format=${format}`, {
        responseType: format === 'json' ? 'json' : 'blob'
      })
      
      if (response.success) {
        if (format === 'json') {
          // Create and download JSON file
          const dataStr = JSON.stringify(response.data, null, 2)
          const dataBlob = new Blob([dataStr], { type: 'application/json' })
          const url = window.URL.createObjectURL(dataBlob)
          const link = document.createElement('a')
          link.href = url
          link.download = `settings-${Date.now()}.json`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        } else {
          // Handle other formats (CSV, etc.)
          const url = window.URL.createObjectURL(response.data)
          const link = document.createElement('a')
          link.href = url
          link.download = `settings-${Date.now()}.${format}`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        }
        
        return { success: true, message: 'Settings exported successfully' }
      } else {
        return { success: false, error: response.error }
      }
    } catch (error) {
      return { success: false, error: error.message }
    }
  },

  // Import settings
  importSettings: async (file, onProgress = null) => {
    return await api.upload('/settings/import', file, onProgress)
  },

  // Validate settings
  validateSettings: async (settings) => {
    return await api.post('/settings/validate', settings)
  },

  // Get available setting categories
  getSettingCategories: async () => {
    return await api.get('/settings/categories')
  },

  // Get setting schema
  getSettingSchema: async (category = null) => {
    const url = category ? `/settings/schema?category=${category}` : '/settings/schema'
    return await api.get(url)
  }
}

export default settingsService
